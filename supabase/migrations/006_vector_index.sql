-- Note: IVFFlat index is most effective with 100+ rows.
-- For MVP, create it upfront. Performance improves after data load.
CREATE INDEX idx_insights_embedding ON insights
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
