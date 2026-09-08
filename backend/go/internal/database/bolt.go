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
		_, e := tx.CreateBucketIfNotExists(orderBucket)
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
func (r *BoltRepository) List(ctx context.Context, limit, offset int) ([]models.AnalysisRecord, error) {
	out := []models.AnalysisRecord{}
	err := r.db.View(func(tx *bolt.Tx) error {
		c := tx.Bucket(orderBucket).Cursor()
		skipped := 0
		for k, id := c.Last(); k != nil && len(out) < limit; k, id = c.Prev() {
			if err := ctx.Err(); err != nil {
				return err
			}
			if skipped < offset {
				skipped++
				continue
			}
			var v models.AnalysisRecord
			if err := json.Unmarshal(tx.Bucket(recordsBucket).Get(id), &v); err != nil {
				return err
			}
			out = append(out, v)
		}
		return nil
	})
	return out, err
}
