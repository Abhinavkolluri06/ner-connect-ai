CREATE TABLE IF NOT EXISTS ner_analyses (
    request_id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL,
    record JSONB NOT NULL,
    CONSTRAINT record_is_object CHECK (jsonb_typeof(record) = 'object')
);
CREATE INDEX IF NOT EXISTS ner_analyses_created ON ner_analyses (created_at DESC, request_id DESC);
CREATE INDEX IF NOT EXISTS ner_analyses_user ON ner_analyses (owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ner_bookmarks (
    bookmark_id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL DEFAULT '',
    saved_at TIMESTAMPTZ NOT NULL,
    record JSONB NOT NULL,
    CONSTRAINT bookmark_record_is_object CHECK (jsonb_typeof(record) = 'object')
);
CREATE INDEX IF NOT EXISTS ner_bookmarks_user ON ner_bookmarks (owner_user_id, saved_at DESC);

