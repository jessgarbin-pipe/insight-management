CREATE TABLE manager_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type text NOT NULL
        CHECK (action_type IN ('dismiss', 'accept', 'status_change', 'rice_override')),
    insight_id uuid REFERENCES insights(id) ON DELETE SET NULL,
    theme_id uuid REFERENCES themes(id) ON DELETE SET NULL,
    details jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_manager_actions_created_at ON manager_actions (created_at DESC);
CREATE INDEX idx_manager_actions_action_type ON manager_actions (action_type);
