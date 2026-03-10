-- ============================================================
-- Multi-tenancy: Organizations, Members, Invites
-- ============================================================

-- Organizations table
CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations (slug);

-- Organization members
CREATE TABLE org_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member', 'viewer')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON org_members (org_id);
CREATE INDEX idx_org_members_user_id ON org_members (user_id);

-- Invites table
CREATE TABLE invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member', 'viewer')),
    token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_token ON invites (token);
CREATE INDEX idx_invites_org_id ON invites (org_id);
CREATE INDEX idx_invites_email ON invites (email);

-- ============================================================
-- Add org_id to existing tables (nullable for backward compat)
-- ============================================================

ALTER TABLE insights ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX idx_insights_org_id ON insights (org_id);

ALTER TABLE themes ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX idx_themes_org_id ON themes (org_id);

ALTER TABLE opportunities ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX idx_opportunities_org_id ON opportunities (org_id);

ALTER TABLE manager_actions ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX idx_manager_actions_org_id ON manager_actions (org_id);

ALTER TABLE briefing_cache ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX idx_briefing_cache_org_id ON briefing_cache (org_id);

-- ============================================================
-- RLS on new tables
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Users can view orgs they belong to
CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    USING (
        id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );

-- Users can view members of their orgs
CREATE POLICY "Users can view org members"
    ON org_members FOR SELECT
    USING (
        org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );

-- Admins can manage members
CREATE POLICY "Admins can manage org members"
    ON org_members FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view invites for their orgs (admins only)
CREATE POLICY "Admins can view invites"
    ON invites FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage invites"
    ON invites FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================
-- Update RLS on existing tables to scope by org
-- ============================================================

-- Drop existing policies that will be replaced
DROP POLICY IF EXISTS "Users can view their own insights" ON insights;
DROP POLICY IF EXISTS "Users can insert their own insights" ON insights;
DROP POLICY IF EXISTS "Users can update their own insights" ON insights;
DROP POLICY IF EXISTS "Users can delete their own insights" ON insights;

CREATE POLICY "Users can view org insights"
    ON insights FOR SELECT
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can insert org insights"
    ON insights FOR INSERT
    WITH CHECK (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update org insights"
    ON insights FOR UPDATE
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can delete org insights"
    ON insights FOR DELETE
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()
    );

-- Manager actions
DROP POLICY IF EXISTS "Users can view their own actions" ON manager_actions;
DROP POLICY IF EXISTS "Users can insert their own actions" ON manager_actions;

CREATE POLICY "Users can view org actions"
    ON manager_actions FOR SELECT
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can insert org actions"
    ON manager_actions FOR INSERT
    WITH CHECK (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );

-- Themes
DROP POLICY IF EXISTS "Authenticated users can view themes" ON themes;
DROP POLICY IF EXISTS "Authenticated users can manage themes" ON themes;

CREATE POLICY "Users can view org themes"
    ON themes FOR SELECT
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage org themes"
    ON themes FOR ALL
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );

-- Opportunities
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON opportunities;
DROP POLICY IF EXISTS "Authenticated users can manage opportunities" ON opportunities;

CREATE POLICY "Users can view org opportunities"
    ON opportunities FOR SELECT
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage org opportunities"
    ON opportunities FOR ALL
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );

-- Briefing cache
DROP POLICY IF EXISTS "Authenticated users can view briefing_cache" ON briefing_cache;
DROP POLICY IF EXISTS "Authenticated users can manage briefing_cache" ON briefing_cache;

CREATE POLICY "Users can view org briefing_cache"
    ON briefing_cache FOR SELECT
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage org briefing_cache"
    ON briefing_cache FOR ALL
    USING (
        org_id IS NULL
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    );
