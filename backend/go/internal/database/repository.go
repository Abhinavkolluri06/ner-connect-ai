package database

import (
	"context"
	"github.com/ner-connect-ai/backend-go/internal/models"
	"sync"
)

type Repository interface {
	Save(context.Context, models.AnalysisRecord) error
	Healthy(context.Context) bool
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
