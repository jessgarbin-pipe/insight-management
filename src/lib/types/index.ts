export interface Insight {
  id: string;
  title: string;
  description: string;
  source: string;
  status: "open" | "related" | "closed" | "archived";
  priority_score: number | null;
  sentiment: "positive" | "negative" | "neutral" | null;
  urgency: "high" | "medium" | "low" | null;
  type: "bug" | "feature_request" | "praise" | "question" | null;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string | null;
  insight_count: number;
  aggregated_score: number | null;
  trend: "growing" | "stable" | "declining" | null;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  estimated_impact: "high" | "medium" | "low" | null;
  theme_id: string | null;
  status: "identified" | "evaluating" | "approved" | "discarded";
  created_at: string;
  updated_at: string;
}

export interface ManagerAction {
  id: string;
  action_type: "dismiss" | "accept" | "status_change" | "rice_override";
  insight_id: string | null;
  theme_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface BriefingResponse {
  summary: string;
  generated_at: string;
  cached: boolean;
  items: BriefingItem[];
}

export interface BriefingItem {
  id: string;
  description: string;
  suggested_action: {
    label: string;
    type:
      | "change_status"
      | "create_opportunity"
      | "link_to_opportunity"
      | "archive_theme"
      | "investigate";
    params: Record<string, unknown>;
  };
  related_insight_ids: string[];
  priority: number;
}
