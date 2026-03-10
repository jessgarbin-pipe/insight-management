# Insight Management SaaS - MVP Design Specification

**Date:** 2026-03-10
**Status:** Draft
**Version:** 1.1 (reviewed)

---

## 1. Overview

A SaaS platform where users collect insights from multiple sources. An AI layer classifies insights into themes, detects duplicates, identifies opportunities, prioritizes groups, and helps managers decide on next steps.

This is the MVP. There is no authentication. The application is a single-tenant monolith deployed on Vercel.

---

## 2. Target Users

| Role | Primary Use Case |
|---|---|
| Product Managers | Prioritize what to build based on customer feedback |
| CEOs / Founders | Make strategic business decisions from aggregated signals |
| Customer Success Teams | Organize and escalate insights to product teams |

---

## 3. Architecture

**Pattern:** Monolith Next.js application with Supabase backend.
**Repository:** Single repo.
**Deployment:** Vercel.

### 3.1 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), React, Tailwind CSS, Shadcn UI (preset: auJPE5g) |
| Backend | Next.js Route Handlers (API Routes) |
| Database | Supabase (PostgreSQL) |
| AI | Claude API (Anthropic) |
| Semantic Search | pgvector (Postgres extension via Supabase) |
| Deployment | Vercel |

### 3.2 Key Architectural Decisions

- **App Router only.** All pages use the Next.js App Router (`/app` directory). No Pages Router.
- **Server Components by default.** Use client components (`"use client"`) only when interactivity is required (forms, state, event handlers).
- **Route Handlers for API.** All backend logic lives in Next.js Route Handlers under `/app/api/`.
- **Supabase client.** Use `@supabase/supabase-js` for database access. Server-side calls use the service role key. Client-side calls use the anon key.
- **No auth in MVP.** Direct access. No login, no sessions, no RLS policies.

---

## 4. Data Model

All tables live in the Supabase PostgreSQL database. Timestamps use `timestamptz`. IDs use `uuid` with `gen_random_uuid()` default.

### 4.1 `insights`

A single observation from a customer or source.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `title` | `text` | NOT NULL | Short summary of the insight |
| `description` | `text` | NOT NULL | Full text of the insight |
| `source` | `text` | NOT NULL, default `'manual'` | Origin: `"manual"`, `"csv"`, or custom name via API |
| `status` | `text` | NOT NULL, default `'open'` | One of: `open`, `related`, `closed`, `archived` |
| `priority_score` | `numeric` | nullable | AI-generated priority score (0-100 scale) |
| `sentiment` | `text` | nullable | AI-generated: `positive`, `negative`, `neutral` |
| `urgency` | `text` | nullable | AI-generated: `high`, `medium`, `low` |
| `type` | `text` | nullable | AI-generated: `bug`, `feature_request`, `praise`, `question` |
| `embedding` | `vector(1024)` | nullable | Vector embedding for semantic search (dimension must match the chosen embedding model; 1024 for Voyage, 1536 for OpenAI) |
| `metadata` | `jsonb` | default `'{}'` | Flexible key-value data (customer name, plan, etc.) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last update timestamp |

**Status definitions:**

- `open` -- Not yet acted on. Default for all new insights.
- `related` -- Linked to a project or opportunity.
- `closed` -- Acted upon and resolved.
- `archived` -- Deemed not relevant.

**Acceptance criteria:**

- `status` must be one of the four allowed values. Enforce with a CHECK constraint.
- `priority_score` is a number between 0 and 100. Enforce with a CHECK constraint.
- `sentiment`, `urgency`, and `type` should be constrained to their allowed values with CHECK constraints.
- `updated_at` must auto-update on row modification (use a trigger).

### 4.2 `themes`

A grouping of related insights, created automatically by AI.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `name` | `text` | NOT NULL | Theme name (AI-generated) |
| `description` | `text` | nullable | Theme description (AI-generated) |
| `insight_count` | `integer` | NOT NULL, default `0` | Number of linked insights (denormalized; update via trigger or application logic when `insight_themes` rows are added/removed) |
| `aggregated_score` | `numeric` | nullable | Average priority score of linked insights |
| `trend` | `text` | nullable, CHECK (`growing`, `stable`, `declining`) | Trend direction based on recent volume |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last update timestamp |

### 4.3 `insight_themes` (join table)

Many-to-many relationship between insights and themes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `insight_id` | `uuid` | FK -> `insights.id` ON DELETE CASCADE | Insight reference |
| `theme_id` | `uuid` | FK -> `themes.id` ON DELETE CASCADE | Theme reference |

