CREATE TABLE IF NOT EXISTS ner_analyses (
    request_id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    record JSONB NOT NULL,
    CONSTRAINT record_is_object CHECK (jsonb_typeof(record) = 'object')
);
CREATE INDEX IF NOT EXISTS ner_analyses_created ON ner_analyses (created_at DESC, request_id DESC);
