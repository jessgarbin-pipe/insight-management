CREATE TABLE themes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    insight_count integer NOT NULL DEFAULT 0,
    aggregated_score numeric,
    trend text
        CHECK (trend IN ('growing', 'stable', 'declining')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_themes_updated_at
    BEFORE UPDATE ON themes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_themes_aggregated_score ON themes (aggregated_score DESC NULLS LAST);

-- Join table
CREATE TABLE insight_themes (
    insight_id uuid REFERENCES insights(id) ON DELETE CASCADE,
    theme_id uuid REFERENCES themes(id) ON DELETE CASCADE,
    PRIMARY KEY (insight_id, theme_id)
);

-- Trigger to maintain insight_count
CREATE OR REPLACE FUNCTION update_theme_insight_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE themes SET insight_count = insight_count + 1 WHERE id = NEW.theme_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE themes SET insight_count = insight_count - 1 WHERE id = OLD.theme_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_theme_insight_count
    AFTER INSERT OR DELETE ON insight_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_theme_insight_count();