**Primary key:** (`insight_id`, `theme_id`)

### 4.4 `opportunities`

A concrete action identified by AI from insight groups.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `title` | `text` | NOT NULL | Opportunity title |
| `description` | `text` | nullable | Detailed description |
| `estimated_impact` | `text` | nullable, CHECK (`high`, `medium`, `low`) | AI-estimated impact level |
| `theme_id` | `uuid` | FK -> `themes.id` ON DELETE SET NULL, nullable | The theme that generated this opportunity |
| `status` | `text` | NOT NULL, default `'identified'`, CHECK (`identified`, `evaluating`, `approved`, `discarded`) | Opportunity lifecycle status |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last update timestamp |

### 4.5 `insight_opportunities` (join table)

Many-to-many relationship between insights and opportunities.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `insight_id` | `uuid` | FK -> `insights.id` ON DELETE CASCADE | Insight reference |
| `opportunity_id` | `uuid` | FK -> `opportunities.id` ON DELETE CASCADE | Opportunity reference |

**Primary key:** (`insight_id`, `opportunity_id`)

### 4.6 Database Indexes

Performance-critical indexes beyond primary keys:

| Table | Index | Type | Purpose |
|---|---|---|---|
| `insights` | `embedding` | `ivfflat (vector_cosine_ops) WITH (lists = 100)` | Semantic similarity search |
| `insights` | `status` | B-tree | Filter by status (most views filter on `open`) |
| `insights` | `created_at` | B-tree DESC | Sort by recency, trend calculations |
| `insights` | `priority_score` | B-tree DESC NULLS LAST | Sort by priority (default list ordering) |
| `insights` | `source` | B-tree | Filter by source |
| `themes` | `aggregated_score` | B-tree DESC NULLS LAST | Sort themes by score |
| `manager_actions` | `created_at` | B-tree DESC | Query recent actions for adaptiveness |
| `manager_actions` | `action_type` | B-tree | Filter by action type |

### 4.7 Database Setup Notes

- Enable the `vector` extension in Supabase for pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`
- The IVFFlat index on `embedding` requires at least 100 rows to be effective. Before that threshold, the index will still work but may not improve performance. Consider creating the index after initial data load.
- Create a trigger function for auto-updating `updated_at` on all tables that have it.
- Add CHECK constraints for all enum-like columns as specified in Section 4.1.
- Add CHECK constraint on `priority_score`: `CHECK (priority_score >= 0 AND priority_score <= 100)`.

---

## 5. Data Flow

```
Entry (CSV / Manual Form / API)
    |
    v
Insight saved to DB (status: "open", AI fields: null)
    |
    v
AI Pipeline - Layer 1 (Individual Processing):
    1. Generate embedding (vector)
    2. Check for duplicates (cosine similarity against existing embeddings)
    3. Classify into theme (existing or new)
    4. Enrich: extract sentiment, urgency, type
    5. Generate priority score
    |
    v
Insight updated with AI enrichments
    |
    v
When threshold is met (triggered via Vercel Cron, daily at midnight UTC, or manually via API):
    AI Pipeline - Layer 2 (Aggregate Analysis):
    1. Identify opportunities from theme clusters
    2. Detect trends (growing/stable/declining)
    3. Recalculate priority scores
    |
    v
