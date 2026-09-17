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
	_, err = r.pool.Exec(ctx, "INSERT INTO ner_analyses (request_id,owner_user_id,created_at,record) VALUES ($1,$2,$3,$4)", v.RequestID, v.OwnerUserID, v.CreatedAt, b)
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

func (r *PostgresRepository) GetUser(ctx context.Context, userID, id string) (models.AnalysisRecord, error) {
	rec, err := r.Get(ctx, id)
	if err != nil {
		return rec, err
	}
	if rec.OwnerUserID != "" && userID != "" && rec.OwnerUserID != userID && userID != "service-admin" {
		return models.AnalysisRecord{}, ErrUnauthorized
	}
	return rec, nil
}

func (r *PostgresRepository) List(ctx context.Context, limit, offset int) ([]models.AnalysisRecord, error) {
	return r.ListUser(ctx, "service-admin", limit, offset)
}

func (r *PostgresRepository) ListUser(ctx context.Context, userID string, limit, offset int) ([]models.AnalysisRecord, error) {
	query := "SELECT record FROM ner_analyses ORDER BY created_at DESC,request_id DESC LIMIT $1 OFFSET $2"
	args := []any{limit, offset}
	if userID != "service-admin" {
		query = "SELECT record FROM ner_analyses WHERE owner_user_id=$1 OR owner_user_id='' ORDER BY created_at DESC,request_id DESC LIMIT $2 OFFSET $3"
		args = []any{userID, limit, offset}
	}
	rows, err := r.pool.Query(ctx, query, args...)
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

func (r *PostgresRepository) DeleteUser(ctx context.Context, userID, requestID string) error {
	var owner string
	err := r.pool.QueryRow(ctx, "SELECT owner_user_id FROM ner_analyses WHERE request_id=$1", requestID).Scan(&owner)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if owner != "" && userID != "" && owner != userID && userID != "service-admin" {
		return ErrUnauthorized
	}
	_, err = r.pool.Exec(ctx, "DELETE FROM ner_analyses WHERE request_id=$1", requestID)
	return err
}

func (r *PostgresRepository) SaveBookmark(ctx context.Context, b models.Bookmark) error {
	bytes, err := json.Marshal(b)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, "INSERT INTO ner_bookmarks (bookmark_id,owner_user_id,saved_at,record) VALUES ($1,$2,$3,$4) ON CONFLICT (bookmark_id) DO UPDATE SET saved_at=$3, record=$4", b.BookmarkID, b.OwnerUserID, b.SavedAt, bytes)
	return err
}

func (r *PostgresRepository) GetBookmark(ctx context.Context, userID, bookmarkID string) (models.Bookmark, error) {
	var b models.Bookmark
	var raw []byte
	var owner string
	err := r.pool.QueryRow(ctx, "SELECT owner_user_id, record FROM ner_bookmarks WHERE bookmark_id=$1", bookmarkID).Scan(&owner, &raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return b, ErrNotFound
	}
	if err != nil {
		return b, err
	}
	if owner != "" && userID != "" && owner != userID && userID != "service-admin" {
		return b, ErrUnauthorized
	}
	err = json.Unmarshal(raw, &b)
	return b, err
}

func (r *PostgresRepository) ListBookmarks(ctx context.Context, userID string, limit, offset int) ([]models.Bookmark, error) {
	query := "SELECT record FROM ner_bookmarks ORDER BY saved_at DESC LIMIT $1 OFFSET $2"
	args := []any{limit, offset}
	if userID != "service-admin" {
		query = "SELECT record FROM ner_bookmarks WHERE owner_user_id=$1 OR owner_user_id='' ORDER BY saved_at DESC LIMIT $2 OFFSET $3"
		args = []any{userID, limit, offset}
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Bookmark{}
	for rows.Next() {
		var raw []byte
		var b models.Bookmark
		if err = rows.Scan(&raw); err != nil {
			return nil, err
		}
		if err = json.Unmarshal(raw, &b); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

func (r *PostgresRepository) DeleteBookmark(ctx context.Context, userID, bookmarkID string) error {
	var owner string
	err := r.pool.QueryRow(ctx, "SELECT owner_user_id FROM ner_bookmarks WHERE bookmark_id=$1", bookmarkID).Scan(&owner)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if owner != "" && userID != "" && owner != userID && userID != "service-admin" {
		return ErrUnauthorized
	}
	_, err = r.pool.Exec(ctx, "DELETE FROM ner_bookmarks WHERE bookmark_id=$1", bookmarkID)
	return err
}
