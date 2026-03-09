import type { Insight } from "../App";
import { InsightCard } from "./InsightCard";

interface InsightListProps {
  insights: Insight[];
  loading: boolean;
}

export function InsightList({ insights, loading }: InsightListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-full mb-1" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-sm">Nenhum insight encontrado.</p>
        <p className="text-gray-400 text-xs mt-1">
          Envie insights via webhook API ou importe um CSV.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
