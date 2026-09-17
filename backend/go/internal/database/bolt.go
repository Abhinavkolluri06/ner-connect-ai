package database

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/ner-connect-ai/backend-go/internal/models"
	bolt "go.etcd.io/bbolt"
)

// BoltRepository is a transactional on-disk store for a single server instance.
// Opening the same file concurrently fails instead of silently losing writes.
type BoltRepository struct{ db *bolt.DB }

var recordsBucket = []byte("analyses_v1")
var orderBucket = []byte("analyses_created_v1")
var bookmarksBucket = []byte("bookmarks_v1")

func OpenBolt(path string) (*BoltRepository, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return nil, err
	}
	db, err := bolt.Open(path, 0600, &bolt.Options{Timeout: time.Second})
	if err != nil {
		return nil, fmt.Errorf("open history database: %w", err)
	}
	err = db.Update(func(tx *bolt.Tx) error {
		if _, e := tx.CreateBucketIfNotExists(recordsBucket); e != nil {
			return e
		}
		if _, e := tx.CreateBucketIfNotExists(orderBucket); e != nil {
			return e
		}
		_, e := tx.CreateBucketIfNotExists(bookmarksBucket)
		return e
	})
	if err != nil {
		db.Close()
		return nil, err
	}
	return &BoltRepository{db: db}, nil
}
func (r *BoltRepository) Close() error { return r.db.Close() }
func (r *BoltRepository) Healthy(ctx context.Context) bool {
	return ctx.Err() == nil && r.db.View(func(tx *bolt.Tx) error {
		if tx.Bucket(recordsBucket) == nil {
			return ErrNotFound
		}
		return nil
	}) == nil
}
func (r *BoltRepository) Save(ctx context.Context, v models.AnalysisRecord) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return r.db.Update(func(tx *bolt.Tx) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		bucket := tx.Bucket(recordsBucket)
		if bucket.Get([]byte(v.RequestID)) != nil {
			return ErrDuplicate
		}
		if err := bucket.Put([]byte(v.RequestID), b); err != nil {
			return err
		}
		key := v.CreatedAt.UTC().Format("20060102T150405.000000000") + "/" + v.RequestID
		return tx.Bucket(orderBucket).Put([]byte(key), []byte(v.RequestID))
	})
}
func (r *BoltRepository) Get(ctx context.Context, id string) (models.AnalysisRecord, error) {
	var v models.AnalysisRecord
	if err := ctx.Err(); err != nil {
		return v, err
	}
	err := r.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(recordsBucket).Get([]byte(id))
		if b == nil {
			return ErrNotFound
		}
		return json.Unmarshal(b, &v)
	})
	return v, err
}

func (r *BoltRepository) GetUser(ctx context.Context, userID, id string) (models.AnalysisRecord, error) {
	rec, err := r.Get(ctx, id)
	if err != nil {
		return rec, err
	}
	if rec.OwnerUserID != "" && userID != "" && rec.OwnerUserID != userID && userID != "service-admin" {
		return models.AnalysisRecord{}, ErrUnauthorized
	}
	return rec, nil
}

func (r *BoltRepository) List(ctx context.Context, limit, offset int) ([]models.AnalysisRecord, error) {
	return r.ListUser(ctx, "service-admin", limit, offset)
}

func (r *BoltRepository) ListUser(ctx context.Context, userID string, limit, offset int) ([]models.AnalysisRecord, error) {
	out := []models.AnalysisRecord{}
	err := r.db.View(func(tx *bolt.Tx) error {
		c := tx.Bucket(orderBucket).Cursor()
		skipped := 0
		for k, id := c.Last(); k != nil && len(out) < limit; k, id = c.Prev() {
			if err := ctx.Err(); err != nil {
				return err
			}
			var v models.AnalysisRecord
			raw := tx.Bucket(recordsBucket).Get(id)
			if raw == nil {
				continue
			}
			if err := json.Unmarshal(raw, &v); err != nil {
				return err
			}
			if userID != "service-admin" && v.OwnerUserID != "" && v.OwnerUserID != userID {
				continue
			}
			if skipped < offset {
				skipped++
				continue
			}
			out = append(out, v)
		}
		return nil
	})
	return out, err
}

