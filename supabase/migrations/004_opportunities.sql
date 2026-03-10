CREATE TABLE opportunities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    estimated_impact text
        CHECK (estimated_impact IN ('high', 'medium', 'low')),
    theme_id uuid REFERENCES themes(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'identified'
        CHECK (status IN ('identified', 'evaluating', 'approved', 'discarded')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Join table
CREATE TABLE insight_opportunities (
    insight_id uuid REFERENCES insights(id) ON DELETE CASCADE,
    opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
    PRIMARY KEY (insight_id, opportunity_id)
);
