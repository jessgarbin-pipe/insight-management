CREATE TABLE insights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    source text NOT NULL DEFAULT 'manual',
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'related', 'closed', 'archived')),
    priority_score numeric
        CHECK (priority_score >= 0 AND priority_score <= 100),
    sentiment text
        CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    urgency text
        CHECK (urgency IN ('high', 'medium', 'low')),
    type text
        CHECK (type IN ('bug', 'feature_request', 'praise', 'question')),
    embedding vector(1024),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_insights_updated_at
    BEFORE UPDATE ON insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_insights_status ON insights (status);
CREATE INDEX idx_insights_created_at ON insights (created_at DESC);
CREATE INDEX idx_insights_priority_score ON insights (priority_score DESC NULLS LAST);
CREATE INDEX idx_insights_source ON insights (source);
