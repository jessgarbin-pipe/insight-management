# Insight Management SaaS - MVP Implementation Plan

**Date:** 2026-03-10
**Based on:** Design Specification v1.1 (reviewed)
**Approach:** Phased delivery, each phase builds on the previous one

---

## Phase 1: Project Scaffolding

**Goal:** Bootable Next.js app deployed to Vercel with Supabase connected and Tailwind configured.

### Step 1.1: Initialize Next.js Project

**Complexity:** Simple
**Files created:**
- All standard Next.js scaffolding files

**Actions:**
```bash
npx create-next-app@latest insight-management \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**Acceptance criteria:**
- `npm run dev` starts the app on `localhost:3000`.
- App Router is the only routing mechanism (no `pages/` directory).
- TypeScript strict mode is enabled.

### Step 1.2: Project Directory Structure

**Complexity:** Simple
**Files/directories created:**
```
src/
  app/
    layout.tsx                  # Root layout with global styles, fonts
    page.tsx                    # Briefing main screen (/)
    globals.css                 # Tailwind directives + custom CSS
    explorer/
      themes/
        page.tsx                # /explorer/themes
        [id]/
          page.tsx              # /explorer/themes/:id
      opportunities/
        page.tsx                # /explorer/opportunities
        [id]/
          page.tsx              # /explorer/opportunities/:id
      insights/
        page.tsx                # /explorer/insights
        [id]/
          page.tsx              # /explorer/insights/:id
    ask/
      page.tsx                  # /ask
    ingest/
      page.tsx                  # /ingest
    api/
      insights/
        route.ts                # GET (list), POST (create)
        [id]/
          route.ts              # GET, PATCH, DELETE
          reprocess/
            route.ts            # POST reprocess
      themes/
        route.ts                # GET (list)
        [id]/
          route.ts              # GET (detail)
      opportunities/
        route.ts                # GET (list)
        [id]/
          route.ts              # GET, PATCH
      ingest/
        csv/
          preview/
            route.ts            # POST CSV preview
          confirm/
            route.ts            # POST CSV confirm
      briefing/
        route.ts                # POST briefing
      ask/
        route.ts                # POST ask
      process/
        layer2/
          route.ts              # POST Layer 2
  lib/
    supabase/
      client.ts                 # Browser Supabase client (anon key)
      server.ts                 # Server Supabase client (service role key)
    ai/
      claude.ts                 # Claude API wrapper with retry logic
      embeddings.ts             # Embedding generation (Voyage/OpenAI)
      prompts.ts                # All prompt templates
    pipeline/
      layer1.ts                 # Individual insight processing
      layer2.ts                 # Aggregate analysis
      layer3.ts                 # Briefing generation + Ask
    types/
      index.ts                  # Shared TypeScript types/interfaces
    utils/
      pagination.ts             # Pagination helper
      csv.ts                    # CSV parsing utilities
      validation.ts             # Request validation helpers
  components/
    layout/
      Header.tsx                # App header with navigation
      Sidebar.tsx               # Navigation sidebar (if used)
    insights/
      InsightCard.tsx            # Insight display card
      InsightForm.tsx            # Manual insight creation form
      InsightTable.tsx           # Insights list/table
      InsightFilters.tsx         # Filter controls
    themes/
      ThemeCard.tsx              # Theme display card
      TrendIndicator.tsx         # Up/down/stable arrow
    opportunities/
      OpportunityCard.tsx        # Opportunity display card
      StatusDropdown.tsx         # Status selector
    briefing/
      BriefingItem.tsx           # Single briefing action item
      BriefingSummary.tsx        # AI summary display
    ask/
      ChatMessage.tsx            # Chat message bubble
      ChatInput.tsx              # Chat text input
    ingest/
      CsvUploader.tsx            # Drag-and-drop CSV zone
      ColumnMapper.tsx           # Column mapping UI
      CsvPreview.tsx             # Preview table
    shared/
      Badge.tsx                  # Status/impact badges
      Pagination.tsx             # Pagination controls
      EmptyState.tsx             # Empty state messages
      LoadingSpinner.tsx         # Loading indicator
```

**Acceptance criteria:**
- All route files exist (can contain placeholder content).
- Navigation between pages works.
- No `pages/` directory exists.

### Step 1.3: Install Dependencies

**Complexity:** Simple
**File modified:** `package.json`

**Dependencies to install:**
```bash
npm install @supabase/supabase-js @anthropic-ai/sdk papaparse
npm install -D @types/papaparse
```

**Notes:**
- `@supabase/supabase-js` -- Supabase client for database access.
- `@anthropic-ai/sdk` -- Official Anthropic SDK for Claude API calls.
- `papaparse` -- CSV parsing library.
- Tailwind CSS is included via `create-next-app`.

**Acceptance criteria:**
- All packages install without errors.
- No version conflicts.

### Step 1.4: Environment Variables

**Complexity:** Simple
**Files created:**
- `.env.local` (gitignored, actual values)
- `.env.example` (committed, placeholder values)

**`.env.example` contents:**
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
ANTHROPIC_API_KEY=your-anthropic-api-key
EMBEDDING_PROVIDER=voyage
VOYAGE_API_KEY=your-voyage-api-key
# OPENAI_API_KEY=your-openai-api-key  # Alternative to Voyage

# Cron
CRON_SECRET=your-cron-secret
```

