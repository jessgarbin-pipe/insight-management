-- Add user_id to insights (nullable for backward compatibility)
ALTER TABLE insights ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX idx_insights_user_id ON insights (user_id);

-- Add user_id to manager_actions (nullable for backward compatibility)
ALTER TABLE manager_actions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX idx_manager_actions_user_id ON manager_actions (user_id);

-- Enable Row Level Security
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for insights
CREATE POLICY "Users can view their own insights"
    ON insights FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own insights"
    ON insights FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own insights"
    ON insights FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own insights"
    ON insights FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS policies for manager_actions
CREATE POLICY "Users can view their own actions"
    ON manager_actions FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own actions"
    ON manager_actions FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS policies for themes (allow all authenticated users for now)
CREATE POLICY "Authenticated users can view themes"
    ON themes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage themes"
    ON themes FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS policies for opportunities (allow all authenticated users)
CREATE POLICY "Authenticated users can view opportunities"
    ON opportunities FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage opportunities"
    ON opportunities FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS policies for insight_themes (allow all authenticated users)
CREATE POLICY "Authenticated users can view insight_themes"
    ON insight_themes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage insight_themes"
    ON insight_themes FOR ALL
    USING (auth.role() = 'authenticated');

-- RLS policies for briefing_cache (allow all authenticated users)
CREATE POLICY "Authenticated users can view briefing_cache"
    ON briefing_cache FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage briefing_cache"
    ON briefing_cache FOR ALL
    USING (auth.role() = 'authenticated');

-- Allow service role to bypass RLS (it does by default, but be explicit)
-- Service role key automatically bypasses RLS in Supabase
