import type { Insight } from "../App";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-800",
  negative: "bg-red-100 text-red-800",
  neutral: "bg-gray-100 text-gray-800",
  mixed: "bg-yellow-100 text-yellow-800",
};

const IMPORTANCE_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  low: "bg-gray-100 text-gray-600",
};

const SOURCE_LABELS: Record<string, string> = {
  api: "API",
  slack: "Slack",
  csv_import: "CSV",
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  return date.toLocaleDateString("pt-BR");
}

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {insight.aiSummary && (
            <p className="text-sm font-medium text-gray-900 mb-1">
              {insight.aiSummary}
            </p>
          )}
          <p className="text-sm text-gray-600 line-clamp-3">{insight.content}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-gray-400">{timeAgo(insight.createdAt)}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
            {SOURCE_LABELS[insight.source] || insight.source}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {insight.themes.map((theme) => (
          <span
            key={theme.themeId}
            className={`text-xs px-2 py-0.5 rounded-full ${
              theme.isPrimary
                ? "bg-blue-100 text-blue-800 font-medium"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {theme.themeName}
            {theme.confidence != null && (
              <span className="ml-1 opacity-60">{theme.confidence}%</span>
            )}
          </span>
        ))}

        {insight.sentiment && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              SENTIMENT_COLORS[insight.sentiment] || ""
            }`}
          >
            {insight.sentiment === "positive" && "Positivo"}
            {insight.sentiment === "negative" && "Negativo"}
            {insight.sentiment === "neutral" && "Neutro"}
            {insight.sentiment === "mixed" && "Misto"}
          </span>
        )}

        {insight.importance && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              IMPORTANCE_COLORS[insight.importance] || ""
            }`}
          >
            {insight.importance === "critical" && "Critico"}
            {insight.importance === "high" && "Alto"}
            {insight.importance === "medium" && "Medio"}
            {insight.importance === "low" && "Baixo"}
          </span>
        )}

        {insight.customerCompany && (
          <span className="text-xs text-gray-500 ml-auto">
            {insight.customerCompany}
            {insight.customerName && ` — ${insight.customerName}`}
          </span>
        )}
      </div>
    </div>
  );
}
