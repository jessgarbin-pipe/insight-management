-- RPC function for vector similarity search
-- Used by Layer 1 (duplicate detection) and Layer 3 (Ask the System)
CREATE OR REPLACE FUNCTION match_insights(
  query_embedding vector(1024),
  match_threshold float,
  match_count int,
  exclude_id uuid DEFAULT NULL
) RETURNS TABLE (id uuid, similarity float) AS $$
  SELECT insights.id, 1 - (embedding <=> query_embedding) as similarity
  FROM insights
  WHERE embedding IS NOT NULL
    AND (exclude_id IS NULL OR insights.id != exclude_id)
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;