Dashboard reflects updated state
```

### 5.1 Processing Order

Layer 1 runs synchronously after each insight is saved (or queued and processed immediately). The API returns the created insight before AI processing completes -- the client sees `status: "open"` and null AI fields initially, then polls or receives updates.

Layer 2 runs as a background job. For MVP, trigger it via a Route Handler that can be called by a cron job (Vercel Cron) or manually. Configure Vercel Cron in `vercel.json` to call `POST /api/process/layer2` daily at midnight UTC. The route should verify a `CRON_SECRET` header to prevent unauthorized invocations.

Layer 3 (Intelligent Briefing, see Section 6.3) runs on demand when the user opens the briefing page or asks a question.

---

## 6. AI Pipeline

### 6.1 Layer 1 -- Individual Processing (on ingest)

Triggered when a new insight is created. Processes one insight at a time.

**Step 1: Generate Embedding**
- Call the Anthropic Voyager embedding model (`voyage-3`) to generate a 1024-dimension vector from the insight's title + description concatenated as `"{title}\n\n{description}"`.
- If Voyager is unavailable or out of scope for MVP, use OpenAI's `text-embedding-3-small` (1536 dimensions) as a fallback. The chosen model determines the `vector()` dimension in the schema.
- Store in the `embedding` column.
- **Environment variable required:** `VOYAGE_API_KEY` (or `OPENAI_API_KEY` if using OpenAI embeddings). Add to Section 12.

**Step 2: Duplicate Detection**
- Query the database for insights with cosine similarity > 0.92 to the new embedding.
- If a near-duplicate is found:
  - Do NOT delete either insight.
  - Link both to the same theme.
  - Add a note in the metadata: `{ "duplicate_of": "<other_insight_id>" }`.
  - The user can merge or archive manually.

**Step 3: Theme Classification**
- Send the insight text + list of existing theme names/descriptions to Claude.
- Claude responds with either an existing theme name or suggests a new theme.
- If new theme: create a `themes` row, then link the insight via `insight_themes`.
- If existing theme: link the insight via `insight_themes`, increment `insight_count`.
- **Duplicate theme prevention**: Before creating a new theme, do a case-insensitive search for themes with similar names. If Claude suggests "User Onboarding" and "user onboarding" already exists, link to the existing one. Use the Claude response to also check semantic similarity to existing theme names (not just exact match).
- **Multiple themes**: An insight can belong to multiple themes. Claude may return up to 3 theme assignments per insight. Create all links.

**Step 4: Enrichment**
- Send the insight text to Claude with a structured prompt requesting:
  - `sentiment`: positive / negative / neutral
  - `urgency`: high / medium / low
  - `type`: bug / feature_request / praise / question
- **All Claude AI calls should use JSON mode** (or instruct Claude to respond in JSON) and validate the response against expected schemas before writing to the database. If the response does not parse correctly, retry once, then leave fields as null.
- Parse the structured response and update the insight row.

**Step 5: Priority Scoring**
- Claude generates an initial score (0-100) based on:
  - Urgency language in the text
  - Frequency signal (how many similar insights exist, from duplicate check)
  - Sentiment intensity
- Store in `priority_score`.

**Implementation note on Claude calls:**
- Steps 3, 4, and 5 (theme classification, enrichment, priority scoring) can be combined into a single Claude API call for efficiency. Send the insight text + existing themes list and request all outputs in one structured JSON response.
- This reduces API calls from 3 to 1 per insight, reducing latency and cost.
- The embedding generation (Step 1) must use a separate embedding-specific API call.

**Acceptance criteria:**
- All five steps complete for each new insight.
- If any AI call fails, the insight remains saved with null AI fields. Processing can be retried via `POST /api/insights/:id/reprocess`.
- Processing should complete within 30 seconds per insight.
- **Retry behavior**: If the Claude API returns a rate limit (429) or server error (5xx), retry with exponential backoff (1s, 2s, 4s) up to 3 times.

### 6.2 Layer 2 -- Aggregate Analysis (periodic)

Triggered by a cron job or manual invocation. Operates on the full dataset.

**Opportunity Identification:**
- Retrieve all themes with 3+ insights.
- Send theme summaries to Claude.
- Claude identifies actionable opportunities and returns structured data.
- Create or update `opportunities` rows and link to relevant insights.

**Trend Detection:**
- For each theme, compare insight volume over the last 7 days vs. prior 7 days.
- If volume increased by 20%+: `growing`.
- If volume decreased by 20%+: `declining`.
- Otherwise: `stable`.
- Update the `trend` column on the theme.

**Score Recalculation:**
- Recalculate `priority_score` for all open insights considering:
  - Original AI score
  - Volume of similar insights (theme size)
  - Recency (newer insights score higher)
  - Manager behavior patterns (see Section 9: Adaptiveness)
- Recalculate `aggregated_score` on themes as the average of linked insight scores.

**Acceptance criteria:**
- Layer 2 is idempotent. Running it multiple times produces the same result.
- Trends reflect actual volume changes.
- Opportunities are not duplicated on re-runs; existing ones are updated.

### 6.3 Layer 3 -- Intelligent Briefing (on demand)

Triggered when the user opens the main dashboard or asks a question.

**Briefing Generation:**
- Retrieve: new insights since last briefing generation (`generated_at` from the cached briefing, or the last 24 hours if no prior briefing exists), themes with trend changes, new opportunities, unresolved high-priority items.
- Send to Claude with a prompt requesting an executive summary.
- Claude returns a structured briefing with:
  - Summary text
  - List of items needing attention, each with a suggested action
- Render in the UI.

**Ask the System:**
- User types a natural language question.
- System generates an embedding for the question using the same embedding model as insights.
- System retrieves the top 20 most relevant insights using cosine similarity search against the `embedding` column.
- Filters results to those with similarity score > 0.7 (to avoid irrelevant context).
- Sends the question + retrieved insight texts to Claude with instructions to ground its answer in the provided data.
- Claude responds with a grounded answer referencing specific insights by title.

**Acceptance criteria:**
- Briefing loads within 10 seconds.
- "Ask the System" responses cite specific insights by title.
- Questions with no relevant data return a clear "no data found" response.

---

## 7. Dashboard

The dashboard is the primary UI. It follows an AI-native design where the AI surfaces what matters rather than requiring the user to browse.

### 7.1 Navigation Structure

```
/                              -> Briefing (main screen)
/explorer/themes               -> Themes list view
/explorer/themes/:id           -> Theme detail (linked insights)
/explorer/opportunities        -> Opportunities list view
/explorer/opportunities/:id    -> Opportunity detail (linked insights)
/explorer/insights             -> Insights list view
/explorer/insights/:id         -> Insight detail view
/ask                           -> Ask the System
/ingest                        -> Manual entry + CSV upload
```

### 7.2 Briefing (Main Screen) -- `/`

The landing page. AI-generated executive summary.

**Layout:**
- Header with app name and navigation.
- Summary section: 2-3 sentences about what changed since last visit.
- Action items list: each item shows:
  - Description of what needs attention
  - Suggested action (e.g., "Link to project X", "Investigate", "Archive")
  - Two buttons: Accept / Dismiss
- When the user clicks Accept, the system executes the suggested action (e.g., changes status, links to opportunity). The specific action must be encoded in the briefing item's data structure so the frontend knows what API call to make. See the briefing response schema below.
- When the user clicks Dismiss, the item is removed from the briefing and a `dismiss` action is logged in `manager_actions`.

**Briefing API Response Schema (`POST /api/briefing`):**

```json
{
  "summary": "Since your last visit, 12 new insights were added...",
  "generated_at": "2026-03-10T14:30:00Z",
  "cached": false,
  "items": [
    {
      "id": "briefing-item-uuid",
      "description": "Theme 'Pricing Complaints' is growing with 8 new insights",
      "suggested_action": {
        "label": "Create opportunity for pricing review",
        "type": "create_opportunity",
        "params": { "theme_id": "uuid", "title": "Review pricing model" }
      },
      "related_insight_ids": ["uuid1", "uuid2"],
      "priority": 1
    }
  ]
}
```

**Supported `suggested_action.type` values:**
- `change_status` -- params: `{ "insight_id", "new_status" }`
- `create_opportunity` -- params: `{ "theme_id", "title" }`
- `link_to_opportunity` -- params: `{ "insight_ids", "opportunity_id" }`
- `archive_theme` -- params: `{ "theme_id" }`
- `investigate` -- params: `{ "insight_id" }` (marks as `related`, no further action)

**Acceptance criteria:**
- Briefing shows items ordered by priority.
- Accept/Dismiss actions update the database immediately and log to `manager_actions`.
- Empty state: "No new items need your attention" when everything is resolved.
- Briefing regenerates on page load (with caching -- don't re-call AI if data hasn't changed in the last 5 minutes).
- **Cache invalidation**: The cache key should be based on the `MAX(updated_at)` across insights, themes, and opportunities. If any row changed since the cached briefing was generated, regenerate.
- **First-time use**: If there are 0 insights, show an onboarding message directing the user to the `/ingest` page.

### 7.3 Explorer -- Themes View -- `/explorer/themes`

**Layout:**
- Grid of theme cards.
- Each card shows: name, insight count, aggregated score, trend indicator (arrow up/down/horizontal).
- Cards ordered by aggregated score (highest first).
- Clicking a card navigates to a detail view showing all linked insights.

**Acceptance criteria:**
- Themes with 0 insights are hidden.
- Trend indicator uses color: green for growing, gray for stable, red for declining.

### 7.4 Explorer -- Opportunities View -- `/explorer/opportunities`

**Layout:**
- List of opportunity cards.
- Each card shows: title, description (truncated), supporting insight count, estimated impact badge.
- Status dropdown on each card: identified / evaluating / approved / discarded.
- Clicking a card shows full detail with linked insights.

**Acceptance criteria:**
- Status change persists immediately (optimistic update).
- Opportunities are ordered by estimated impact (high first), then by supporting insight count.
- Manager can link/unlink insights from the detail view.

### 7.5 Explorer -- Insights View -- `/explorer/insights`

**Layout:**
- Table/list of all insights.
- Columns: title, source, status, priority score, sentiment, type, created date.
- Filters (sidebar or top bar):
  - Status: open / related / closed / archived (multi-select)
  - Theme: dropdown of themes
  - Source: dropdown of sources
  - Date range: from/to date pickers
- Text search: searches title and description.
- Bulk actions: select multiple insights, change status in batch.

**Acceptance criteria:**
- Default view shows `open` insights, ordered by priority score (highest first).
- Text search is case-insensitive and matches partial strings.
- Bulk status change updates all selected insights in a single operation.
- Pagination or infinite scroll for large datasets (25 items per page).

### 7.6 Ask the System -- `/ask`

**Layout:**
- Chat-like interface.
- Text input at the bottom.
- Responses appear above, showing:
  - The AI answer in prose.
  - Referenced insights as clickable cards below the answer.
- Conversation history persists during the session (not across page reloads in MVP).

**Acceptance criteria:**
- User can ask questions like: "What are enterprise customers saying about pricing?" or "What new themes emerged last month?"
- Responses are grounded in actual data -- no hallucinated insights.
- If no relevant data exists, the system says so clearly.
- Referenced insight cards link to the insight detail view.

### 7.7 Ingest -- `/ingest`

**Layout:**
- Two sections side by side (or tabbed):
  1. **Manual Entry**: Form with title (required), description (required), source (optional, defaults to "manual"), metadata fields (optional key-value pairs).
  2. **CSV Upload**: Drag-and-drop zone for CSV files.

**CSV Upload Flow:**
1. User drags a CSV file onto the drop zone.
2. System reads the CSV and displays a preview (first 5 rows).
3. AI auto-maps CSV columns to insight fields (title, description, source, metadata keys).
4. User can adjust the mapping.
5. User confirms. System creates insights in batch.
6. Progress indicator shows processing status.

**Acceptance criteria:**
- Manual form validates that title and description are not empty.
- CSV supports files up to 10MB.
- CSV auto-mapping uses Claude to match column headers to fields.
- If a CSV column cannot be mapped, it is stored in `metadata` under its original column name.
- Batch creation processes insights sequentially through Layer 1 AI pipeline.
- User sees a progress bar during CSV processing.
- Errors on individual rows do not block the entire upload.

---

## 8. Prioritization

### 8.1 AI-Generated Score

The initial `priority_score` (0-100) is generated by Claude based on:

- **Frequency**: How many semantically similar insights exist (higher count = higher score).
- **Urgency language**: Words like "critical", "blocking", "urgent" increase the score.
- **Sentiment intensity**: Strong negative sentiment increases the score.
- **Customer context**: If metadata indicates enterprise/high-value customer, score is boosted.

### 8.2 Manual Override with RICE

The manager can manually override the AI score using RICE criteria on any insight:

| Factor | Scale | Description |
|---|---|---|
| Reach | 1-10 | How many users/customers are affected |
| Impact | 1-3 | How much it affects them (1=low, 3=high) |
| Confidence | 1-3 | How confident we are in the estimate |
| Effort | 1-10 | How much effort to address (higher = more effort) |

**RICE Score Formula:** `(Reach * Impact * Confidence) / Effort`

Normalize to 0-100 scale and replace `priority_score`.

**Acceptance criteria:**
- RICE override is optional. Most insights keep their AI score.
- When RICE is applied, the insight shows a "manually scored" indicator.
- RICE values are stored in the insight's `metadata` field.

---

## 9. Adaptiveness

The system learns from manager behavior to improve future prioritization and briefing relevance.

### 9.1 Behavior Tracking

Track the following manager actions:

- **Dismiss from briefing**: Insight type/theme was not interesting.
- **Accept from briefing**: Insight type/theme was actionable.
- **Time to action**: How quickly the manager acts on certain types.
- **Status changes**: What the manager does with insights (archive vs. close vs. relate).

Store as a simple log table:

### `manager_actions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `action_type` | `text` | NOT NULL, CHECK (`dismiss`, `accept`, `status_change`, `rice_override`) | Action type |
| `insight_id` | `uuid` | FK -> insights.id ON DELETE SET NULL, nullable | Insight reference |
| `theme_id` | `uuid` | FK -> themes.id ON DELETE SET NULL, nullable | Theme reference |
| `details` | `jsonb` | default `'{}'` | Action-specific data (e.g., `{"from_status": "open", "to_status": "closed"}`) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | When the action occurred |

