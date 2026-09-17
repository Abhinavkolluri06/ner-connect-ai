package database

import (
	"context"
	"errors"
	"sync"

	"github.com/ner-connect-ai/backend-go/internal/models"
)

type Repository interface {
	Save(context.Context, models.AnalysisRecord) error
	Healthy(context.Context) bool
}

var ErrNotFound = errors.New("record not found")
var ErrDuplicate = errors.New("record already exists")
var ErrUnauthorized = errors.New("unauthorized to access this record")

type HistoryRepository interface {
	Repository
	Get(context.Context, string) (models.AnalysisRecord, error)
	GetUser(ctx context.Context, userID, requestID string) (models.AnalysisRecord, error)
	List(context.Context, int, int) ([]models.AnalysisRecord, error)
	ListUser(ctx context.Context, userID string, limit, offset int) ([]models.AnalysisRecord, error)
	DeleteUser(ctx context.Context, userID, requestID string) error
}

type BookmarkRepository interface {
	SaveBookmark(ctx context.Context, b models.Bookmark) error
	GetBookmark(ctx context.Context, userID, bookmarkID string) (models.Bookmark, error)
	ListBookmarks(ctx context.Context, userID string, limit, offset int) ([]models.Bookmark, error)
	DeleteBookmark(ctx context.Context, userID, bookmarkID string) error
}

type InMemoryRepository struct {
	mu        sync.RWMutex
	records   []models.AnalysisRecord
	bookmarks []models.Bookmark
}

func NewInMemoryRepository() *InMemoryRepository {
	return &InMemoryRepository{
		records:   []models.AnalysisRecord{},
		bookmarks: []models.Bookmark{},
	}
}

func (r *InMemoryRepository) Save(_ context.Context, v models.AnalysisRecord) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, rec := range r.records {
		if rec.RequestID == v.RequestID {
			return ErrDuplicate
		}
	}
	r.records = append(r.records, v)
	return nil
}

func (r *InMemoryRepository) Healthy(context.Context) bool { return true }
func (r *InMemoryRepository) Count() int                   { r.mu.RLock(); defer r.mu.RUnlock(); return len(r.records) }

func (r *InMemoryRepository) Get(ctx context.Context, id string) (models.AnalysisRecord, error) {
	if err := ctx.Err(); err != nil {
		return models.AnalysisRecord{}, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, v := range r.records {
		if v.RequestID == id {
			return v, nil
		}
	}
	return models.AnalysisRecord{}, ErrNotFound
}

func (r *InMemoryRepository) GetUser(ctx context.Context, userID, id string) (models.AnalysisRecord, error) {
	rec, err := r.Get(ctx, id)
	if err != nil {
		return rec, err
	}
	if rec.OwnerUserID != "" && userID != "" && rec.OwnerUserID != userID && userID != "service-admin" {
		return models.AnalysisRecord{}, ErrUnauthorized
	}
	return rec, nil
}

func (r *InMemoryRepository) List(ctx context.Context, limit, offset int) ([]models.AnalysisRecord, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := []models.AnalysisRecord{}
	for i := len(r.records) - 1 - offset; i >= 0 && len(out) < limit; i-- {
		out = append(out, r.records[i])
	}
	return out, nil
}

func (r *InMemoryRepository) ListUser(ctx context.Context, userID string, limit, offset int) ([]models.AnalysisRecord, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	matching := []models.AnalysisRecord{}
	for i := len(r.records) - 1; i >= 0; i-- {
		rec := r.records[i]
		if userID == "service-admin" || rec.OwnerUserID == "" || rec.OwnerUserID == userID {
			matching = append(matching, rec)
		}
	}
	out := []models.AnalysisRecord{}
	for i := offset; i < len(matching) && len(out) < limit; i++ {
		out = append(out, matching[i])
	}
	return out, nil
}

func (r *InMemoryRepository) DeleteUser(ctx context.Context, userID, requestID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, rec := range r.records {
		if rec.RequestID == requestID {
			if rec.OwnerUserID != "" && userID != "" && rec.OwnerUserID != userID && userID != "service-admin" {
				return ErrUnauthorized
			}
			r.records = append(r.records[:i], r.records[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func (r *InMemoryRepository) SaveBookmark(ctx context.Context, b models.Bookmark) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, existing := range r.bookmarks {
		if existing.BookmarkID == b.BookmarkID {
			r.bookmarks[i] = b
			return nil
		}
	}
	r.bookmarks = append(r.bookmarks, b)
	return nil
}

func (r *InMemoryRepository) GetBookmark(ctx context.Context, userID, bookmarkID string) (models.Bookmark, error) {
	if err := ctx.Err(); err != nil {
		return models.Bookmark{}, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, b := range r.bookmarks {
		if b.BookmarkID == bookmarkID {
			if b.OwnerUserID != "" && userID != "" && b.OwnerUserID != userID && userID != "service-admin" {
				return models.Bookmark{}, ErrUnauthorized
			}
			return b, nil
		}
	}
	return models.Bookmark{}, ErrNotFound
}

func (r *InMemoryRepository) ListBookmarks(ctx context.Context, userID string, limit, offset int) ([]models.Bookmark, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	matching := []models.Bookmark{}
	for i := len(r.bookmarks) - 1; i >= 0; i-- {
		b := r.bookmarks[i]
		if userID == "service-admin" || b.OwnerUserID == "" || b.OwnerUserID == userID {
			matching = append(matching, b)
		}
	}
	out := []models.Bookmark{}
	for i := offset; i < len(matching) && len(out) < limit; i++ {
		out = append(out, matching[i])
	}
	return out, nil
}

func (r *InMemoryRepository) DeleteBookmark(ctx context.Context, userID, bookmarkID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, b := range r.bookmarks {
		if b.BookmarkID == bookmarkID {
			if b.OwnerUserID != "" && userID != "" && b.OwnerUserID != userID && userID != "service-admin" {
				return ErrUnauthorized
			}
			r.bookmarks = append(r.bookmarks[:i], r.bookmarks[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}