**Acceptance criteria:**
- `.env.local` is in `.gitignore`.
- App fails gracefully if environment variables are missing (log error, don't crash).

### Step 1.5: Supabase Client Setup

**Complexity:** Simple
**Files created:**
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

**`src/lib/supabase/client.ts`:**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`src/lib/supabase/server.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

**Dependencies:** Install `@supabase/ssr` for the browser client:
```bash
npm install @supabase/ssr
```

**Acceptance criteria:**
- Server client uses service role key (full access, no RLS).
- Browser client uses anon key.
- Both clients can connect to Supabase.

### Step 1.6: Root Layout and Navigation

**Complexity:** Simple
**Files modified:**
- `src/app/layout.tsx`
- `src/app/globals.css`

**Files created:**
- `src/components/layout/Header.tsx`

**Layout structure:**
- App-wide header with navigation links: Briefing, Explorer (Themes, Opportunities, Insights), Ask, Ingest.
- Content area below the header.
- Tailwind CSS for all styling. No external UI library.

**Acceptance criteria:**
- All navigation links work.
- Active link is visually highlighted.
- Layout is responsive (desktop-first, usable on tablet).

### Step 1.7: Vercel Deployment Configuration

**Complexity:** Simple
**Files created:**
- `vercel.json`

**`vercel.json` contents:**
```json
{
  "crons": [
    {
      "path": "/api/process/layer2",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Acceptance criteria:**
- App deploys to Vercel from the repository.
- Environment variables are configured in Vercel dashboard.
- Cron job is scheduled for midnight UTC daily.

---

## Phase 2: Database Schema

**Goal:** All tables, indexes, constraints, and triggers created in Supabase.

**Dependencies:** Phase 1 (Supabase project must exist).

### Step 2.1: Create Supabase Migration - Extensions and Functions

**Complexity:** Simple
**File created:** `supabase/migrations/001_extensions_and_functions.sql`

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Acceptance criteria:**
- `vector` extension is available.
- Trigger function exists and can be applied to any table.

### Step 2.2: Create Supabase Migration - insights Table

**Complexity:** Medium
**File created:** `supabase/migrations/002_insights.sql`

```sql
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
```

**Note:** The vector index (IVFFlat) is created separately after initial data load (see Step 2.6).

**Acceptance criteria:**
- Table creates without errors.
- CHECK constraints reject invalid values.
- `updated_at` auto-updates on row modification.

### Step 2.3: Create Supabase Migration - themes and insight_themes Tables

**Complexity:** Medium
**File created:** `supabase/migrations/003_themes.sql`

```sql
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
```

**Acceptance criteria:**
- `insight_count` auto-increments/decrements when `insight_themes` rows are added/removed.
- CASCADE deletes work correctly.

### Step 2.4: Create Supabase Migration - opportunities and insight_opportunities Tables

**Complexity:** Medium
**File created:** `supabase/migrations/004_opportunities.sql`

```sql
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
```

**Acceptance criteria:**
- `theme_id` is SET NULL (not CASCADE) when a theme is deleted.
- Status CHECK constraint works.

### Step 2.5: Create Supabase Migration - manager_actions Table

**Complexity:** Simple
**File created:** `supabase/migrations/005_manager_actions.sql`

```sql
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
```

**Acceptance criteria:**
- Actions persist even if the referenced insight/theme is deleted (SET NULL).
- CHECK constraint enforces valid action types.

### Step 2.6: Create Supabase Migration - Vector Index

**Complexity:** Simple
**File created:** `supabase/migrations/006_vector_index.sql`

```sql
-- Note: IVFFlat index is most effective with 100+ rows.
-- For MVP, create it upfront. Performance improves after data load.
CREATE INDEX idx_insights_embedding ON insights
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Acceptance criteria:**
- Cosine similarity queries can use the index.
- `SELECT * FROM insights ORDER BY embedding <=> '[...]' LIMIT 10` works.

### Step 2.7: TypeScript Type Definitions

**Complexity:** Simple
**File created:** `src/lib/types/index.ts`

Define TypeScript interfaces matching all database tables:

```typescript
export interface Insight {
  id: string
  title: string
  description: string
  source: string
  status: 'open' | 'related' | 'closed' | 'archived'
  priority_score: number | null
  sentiment: 'positive' | 'negative' | 'neutral' | null
  urgency: 'high' | 'medium' | 'low' | null
  type: 'bug' | 'feature_request' | 'praise' | 'question' | null
  embedding: number[] | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Theme {
  id: string
  name: string
  description: string | null
  insight_count: number
  aggregated_score: number | null
  trend: 'growing' | 'stable' | 'declining' | null
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  title: string
  description: string | null
  estimated_impact: 'high' | 'medium' | 'low' | null
  theme_id: string | null
  status: 'identified' | 'evaluating' | 'approved' | 'discarded'
  created_at: string
  updated_at: string
}

export interface ManagerAction {
  id: string
  action_type: 'dismiss' | 'accept' | 'status_change' | 'rice_override'
  insight_id: string | null
  theme_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export interface BriefingResponse {
  summary: string
  generated_at: string
  cached: boolean
  items: BriefingItem[]
}

export interface BriefingItem {
  id: string
  description: string
  suggested_action: {
    label: string
    type: 'change_status' | 'create_opportunity' | 'link_to_opportunity' | 'archive_theme' | 'investigate'
    params: Record<string, unknown>
  }
  related_insight_ids: string[]
  priority: number
}
```

**Acceptance criteria:**
- All types match the database schema exactly.
- Types are used consistently across API routes and components.

---

## Phase 3: API Layer

**Goal:** All REST endpoints working with basic CRUD operations, pagination, filtering, and error handling.

**Dependencies:** Phase 2 (tables must exist).

### Step 3.1: Shared Utilities

**Complexity:** Simple
**Files created:**
- `src/lib/utils/pagination.ts`
- `src/lib/utils/validation.ts`

**`pagination.ts`:**
```typescript
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const per_page = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '25')))
  const offset = (page - 1) * per_page
  return { page, per_page, offset }
}

export function paginationMeta(page: number, per_page: number, total: number) {
  return { page, per_page, total, total_pages: Math.ceil(total / per_page) }
}
```

**`validation.ts`:**
- Helper to validate required fields in request bodies.
- Returns structured `{ valid: boolean, errors: string[] }`.

**Acceptance criteria:**
- Pagination defaults to page 1, 25 items.
- `per_page` caps at 100.

### Step 3.2: Insights CRUD Endpoints

**Complexity:** Medium
**Files created/modified:**
- `src/app/api/insights/route.ts` -- `GET` (list with filters, pagination) and `POST` (create)
- `src/app/api/insights/[id]/route.ts` -- `GET`, `PATCH`, `DELETE`

**GET /api/insights query parameters:**
- `page`, `per_page` -- Pagination.
- `status` -- Filter by status (comma-separated for multi-select).
- `source` -- Filter by source.
- `theme_id` -- Filter by theme (joins `insight_themes`).
- `search` -- Case-insensitive search on title and description using `ilike`.
- `sort` -- Sort field, default `priority_score`. Options: `priority_score`, `created_at`, `updated_at`.
- `order` -- `asc` or `desc`, default `desc`.
- `date_from`, `date_to` -- Filter by `created_at` range.

**POST /api/insights:**
- Validate `title` and `description` are present and non-empty strings.
- Set defaults: `source` to `"manual"`, `metadata` to `{}`.
- Insert into database.
- Trigger Layer 1 processing asynchronously (fire-and-forget using `waitUntil` from `next/server` or a detached promise -- do not `await` it in the response path).
- Return 201 with the created insight (AI fields are null).

**PATCH /api/insights/:id:**
- Accept partial updates: `status`, `priority_score`, `metadata`.
- If `status` is changed, log a `status_change` manager action.
- Validate values against allowed enums.
- Return updated insight.

**DELETE /api/insights/:id:**
- Delete the insight. CASCADE handles join table cleanup.
- Return 204 No Content.

**Error handling pattern (apply to all routes):**
```typescript
try {
  // ... logic
} catch (error) {
  console.error('Route error:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

**Acceptance criteria:**
- All CRUD operations work.
- Filters can be combined.
- Invalid filter values are ignored (not errors).
- POST triggers Layer 1 but responds before it completes.

### Step 3.3: Insight Reprocess Endpoint

**Complexity:** Simple
**File created:** `src/app/api/insights/[id]/reprocess/route.ts`

**POST /api/insights/:id/reprocess:**
- Fetch the insight.
- Clear existing AI fields (set to null).
- Re-run Layer 1 pipeline.
- Return 202 Accepted.

**Acceptance criteria:**
- Re-processing overwrites previous AI results.
- Returns immediately; processing happens asynchronously.

### Step 3.4: Themes Endpoints

**Complexity:** Simple
**Files created:**
- `src/app/api/themes/route.ts` -- `GET` (list)
- `src/app/api/themes/[id]/route.ts` -- `GET` (detail with linked insights)

**GET /api/themes:**
- Returns themes with `insight_count > 0`, ordered by `aggregated_score DESC`.
- Pagination support.

**GET /api/themes/:id:**
- Returns theme with linked insights (join through `insight_themes`).
- Insights are paginated.

**Acceptance criteria:**
- Themes with 0 insights are excluded from list.
- Detail view includes linked insights.

### Step 3.5: Opportunities Endpoints

**Complexity:** Simple
**Files created:**
- `src/app/api/opportunities/route.ts` -- `GET` (list)
- `src/app/api/opportunities/[id]/route.ts` -- `GET` (detail), `PATCH` (update status)

**GET /api/opportunities:**
- Ordered by `estimated_impact` (high > medium > low), then by supporting insight count.
- Pagination support.

**GET /api/opportunities/:id:**
- Returns opportunity with linked insights via `insight_opportunities`.

**PATCH /api/opportunities/:id:**
- Accept `status` update.
- Validate against allowed values.

**Acceptance criteria:**
- Impact ordering works correctly (high first).
- Status updates persist.

### Step 3.6: CSV Upload Endpoints

**Complexity:** Complex
**Files created:**
- `src/app/api/ingest/csv/preview/route.ts`
- `src/app/api/ingest/csv/confirm/route.ts`
- `src/lib/utils/csv.ts`

**POST /api/ingest/csv/preview:**
1. Accept `multipart/form-data` with a CSV file.
2. Validate: file exists, is CSV, is under 10MB.
3. Parse with PapaParse.
4. Validate: has headers, has data rows, under 5000 rows.
5. Send column headers + first 3 data rows to Claude for auto-mapping.
6. Return: `{ mapping: { csv_column: insight_field }, preview: first_5_rows, total_rows: N }`.

**POST /api/ingest/csv/confirm:**
1. Accept: `{ file_id, mapping }` (the preview stores the parsed data temporarily in a server-side Map or re-parses the file sent again).
2. For MVP: re-send the CSV file along with the confirmed mapping. Simpler than server-side caching.
3. Process each row: create insight, queue Layer 1.
4. Return: `{ total: N, success: N, failed: N, errors: [{ row: N, reason: "..." }] }`.

**Implementation note:** For MVP, the confirm endpoint re-accepts the file rather than storing it server-side. This avoids needing a temp file system.

**Acceptance criteria:**
- Preview returns within 5 seconds.
- Auto-mapping is reasonable for common column names (e.g., "feedback" maps to description).
- Unmapped columns go to metadata.
- Rows missing title/description after mapping are skipped with reasons.

### Step 3.7: Briefing Endpoint

**Complexity:** Complex
**File created:** `src/app/api/briefing/route.ts`

**POST /api/briefing:**
1. Check cache: query `MAX(updated_at)` across insights, themes, opportunities.
2. If cached briefing exists and `MAX(updated_at)` is before `generated_at`, return cached.
3. Otherwise, gather context: new insights since last briefing, themes with trend changes, new opportunities, unresolved high-priority items, recent manager actions.
4. Send to Claude with briefing generation prompt.
5. Parse structured response into `BriefingResponse`.
6. Cache the result (in-memory or database row -- for MVP, use a dedicated `briefing_cache` entry in a simple key-value approach, or just a module-level variable since Vercel serverless functions are ephemeral -- prefer a database row in a `cache` table or just re-generate each time with a 5-minute TTL check).
7. Return the briefing.

**Implementation note on caching:** For Vercel serverless, in-memory caching does not persist across invocations. Use a simple `briefing_cache` table:
```sql
CREATE TABLE briefing_cache (
    id text PRIMARY KEY DEFAULT 'latest',
    data jsonb NOT NULL,
    generated_at timestamptz NOT NULL DEFAULT now()
);
```
Add this to the migrations (new file `supabase/migrations/007_briefing_cache.sql`).

**Acceptance criteria:**
- Briefing loads within 10 seconds.
- Cached briefing returns instantly.
- Each briefing item has a valid `suggested_action.type`.
- Empty state (0 insights) returns onboarding message.

### Step 3.8: Ask Endpoint

**Complexity:** Medium
**File created:** `src/app/api/ask/route.ts`

**POST /api/ask:**
1. Accept `{ question: string }`.
2. Generate embedding for the question using the same embedding provider.
3. Query top 20 insights by cosine similarity.
4. Filter to similarity > 0.7.
5. Send question + retrieved insight texts to Claude.
6. Return `{ answer: string, referenced_insights: Insight[] }`.

**Acceptance criteria:**
- Responses cite specific insights by title.
- No relevant data returns a clear message.
- Response within 10 seconds.

### Step 3.9: Layer 2 Trigger Endpoint

**Complexity:** Simple
**File created:** `src/app/api/process/layer2/route.ts`

**POST /api/process/layer2:**
1. Verify `CRON_SECRET` header (or bearer token).
2. Run Layer 2 pipeline (see Phase 4).
3. Return 200 with summary of what was processed.

**Acceptance criteria:**
- Unauthorized requests get 401.
- Endpoint is idempotent.

---

## Phase 4: AI Pipeline

**Goal:** Full AI processing for individual insights (Layer 1), aggregate analysis (Layer 2), and intelligent briefing/Q&A (Layer 3).

**Dependencies:** Phase 3 (API endpoints exist, database is populated).

### Step 4.1: Claude API Wrapper

**Complexity:** Medium
**File created:** `src/lib/ai/claude.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function callClaude<T>(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; retries?: number }
): Promise<T> {
  const maxRetries = options?.retries ?? 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: options?.maxTokens ?? 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })

      const text = response.content[0].type === 'text'
        ? response.content[0].text : ''
      return JSON.parse(text) as T
    } catch (error: any) {
      lastError = error
      if (error?.status === 429 || (error?.status >= 500)) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw error
    }
  }
  throw lastError
}
```

**Key decisions:**
- Use `claude-sonnet-4-20250514` for cost-efficiency on high-volume per-insight calls.
- Use `claude-sonnet-4-20250514` for Layer 2 and Layer 3 calls too (can upgrade later if quality is insufficient).
- Exponential backoff: 1s, 2s, 4s for rate limits and 5xx errors.
- All responses are expected as JSON.

**Acceptance criteria:**
- Retry logic works for 429 and 5xx errors.
- Non-retryable errors throw immediately.
- JSON parsing is validated.

### Step 4.2: Embedding Generation

**Complexity:** Medium
**File created:** `src/lib/ai/embeddings.ts`

```typescript
export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = process.env.EMBEDDING_PROVIDER || 'voyage'

  if (provider === 'voyage') {
    return generateVoyageEmbedding(text)
  } else {
    return generateOpenAIEmbedding(text)
  }
}
```

**Voyage implementation:**
- Call the Voyage AI API (`https://api.voyageai.com/v1/embeddings`).
- Model: `voyage-3`.
- Input: concatenated `"{title}\n\n{description}"`.
- Returns 1024-dimension vector.

**OpenAI fallback:**
- Call OpenAI embeddings API.
- Model: `text-embedding-3-small`.
- Returns 1536-dimension vector.
- **Important:** If using OpenAI, the `vector(1024)` in the schema must be changed to `vector(1536)`. Document this clearly.

**Acceptance criteria:**
- Embedding provider is configurable via `EMBEDDING_PROVIDER`.
- Returns a number array of the correct dimension.
- Errors are caught and logged.

### Step 4.3: Prompt Templates

**Complexity:** Medium
**File created:** `src/lib/ai/prompts.ts`

Define all prompt templates as exported functions:

**`layer1ProcessingPrompt(insight, existingThemes)`:**
Combined prompt for theme classification + enrichment + priority scoring.
- Input: insight title, description, metadata; list of existing theme names with descriptions.
- Expected JSON output:
```json
{
  "themes": [
    { "name": "string", "is_new": true, "description": "string" }
  ],
  "sentiment": "positive|negative|neutral",
  "urgency": "high|medium|low",
  "type": "bug|feature_request|praise|question",
  "priority_score": 75,
  "priority_reasoning": "string"
}
```

**`layer2OpportunitiesPrompt(themes)`:**
- Input: themes with their insight summaries.
- Expected JSON output: array of opportunities with title, description, impact, related theme.

**`layer2TrendPrompt(theme, recentCount, priorCount)`:**
- Simple calculation, may not need Claude. Implement as pure logic.

**`briefingPrompt(context)`:**
- Input: new insights, theme changes, opportunities, manager action patterns.
- Expected JSON output matching `BriefingResponse`.

**`askPrompt(question, relevantInsights)`:**
- Input: user question, retrieved insight texts.
- Expected output: prose answer with insight citations.

**`csvMappingPrompt(headers, sampleRows)`:**
- Input: CSV column headers, first 3 rows.
- Expected JSON output: `{ "column_name": "insight_field_or_metadata" }`.

**Acceptance criteria:**
- Every prompt instructs Claude to respond in JSON (except `askPrompt`).
- Every prompt includes output schema examples.
- Prompts are parameterized functions, not hard-coded strings.

### Step 4.4: Layer 1 - Individual Processing Pipeline

**Complexity:** Complex
**File created:** `src/lib/pipeline/layer1.ts`

```typescript
export async function processInsight(insightId: string): Promise<void> {
  // 1. Fetch the insight from DB
  // 2. Generate embedding
  // 3. Store embedding
  // 4. Duplicate detection (cosine similarity > 0.92)
  //    - If duplicate found, add metadata note
  // 5. Fetch existing themes
  // 6. Call Claude with combined prompt (theme + enrichment + scoring)
  // 7. Parse response
  // 8. Handle themes:
  //    a. For each theme in response:
  //       - Case-insensitive search for existing theme
  //       - If exists: link via insight_themes
  //       - If new: create theme, then link
  // 9. Update insight with sentiment, urgency, type, priority_score
  // 10. Error handling: if any AI step fails, leave fields as null
}
```

**Duplicate detection query:**
```sql
SELECT id, 1 - (embedding <=> $1) as similarity
FROM insights
WHERE id != $2
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT 5
```
Filter results where similarity > 0.92.

**Acceptance criteria:**
- All 5 steps complete for each insight.
- Failures on AI steps leave insight saved with null AI fields.
- Processing completes within 30 seconds per insight.
- Theme deduplication works (case-insensitive matching).
- An insight can be linked to up to 3 themes.

### Step 4.5: Layer 2 - Aggregate Analysis Pipeline

**Complexity:** Complex
**File created:** `src/lib/pipeline/layer2.ts`

```typescript
export async function runLayer2(): Promise<{
  opportunities_created: number
  opportunities_updated: number
  trends_updated: number
  scores_recalculated: number
}> {
  // 1. Opportunity Identification
  //    a. Fetch themes with insight_count >= 3
  //    b. For each, fetch linked insight summaries
  //    c. Send to Claude for opportunity identification
  //    d. Upsert opportunities (match by title similarity to avoid duplicates)
  //    e. Link insights to opportunities via insight_opportunities

  // 2. Trend Detection
  //    a. For each theme, count insights created in last 7 days vs prior 7 days
  //    b. Calculate: growing (>20% increase), declining (>20% decrease), stable
  //    c. Update theme.trend

  // 3. Score Recalculation
  //    a. Fetch recent manager_actions (last 30 days)
  //    b. For each open insight:
  //       - Base: original AI score
  //       - Boost: theme size factor (larger theme = higher relevance)
  //       - Boost: recency factor (newer insights score higher)
  //       - Adjust: manager patterns (themes they dismiss get deprioritized)
  //    c. Update priority_score
  //    d. Recalculate aggregated_score on themes (AVG of linked insight scores)

  // Return summary
}
```

**Idempotency guarantees:**
- Opportunities are matched by title + theme_id before creating new ones.
- Trends are recalculated from scratch each run.
- Scores are recalculated from scratch each run.

**Acceptance criteria:**
- Running Layer 2 twice produces the same result.
- New opportunities are created for theme clusters with 3+ insights.
- Existing opportunities are updated, not duplicated.
- Trend detection uses 7-day rolling windows.

### Step 4.6: Layer 3 - Briefing and Ask

**Complexity:** Medium
**File created:** `src/lib/pipeline/layer3.ts`

```typescript
export async function generateBriefing(): Promise<BriefingResponse> {
  // 1. Determine time window (last briefing generated_at or 24 hours)
  // 2. Gather context:
  //    a. New insights since last briefing
  //    b. Themes with trend changes
  //    c. New/updated opportunities
  //    d. Unresolved high-priority items (priority_score > 70, status = 'open')
  //    e. Recent manager actions (for adaptiveness)
  // 3. Send to Claude with briefing prompt
  // 4. Parse and validate response
  // 5. Store in briefing_cache table
  // 6. Return
}

export async function askQuestion(
  question: string
): Promise<{ answer: string; referenced_insights: Insight[] }> {
  // 1. Generate embedding for question
  // 2. Query top 20 insights by cosine similarity
  // 3. Filter to similarity > 0.7
  // 4. Send question + insight texts to Claude
  // 5. Parse response
  // 6. Match cited insight titles to actual insight objects
  // 7. Return answer + referenced insights
}
```

**Acceptance criteria:**
- Briefing generates within 10 seconds.
- Ask responses cite specific insights.
- No relevant data returns a clear "no data" message.

---

## Phase 5: Frontend - Dashboard

**Goal:** All UI screens implemented and connected to the API.

**Dependencies:** Phase 3 (API endpoints must work). Phase 4 (AI pipeline should work for realistic data, but frontend can function with null AI fields).

### Step 5.1: Shared Components

**Complexity:** Simple
**Files created:**
- `src/components/shared/Badge.tsx` -- Colored badge for status, impact, sentiment, urgency.
- `src/components/shared/Pagination.tsx` -- Page navigation controls.
- `src/components/shared/EmptyState.tsx` -- Illustration + message + CTA button.
- `src/components/shared/LoadingSpinner.tsx` -- Loading indicator.

**Design tokens (Tailwind):**
- Status colors: open=blue, related=yellow, closed=green, archived=gray.
- Impact: high=red, medium=orange, low=green.
- Sentiment: positive=green, negative=red, neutral=gray.
- Trend: growing=green arrow up, stable=gray arrow right, declining=red arrow down.

**Acceptance criteria:**
- Components are reusable across all pages.
- Consistent styling throughout the app.

### Step 5.2: Briefing Page (Main Screen)

**Complexity:** Complex
**Files created/modified:**
- `src/app/page.tsx` -- Main briefing page (Server Component wrapper).
- `src/components/briefing/BriefingSummary.tsx` -- AI summary display.
- `src/components/briefing/BriefingItem.tsx` -- Action item with Accept/Dismiss buttons.

**Behavior:**
1. On page load, call `POST /api/briefing`.
2. Display summary text.
3. Display action items ordered by priority.
4. Accept button: execute the `suggested_action` (call relevant API endpoint based on `type`), log `accept` action.
5. Dismiss button: remove item from view, log `dismiss` action via `POST` to a manager actions endpoint (or inline in the briefing dismiss handler).
6. Empty state (0 insights): show onboarding message with link to `/ingest`.
7. All-resolved state: "No new items need your attention."

**Client-side state:**
- Use `"use client"` for the briefing items list (needs interactivity for accept/dismiss).
- Summary can be a server component that passes data down.

**Acceptance criteria:**
- Briefing loads and displays within 10 seconds.
- Accept/Dismiss buttons update immediately (optimistic UI).
- Manager actions are logged.
- Empty and resolved states display correctly.

### Step 5.3: Explorer - Themes View

**Complexity:** Medium
**Files created/modified:**
- `src/app/explorer/themes/page.tsx` -- Themes grid.
- `src/app/explorer/themes/[id]/page.tsx` -- Theme detail.
- `src/components/themes/ThemeCard.tsx` -- Theme card component.
- `src/components/themes/TrendIndicator.tsx` -- Trend arrow component.

**Layout:**
- Grid of cards (responsive: 1 column mobile, 2 tablet, 3 desktop).
- Each card: name, insight count, aggregated score bar, trend indicator.
- Click navigates to detail view.
- Detail view: theme info + paginated list of linked insights.

**Acceptance criteria:**
- Themes with 0 insights are hidden.
- Trend indicator uses green/gray/red colors.
- Cards sorted by aggregated score (highest first).

### Step 5.4: Explorer - Opportunities View

**Complexity:** Medium
**Files created/modified:**
- `src/app/explorer/opportunities/page.tsx` -- Opportunities list.
- `src/app/explorer/opportunities/[id]/page.tsx` -- Opportunity detail.
- `src/components/opportunities/OpportunityCard.tsx`
- `src/components/opportunities/StatusDropdown.tsx`

**Layout:**
- List of cards, each showing: title, description (truncated), insight count, impact badge.
- Status dropdown on each card (optimistic update on change).
- Detail view: full description + linked insights.

**Acceptance criteria:**
- Status change persists immediately.
- Ordered by impact (high first), then insight count.

### Step 5.5: Explorer - Insights View

**Complexity:** Complex
**Files created/modified:**
- `src/app/explorer/insights/page.tsx`
- `src/app/explorer/insights/[id]/page.tsx`
- `src/components/insights/InsightTable.tsx`
- `src/components/insights/InsightFilters.tsx`
- `src/components/insights/InsightCard.tsx`

**Layout:**
- Table/list view with columns: title, source, status, priority score, sentiment, type, created date.
- Filter bar: status (multi-select), theme (dropdown), source (dropdown), date range.
- Text search input.
- Bulk action toolbar: appears when insights are selected. Actions: change status.
- Pagination at bottom.

**Default view:** `status=open`, sorted by `priority_score DESC`.

**Detail view (`/explorer/insights/:id`):**
- Full insight data.
- Linked themes (clickable).
- Linked opportunities (clickable).
- RICE override form (see Phase 6).
- Reprocess button.

**Acceptance criteria:**
- Filters persist in URL params (shareable URLs).
- Text search is case-insensitive.
- Bulk status change works.
- 25 items per page with pagination.

### Step 5.6: Ask the System

**Complexity:** Medium
**Files created/modified:**
- `src/app/ask/page.tsx`
- `src/components/ask/ChatMessage.tsx`
- `src/components/ask/ChatInput.tsx`

**Layout:**
- Chat-like interface. Messages scroll up.
- User messages on the right, AI responses on the left.
- AI responses include prose answer + clickable insight reference cards below.
- Text input at the bottom with send button.
- Conversation history persists in React state (lost on page reload for MVP).

**Behavior:**
1. User types question, hits Enter or clicks Send.
2. Show loading indicator.
3. Call `POST /api/ask` with the question.
4. Display the answer.
5. Display referenced insights as small cards (title, source, sentiment badge).
6. Cards link to `/explorer/insights/:id`.

**Acceptance criteria:**
- Questions and answers display in chat format.
- Referenced insights are clickable.
- "No relevant data" message displays when appropriate.
- Loading state while waiting for response.

### Step 5.7: Ingest Page

**Complexity:** Complex
**Files created/modified:**
- `src/app/ingest/page.tsx`
- `src/components/ingest/CsvUploader.tsx`
- `src/components/ingest/ColumnMapper.tsx`
- `src/components/ingest/CsvPreview.tsx`
- `src/components/insights/InsightForm.tsx`

**Layout (two sections, side by side on desktop, tabbed on mobile):**

**Section 1: Manual Entry**
- Form fields: title (required), description (required), source (optional), metadata key-value pairs (add/remove dynamic rows).
- Submit button.
- Success message with link to the created insight.

**Section 2: CSV Upload**
- Drag-and-drop zone (also clickable for file picker).
- Flow:
  1. Drop file -> show file name, size.
  2. Call preview endpoint -> show mapping + preview table.
  3. Mapping UI: each CSV column has a dropdown to select insight field or "metadata".
  4. Confirm button -> show progress bar.
  5. Results: X success, Y failed, with error details.

**Acceptance criteria:**
- Manual form validates required fields.
- CSV drag-and-drop works.
- Preview shows first 5 rows.
- Column mapping is adjustable.
- Progress bar during processing.
- Error rows are listed with reasons.
- File size limit: 10MB.

---

## Phase 6: Prioritization System

**Goal:** AI scoring with RICE manual override and adaptive learning.

**Dependencies:** Phase 4 (AI pipeline) and Phase 5 (frontend).

### Step 6.1: RICE Override UI

**Complexity:** Medium
**Files created/modified:**
- `src/app/explorer/insights/[id]/page.tsx` (add RICE form)
- New component: `src/components/insights/RiceOverride.tsx`

**RICE form on insight detail page:**
- Collapsible section "Override Priority with RICE".
- Four sliders/inputs:
  - Reach (1-10)
  - Impact (1-3)
  - Confidence (1-3)
  - Effort (1-10)
- Live preview of calculated score: `(Reach * Impact * Confidence) / Effort`, normalized to 0-100.
- Apply button.
- When applied:
  - Calculate RICE score and normalize to 0-100.
  - Update `priority_score` on the insight.
  - Store RICE values in `metadata.rice: { reach, impact, confidence, effort }`.
  - Add `metadata.manually_scored: true`.
  - Log `rice_override` manager action.
- "Manually scored" badge appears on insights with RICE override.

**Acceptance criteria:**
- RICE calculation is correct.
- Score is normalized to 0-100 scale.
- RICE values persist in metadata.
- Manager action is logged.
- "Manually scored" indicator is visible in list and detail views.

### Step 6.2: Adaptive Learning Integration

**Complexity:** Medium
**Files modified:**
- `src/lib/pipeline/layer2.ts` (score recalculation)
- `src/lib/ai/prompts.ts` (briefing prompt includes action patterns)

**Changes to Layer 2 score recalculation:**
```typescript
// Fetch recent manager actions (last 30 days)
// Build pattern summary:
// - Themes with high dismiss rate -> reduce priority of insights in those themes
// - Themes with high accept rate -> boost priority of insights in those themes
// - Insight types frequently archived -> reduce priority
// Include pattern summary in Claude prompt for score adjustment
```

**Changes to briefing generation:**
- Include recent manager action summary in the briefing prompt.
- Claude is instructed to deprioritize themes/types the manager consistently ignores.
- Claude is instructed to highlight themes/types the manager consistently acts on.

**Acceptance criteria:**
- Dismissed themes get lower priority over time.
- Accepted themes get higher priority over time.
- The system does NOT auto-archive or auto-close anything.
- Changes are gradual and observable.

---

## Cross-Cutting Concerns

### Error Handling

Apply consistently across all API routes:
- 400 for missing required fields.
- 422 for invalid field values.
- 404 for not found resources.
- 429 for concurrent CSV upload limit.
- 500 for unexpected errors (log full error server-side, return generic message to client).
- AI failures are graceful: the app works without AI features.

### Loading and Empty States

Every page must handle:
- **Loading**: Show `LoadingSpinner` while fetching data.
- **Empty**: Show `EmptyState` with appropriate message and CTA.
- **Error**: Show error message with retry option.

### Performance

- Use Next.js Server Components for data fetching (no client-side fetch waterfalls).
- Use `Suspense` boundaries for streaming.
- Implement pagination on all list views (25 items default).
- Cache briefing in the database (avoid redundant AI calls).

---

## File Summary

| Phase | Files Created | Complexity |
|-------|--------------|------------|
| Phase 1: Scaffolding | ~20 files (project structure) | Simple |
| Phase 2: Database | 7 migration files + 1 types file | Medium |
| Phase 3: API | 12 route files + 3 utility files | Medium-Complex |
| Phase 4: AI Pipeline | 5 files (claude, embeddings, prompts, layer1, layer2, layer3) | Complex |
| Phase 5: Frontend | ~25 component files + 10 page files | Complex |
| Phase 6: Prioritization | 1 new component + modifications to existing files | Medium |

**Total estimated files:** ~80-90 files

---

## Dependency Graph

```
Phase 1 (Scaffolding)
  └─> Phase 2 (Database Schema)
        └─> Phase 3 (API Layer)
              ├─> Phase 4 (AI Pipeline)
              │     └─> Phase 6 (Prioritization - adaptive learning)
              └─> Phase 5 (Frontend)
                    └─> Phase 6 (Prioritization - RICE UI)
```

Phases 4 and 5 can proceed in parallel after Phase 3 is complete. Phase 6 requires both Phase 4 and Phase 5.

---

## Implementation Notes for AI Coding Agents

1. **Always read the spec** before implementing any phase. The spec at `docs/superpowers/specs/2026-03-10-insight-management-design.md` is the source of truth.

2. **Test each phase** before moving to the next. At minimum:
   - Phase 1: App runs locally.
   - Phase 2: Tables exist and constraints work (test with manual SQL inserts).
   - Phase 3: API endpoints return correct data (test with curl or similar).
   - Phase 4: AI processing enriches test insights.
   - Phase 5: UI displays data from the API.
   - Phase 6: RICE override calculates correctly.

3. **Environment variables** must be configured before Phase 3 can work. Provide a clear setup guide.

4. **The vector dimension (1024 vs 1536)** depends on the embedding provider. This is configured once at project setup and must be consistent across the schema and code.

5. **All Claude API calls** should use JSON-mode prompting and validate responses before writing to the database. If parsing fails, retry once, then leave fields as null.

6. **Vercel serverless functions** have a 10-second default timeout (25 seconds on Pro). Layer 1 processing should be triggered as a background task, not in the response path. Use `waitUntil` from `next/server` for fire-and-forget async work.

7. **Supabase migrations** should be run via the Supabase CLI (`supabase db push`) or applied directly in the Supabase dashboard SQL editor for MVP.
