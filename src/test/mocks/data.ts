import type { Insight, Theme, Opportunity, ManagerAction, BriefingItem } from '@/lib/types'

let counter = 0
function nextId(): string {
  counter++
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`
}

export function resetIdCounter() {
  counter = 0
}

export function createMockInsight(overrides: Partial<Insight> = {}): Insight {
  const id = overrides.id ?? nextId()
  return {
    id,
    title: `Test Insight ${id.slice(-4)}`,
    description: 'This is a test insight description.',
    source: 'zendesk',
    status: 'open',
    priority_score: 50,
    sentiment: 'neutral',
    urgency: 'medium',
    type: 'feature_request',
    embedding: null,
    metadata: {},
    org_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockTheme(overrides: Partial<Theme> = {}): Theme {
  const id = overrides.id ?? nextId()
  return {
    id,
    name: `Test Theme ${id.slice(-4)}`,
    description: 'A test theme description.',
    insight_count: 5,
    aggregated_score: 60,
    trend: 'stable',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  const id = overrides.id ?? nextId()
  return {
    id,
    title: `Test Opportunity ${id.slice(-4)}`,
    description: 'A test opportunity description.',
    estimated_impact: 'medium',
    theme_id: null,
    status: 'identified',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockManagerAction(overrides: Partial<ManagerAction> = {}): ManagerAction {
  const id = overrides.id ?? nextId()
  return {
    id,
    action_type: 'accept',
    insight_id: null,
    theme_id: null,
    details: {},
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockBriefingItem(overrides: Partial<BriefingItem> = {}): BriefingItem {
  return {
    id: overrides.id ?? `briefing-item-${nextId().slice(-4)}`,
    description: 'A test briefing item.',
    suggested_action: {
      label: 'Investigate this insight',
      type: 'investigate',
      params: { insight_id: nextId() },
    },
    related_insight_ids: [],
    priority: 1,
    ...overrides,
  }
}
