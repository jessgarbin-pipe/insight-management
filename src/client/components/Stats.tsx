import { useState, useEffect } from "react";

interface StatsData {
  total: number;
  bySource: Array<{ source: string; count: number }>;
  bySentiment: Array<{ sentiment: string | null; count: number }>;
  topThemes: Array<{ themeName: string; themeColor: string | null; count: number }>;
}

const SOURCE_LABELS: Record<string, string> = {
  api: "API",
  slack: "Slack",
  csv_import: "CSV",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positivo",
  negative: "Negativo",
  neutral: "Neutro",
  mixed: "Misto",
};

export function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/stats/summary")
      .then((r) => r.json() as Promise<StatsData>)
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats || stats.total === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        <p className="text-xs text-gray-500 mt-1">Total de insights</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-1">
          {stats.bySource.map((s) => (
            <div key={s.source} className="flex justify-between text-sm">
              <span className="text-gray-600">{SOURCE_LABELS[s.source] || s.source}</span>
              <span className="font-medium">{s.count}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Por fonte</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-1">
          {stats.bySentiment
            .filter((s) => s.sentiment)
            .map((s) => (
              <div key={s.sentiment} className="flex justify-between text-sm">
                <span className="text-gray-600">{SENTIMENT_LABELS[s.sentiment!] || s.sentiment}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Por sentimento</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-1">
          {stats.topThemes.slice(0, 4).map((t) => (
            <div key={t.themeName} className="flex justify-between text-sm">
              <span className="text-gray-600 truncate mr-2">{t.themeName}</span>
              <span className="font-medium shrink-0">{t.count}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Top temas</p>
      </div>
    </div>
  );
}