### 9.2 Learning Application

During Layer 2 processing and briefing generation:

- Include recent manager actions as context for Claude.
- Prompt Claude to adjust scores and briefing priority based on patterns:
  - Themes the manager consistently dismisses get lower priority.
  - Themes the manager consistently accepts get higher priority.
  - Insight types the manager archives frequently are deprioritized in the briefing.

**Acceptance criteria:**
- The system does not auto-archive or auto-close insights. It only adjusts scores and briefing ordering.
- Manager actions are logged for all accept/dismiss/status-change events.
- Adaptiveness is visible: the briefing improves over time as the manager uses the system.

---

## 10. API

### 10.1 Public Insight Ingestion Endpoint

```
POST /api/insights
```

**Request body:**

```json
{
  "title": "Customer can't find export button",
  "description": "Multiple customers on the Enterprise plan reported difficulty finding the export functionality. They expected it in the toolbar but it's nested in a menu.",
  "source": "intercom",
  "metadata": {
    "customer": "Acme Corp",
    "plan": "enterprise",
    "contact": "jane@acme.com"
  }
}
```

**Required fields:** `title`, `description`
**Optional fields:** `source` (defaults to `"manual"`), `metadata` (defaults to `{}`)

**Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Customer can't find export button",
  "description": "Multiple customers on the Enterprise plan...",
  "source": "intercom",
  "status": "open",
  "priority_score": null,
  "sentiment": null,
  "urgency": null,
  "type": null,
  "metadata": {
    "customer": "Acme Corp",
    "plan": "enterprise",
    "contact": "jane@acme.com"
  },
  "created_at": "2026-03-10T14:30:00Z",
  "updated_at": "2026-03-10T14:30:00Z"
}
```

AI processing is queued and runs asynchronously. The response returns immediately with null AI fields.

**Error responses:**
- `400 Bad Request` -- Missing required fields.
- `422 Unprocessable Entity` -- Invalid field values.
- `500 Internal Server Error` -- Database error.

### 10.3 Pagination

All list endpoints (`GET /api/insights`, `GET /api/themes`, `GET /api/opportunities`) use offset-based pagination:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (1-indexed) |
| `per_page` | integer | 25 | Items per page (max 100) |

**Response wrapper:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total": 150,
    "total_pages": 6
  }
}
```

