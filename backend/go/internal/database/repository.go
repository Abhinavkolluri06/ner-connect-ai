package database

import (
	"context"
	"errors"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"sync"
)

type Repository interface {
	Save(context.Context, models.AnalysisRecord) error
	Healthy(context.Context) bool
}

var ErrNotFound = errors.New("analysis not found")
var ErrDuplicate = errors.New("request ID already exists")

type HistoryRepository interface {
	Repository
	Get(context.Context, string) (models.AnalysisRecord, error)
	List(context.Context, int, int) ([]models.AnalysisRecord, error)
}

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

type InMemoryRepository struct {
	mu      sync.RWMutex
	records []models.AnalysisRecord
}

func NewInMemoryRepository() *InMemoryRepository { return &InMemoryRepository{} }
func (r *InMemoryRepository) Save(_ context.Context, v models.AnalysisRecord) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.records = append(r.records, v)
	return nil
}
func (r *InMemoryRepository) Healthy(context.Context) bool { return true }
func (r *InMemoryRepository) Count() int                   { r.mu.RLock(); defer r.mu.RUnlock(); return len(r.records) }
