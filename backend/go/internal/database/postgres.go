package database

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ner-connect-ai/backend-go/internal/models"
)

//go:embed migrations/001_analyses.sql
var schema string

type PostgresRepository struct{ pool *pgxpool.Pool }

func OpenPostgres(ctx context.Context, url string) (*PostgresRepository, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10
	cfg.MinConns = 0
	cfg.MaxConnIdleTime = 5 * time.Minute
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err = pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	// Serialize idempotent migration startup across replicas.
	tx, err := pool.Begin(ctx)
	if err != nil {
		pool.Close()
		return nil, err
	}
	defer tx.Rollback(context.Background())
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(734201)"); err == nil {
		_, err = tx.Exec(ctx, schema)
	}
	if err == nil {
		err = tx.Commit(ctx)
	}
	if err != nil {
		pool.Close()
		return nil, err
	}
	return &PostgresRepository{pool: pool}, nil
}
func (r *PostgresRepository) Close() error                     { r.pool.Close(); return nil }
func (r *PostgresRepository) Healthy(ctx context.Context) bool { return r.pool.Ping(ctx) == nil }
func (r *PostgresRepository) Save(ctx context.Context, v models.AnalysisRecord) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, "INSERT INTO ner_analyses (request_id,created_at,record) VALUES ($1,$2,$3)", v.RequestID, v.CreatedAt, b)
	var pgerr *pgconn.PgError
	if errors.As(err, &pgerr) && pgerr.Code == "23505" {
		return ErrDuplicate
	}
	return err
}
func (r *PostgresRepository) Get(ctx context.Context, id string) (models.AnalysisRecord, error) {
	var v models.AnalysisRecord
	var b []byte
	err := r.pool.QueryRow(ctx, "SELECT record FROM ner_analyses WHERE request_id=$1", id).Scan(&b)
	if errors.Is(err, pgx.ErrNoRows) {
		return v, ErrNotFound
	}
	if err != nil {
		return v, err
	}
	err = json.Unmarshal(b, &v)
	return v, err
}
func (r *PostgresRepository) List(ctx context.Context, limit, offset int) ([]models.AnalysisRecord, error) {
	rows, err := r.pool.Query(ctx, "SELECT record FROM ner_analyses ORDER BY created_at DESC,request_id DESC LIMIT $1 OFFSET $2", limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.AnalysisRecord{}
	for rows.Next() {
		var b []byte
		var v models.AnalysisRecord
		if err = rows.Scan(&b); err != nil {
			return nil, err
		}
		if err = json.Unmarshal(b, &v); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