func (r *BoltRepository) DeleteUser(ctx context.Context, userID, requestID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	return r.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(recordsBucket)
		raw := b.Get([]byte(requestID))
		if raw == nil {
			return ErrNotFound
		}
		var rec models.AnalysisRecord
		if err := json.Unmarshal(raw, &rec); err == nil {
			if rec.OwnerUserID != "" && userID != "" && rec.OwnerUserID != userID && userID != "service-admin" {
				return ErrUnauthorized
			}
			key := rec.CreatedAt.UTC().Format("20060102T150405.000000000") + "/" + rec.RequestID
			_ = tx.Bucket(orderBucket).Delete([]byte(key))
		}
		return b.Delete([]byte(requestID))
	})
}

func (r *BoltRepository) PruneOlderThan(ctx context.Context, cutoff time.Time) (int, error) {
	if err := ctx.Err(); err != nil {
		return 0, err
	}
	pruned := 0
	err := r.db.Update(func(tx *bolt.Tx) error {
		orderB := tx.Bucket(orderBucket)
		recordsB := tx.Bucket(recordsBucket)
		c := orderB.Cursor()
		var keysToDelete [][]byte
		var recordIDs [][]byte
		for k, id := c.First(); k != nil; k, id = c.Next() {
			if err := ctx.Err(); err != nil {
				return err
			}
			raw := recordsB.Get(id)
			if raw == nil {
				keysToDelete = append(keysToDelete, append([]byte(nil), k...))
				continue
			}
			var rec models.AnalysisRecord
			if err := json.Unmarshal(raw, &rec); err != nil {
				continue
			}
			if rec.CreatedAt.Before(cutoff) {
				keysToDelete = append(keysToDelete, append([]byte(nil), k...))
				recordIDs = append(recordIDs, append([]byte(nil), id...))
			}
		}
		for _, k := range keysToDelete {
			_ = orderB.Delete(k)
		}
		for _, id := range recordIDs {
			_ = recordsB.Delete(id)
			pruned++
		}
		return nil
	})
	return pruned, err
}

func (r *BoltRepository) SaveBookmark(ctx context.Context, b models.Bookmark) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	bytes, err := json.Marshal(b)
	if err != nil {
		return err
	}
	return r.db.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket(bookmarksBucket)
		return bucket.Put([]byte(b.BookmarkID), bytes)
	})
}

func (r *BoltRepository) GetBookmark(ctx context.Context, userID, bookmarkID string) (models.Bookmark, error) {
	var b models.Bookmark
	if err := ctx.Err(); err != nil {
		return b, err
	}
	err := r.db.View(func(tx *bolt.Tx) error {
		raw := tx.Bucket(bookmarksBucket).Get([]byte(bookmarkID))
		if raw == nil {
			return ErrNotFound
		}
		if err := json.Unmarshal(raw, &b); err != nil {
			return err
		}
		if b.OwnerUserID != "" && userID != "" && b.OwnerUserID != userID && userID != "service-admin" {
			return ErrUnauthorized
		}
		return nil
	})
	return b, err
}

func (r *BoltRepository) ListBookmarks(ctx context.Context, userID string, limit, offset int) ([]models.Bookmark, error) {
	out := []models.Bookmark{}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	err := r.db.View(func(tx *bolt.Tx) error {
		c := tx.Bucket(bookmarksBucket).Cursor()
		all := []models.Bookmark{}
		for k, v := c.First(); k != nil; k, v = c.Next() {
			var b models.Bookmark
			if err := json.Unmarshal(v, &b); err != nil {
				continue
			}
			if userID == "service-admin" || b.OwnerUserID == "" || b.OwnerUserID == userID {
				all = append(all, b)
			}
		}
		// Sort newest saved first
		for i := len(all) - 1 - offset; i >= 0 && len(out) < limit; i-- {
			out = append(out, all[i])
		}
		return nil
	})
	return out, err
}

func (r *BoltRepository) DeleteBookmark(ctx context.Context, userID, bookmarkID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	return r.db.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket(bookmarksBucket)
		raw := bucket.Get([]byte(bookmarkID))
		if raw == nil {
			return ErrNotFound
		}
		var b models.Bookmark
		if err := json.Unmarshal(raw, &b); err == nil {
			if b.OwnerUserID != "" && userID != "" && b.OwnerUserID != userID && userID != "service-admin" {
				return ErrUnauthorized
			}
		}
		return bucket.Delete([]byte(bookmarkID))
	})
}
