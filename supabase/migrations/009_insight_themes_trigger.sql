-- Safety migration: ensure the insight_count trigger exists on insight_themes
-- and reconcile any stale counts from before the trigger was active.

-- Re-create the trigger function (idempotent via CREATE OR REPLACE)
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

-- Re-create the trigger (drop first to ensure it's correct)
DROP TRIGGER IF EXISTS maintain_theme_insight_count ON insight_themes;
CREATE TRIGGER maintain_theme_insight_count
    AFTER INSERT OR DELETE ON insight_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_theme_insight_count();

-- Reconcile: set insight_count to actual count from join table
UPDATE themes
SET insight_count = (
    SELECT COUNT(*)
    FROM insight_themes
    WHERE insight_themes.theme_id = themes.id
);
