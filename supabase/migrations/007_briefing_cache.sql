CREATE TABLE briefing_cache (
    id text PRIMARY KEY DEFAULT 'latest',
    data jsonb NOT NULL,
    generated_at timestamptz NOT NULL DEFAULT now()
);