### 10.2 Internal API Routes

These are used by the frontend. Full CRUD as needed:

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/insights` | List insights (with filters, pagination) |
| `GET` | `/api/insights/:id` | Get single insight |
| `PATCH` | `/api/insights/:id` | Update insight (status, RICE override) |
| `DELETE` | `/api/insights/:id` | Delete insight |
| `POST` | `/api/insights/:id/reprocess` | Re-run Layer 1 AI pipeline on a single insight |
| `GET` | `/api/themes` | List themes |
| `GET` | `/api/themes/:id` | Get theme with linked insights |
| `GET` | `/api/opportunities` | List opportunities |
| `GET` | `/api/opportunities/:id` | Get opportunity with linked insights |
| `PATCH` | `/api/opportunities/:id` | Update opportunity status |
| `POST` | `/api/ingest/csv/preview` | Upload CSV, get auto-mapped column mapping + preview |
| `POST` | `/api/ingest/csv/confirm` | Confirm mapping and process all rows |
| `POST` | `/api/briefing` | Generate or retrieve cached briefing |
| `POST` | `/api/ask` | Ask a question about the insight repository |
| `POST` | `/api/process/layer2` | Trigger Layer 2 aggregate analysis |

---

## 11. CSV Upload

### 11.1 Upload Flow

1. Frontend sends CSV file as `multipart/form-data` to `POST /api/ingest/csv`.
2. Server parses the CSV and extracts headers.
3. Server sends column headers + first 3 rows to Claude for auto-mapping.
4. Claude returns a mapping: `{ "csv_column": "insight_field" }`.
5. Server returns the mapping + preview to the frontend.
6. User reviews and adjusts the mapping in the UI.
7. User confirms. Frontend sends the confirmed mapping back.
8. Server processes all rows: creates insights, queues Layer 1 processing for each.
9. Server returns a summary: total rows, successful, failed, errors.

### 11.2 Column Mapping Rules

- `title` must be mapped to exactly one column.
- `description` must be mapped to exactly one column.
- `source` is optional; if not mapped, defaults to `"csv"`.
- All unmapped columns are stored in `metadata` using the original column name as the key.

### 11.3 Error Handling

- Rows missing title or description (after mapping) are skipped.
- The system processes all valid rows and reports skipped rows with reasons.
- Maximum file size: 10MB.
- Maximum rows: 5,000 per upload.
- **Empty CSV**: If the file has headers but no data rows, return a 422 error: "CSV file contains no data rows."
- **No headers**: If the file has no discernible header row, return a 422 error: "Unable to detect column headers."
- **Encoding**: Assume UTF-8 encoding. If parsing fails, return a 422 error suggesting the user convert to UTF-8.
- **Duplicate rows within CSV**: Process all rows; duplicate detection happens in Layer 1 via embeddings, not at upload time.
- **Concurrent uploads**: For MVP, only one CSV upload can be processed at a time. If another is in progress, return 429 Too Many Requests.

---

## 12. Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (for client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for server-side) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `VOYAGE_API_KEY` | Voyage AI API key for embeddings (if using Voyage; omit if using OpenAI) |
| `OPENAI_API_KEY` | OpenAI API key for embeddings (if using OpenAI; omit if using Voyage) |
| `EMBEDDING_PROVIDER` | Which embedding provider to use: `voyage` or `openai`. Defaults to `voyage`. |
| `CRON_SECRET` | Secret token to authenticate Vercel Cron requests to `/api/process/layer2` |

---

## 13. Non-Functional Requirements

- **Performance**: Pages load within 2 seconds. AI-powered features (briefing, ask) within 10 seconds.
- **Data limits for MVP**: Tested with up to 10,000 insights, 100 themes, 50 opportunities.
- **Browser support**: Latest Chrome, Firefox, Safari, Edge.
- **Responsive**: Desktop-first. Usable on tablet. Mobile is not a priority for MVP.
- **Error handling**: All AI failures are graceful. If Claude is unavailable, the app works without AI features (insights are stored, just not enriched).

---

## 14. Out of Scope for MVP

- Authentication and authorization
- Multi-tenancy
- Real-time updates (WebSockets)
- Email notifications
- Integrations beyond the API endpoint (no direct Intercom/Zendesk/Slack connectors)
- Export functionality
- Audit log
- Dark mode

---

## 15. Implementation Order

Suggested phasing for development:

**Phase 1 -- Foundation**
1. Project setup (Next.js, Supabase, Tailwind)
2. Database schema (all tables, extensions, triggers)
3. Basic CRUD API routes for insights
4. Manual insight creation form
5. Insights list view with filters

**Phase 2 -- AI Pipeline**
6. Layer 1: Embedding generation
7. Layer 1: Duplicate detection
8. Layer 1: Theme classification
9. Layer 1: Enrichment (sentiment, urgency, type)
10. Layer 1: Priority scoring

**Phase 3 -- Themes and Opportunities**
11. Themes CRUD and view
12. Opportunities CRUD and view
13. Layer 2: Aggregate analysis

**Phase 4 -- Intelligence**
14. Briefing page with accept/dismiss
15. Ask the System
16. CSV upload with auto-mapping
17. Adaptiveness (behavior tracking + learning)

**Phase 5 -- Polish**
18. RICE manual override
19. Bulk actions
20. Error states, loading states, empty states
21. Performance optimization

---

## Review Notes

**Reviewed by:** spec-reviewer
**Review date:** 2026-03-10
**Spec version updated to:** 1.1 (from 1.0)

### Issues Found and Fixed

#### 1. Embedding Model Not Specified (Ambiguity)
- **Section 6.1, Step 1** said "Call an embedding model" without specifying which one.
- **Fix**: Specified Voyage AI `voyage-3` (1024 dimensions) as the primary choice, with OpenAI `text-embedding-3-small` (1536 dimensions) as a documented alternative. Added `EMBEDDING_PROVIDER`, `VOYAGE_API_KEY`, and `OPENAI_API_KEY` to environment variables.
- Updated the `vector()` dimension in the schema from hardcoded 1536 to 1024 with a note that it depends on the chosen model.

#### 2. Missing Database Indexes (Performance Gap)
- **Section 4.6** only specified the embedding vector index.
- **Fix**: Added a full index table (Section 4.6) covering `status`, `created_at`, `priority_score`, `source` on insights; `aggregated_score` on themes; and `created_at`, `action_type` on manager_actions.

#### 3. `manager_actions` Table Missing Constraints (Data Model Gap)
- The table in Section 9.1 lacked proper column definitions (no PK default, no NOT NULL, no CHECK, no ON DELETE behavior).
- **Fix**: Added full constraints including `gen_random_uuid()` default, NOT NULL on `action_type`, CHECK constraint on allowed values, ON DELETE SET NULL for FKs, and `default now()` on `created_at`.

#### 4. Orphaned "Layer 3" Reference (Ambiguity)
- **Section 5.1** referenced "Layer 3" without context. The AI pipeline only defines Layers 1-3 in Section 6 but Section 5.1 doesn't clarify this is the Intelligent Briefing.
- **Fix**: Added explicit cross-reference: "Layer 3 (Intelligent Briefing, see Section 6.3)".

#### 5. CSV Upload API Is Single Endpoint But Requires Two Steps (Contradiction)
- **Section 11.1** describes a two-step flow (preview + confirm) but **Section 10.2** only listed one endpoint (`POST /api/ingest/csv`).
- **Fix**: Split into `POST /api/ingest/csv/preview` and `POST /api/ingest/csv/confirm`.

#### 6. Missing Briefing Response Schema (Implementation Gap)
- **Section 7.2** described accept/dismiss actions but never defined what the briefing API returns, making it impossible to implement the frontend.
- **Fix**: Added a full JSON response schema for `POST /api/briefing` including `suggested_action.type` definitions with their params.

#### 7. Duplicate Theme Prevention Not Addressed (Missing Edge Case)
- **Section 6.1, Step 3** didn't address what happens if Claude suggests a theme name that's a case-variation or semantic duplicate of an existing theme.
- **Fix**: Added case-insensitive name matching and semantic similarity check before creating new themes.

#### 8. Missing Detail View Routes (Implementation Gap)
- **Section 7.1** only listed list-level routes. Theme detail, opportunity detail, and insight detail views were referenced in Sections 7.3-7.5 but had no routes.
- **Fix**: Added `/explorer/themes/:id`, `/explorer/opportunities/:id`, and `/explorer/insights/:id` to the navigation structure.

#### 9. "Ask the System" Lacks Retrieval Details (Implementation Gap)
- **Section 6.3** said "retrieves relevant insights using semantic search" but didn't specify how many results, what similarity threshold, or how the question embedding is generated.
- **Fix**: Specified top 20 results, cosine similarity > 0.7 threshold, and same embedding model as insights.

#### 10. No Retry/Reprocess Mechanism for Failed AI Processing (Missing Edge Case)
- The spec said insights with failed AI remain with null fields but provided no way to retry.
- **Fix**: Added `POST /api/insights/:id/reprocess` endpoint and documented retry behavior with exponential backoff for Claude API errors.

#### 11. Missing Pagination Specification (Implementation Gap)
- List API endpoints referenced pagination but never defined the format.
- **Fix**: Added Section 10.3 with offset-based pagination parameters and response wrapper schema.

#### 12. Briefing Cache Invalidation Not Defined (Ambiguity)
- "Don't re-call AI if data hasn't changed in the last 5 minutes" was vague about how to detect changes.
- **Fix**: Specified cache key based on `MAX(updated_at)` across insights, themes, and opportunities.

#### 13. `insight_count` on Themes Is Denormalized But Has No Sync Mechanism (Data Model Gap)
- The `insight_count` column on themes would get out of sync without explicit management.
- **Fix**: Added note that it must be updated via trigger or application logic when `insight_themes` rows change.

#### 14. Opportunities Not Linked to Themes (Data Model Gap)
- Opportunities are generated from theme clusters (Section 6.2) but had no FK to themes.
- **Fix**: Added `theme_id` FK on `opportunities` table.

#### 15. Missing CHECK Constraints on Several Enum Columns
- `trend` on themes, `status` and `estimated_impact` on opportunities lacked CHECK constraints despite other enum columns having them specified.
- **Fix**: Added CHECK constraints to all enum-like columns.

#### 16. Layer 2 Trigger Threshold Ambiguous
- "10+ new insights or daily" was unclear about what "new" means and how it's tracked.
- **Fix**: Simplified to daily Vercel Cron trigger at midnight UTC with manual API override. Added `CRON_SECRET` for authentication.

#### 17. "Last Briefing" Time Reference Undefined
- Section 6.3 references "new insights since last briefing" but doesn't define how to determine when the last briefing was generated.
- **Fix**: Specified using `generated_at` from cached briefing, falling back to last 24 hours.

#### 18. AI Calls Should Use Structured Output
- The spec didn't specify how to ensure Claude returns valid structured data.
- **Fix**: Added note that all Claude calls should use JSON mode with schema validation and one retry on parse failure.

#### 19. Combined Claude Calls for Efficiency
- Steps 3, 4, 5 in Layer 1 each make separate Claude calls but could be combined.
- **Fix**: Added implementation note suggesting combining theme classification, enrichment, and priority scoring into a single API call.

#### 20. First-Time User Experience (Missing Edge Case)
- No specification for what happens when a user opens the app with 0 insights.
- **Fix**: Added onboarding empty state for the briefing page directing users to `/ingest`.

#### 21. Status Changed from "Approved" to "Draft"
- The spec was marked "Approved" but hadn't been reviewed yet.
- **Fix**: Changed to "Draft" with version 1.1 to reflect the review cycle.
