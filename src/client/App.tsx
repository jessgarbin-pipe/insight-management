import { useState, useEffect, useCallback } from "react";
import { Filters } from "./components/Filters";
import { InsightList } from "./components/InsightList";
import { Stats } from "./components/Stats";

export interface Theme {
  themeId: string;
  themeName: string;
  confidence: number | null;
  isPrimary: boolean | null;
}

export interface Insight {
  id: string;
  content: string;
  source: string;
  customerName: string | null;
  customerCompany: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  importance: string | null;
  status: string;
  aiSummary: string | null;
  createdAt: string;
  themes: Theme[];
}

export interface FiltersState {
  search: string;
  theme: string;
  source: string;
  sentiment: string;
  importance: string;
  status: string;
}

const EMPTY_FILTERS: FiltersState = {
  search: "",
  theme: "",
  source: "",
  sentiment: "",
  importance: "",
  status: "",
};

export default function App() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [themes, setThemes] = useState<Array<{ id: string; name: string; color: string | null; insightCount: number }>>([]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (filters.search) params.set("search", filters.search);
    if (filters.theme) params.set("theme", filters.theme);
    if (filters.source) params.set("source", filters.source);
    if (filters.sentiment) params.set("sentiment", filters.sentiment);
    if (filters.importance) params.set("importance", filters.importance);
    if (filters.status) params.set("status", filters.status);

    try {
      const res = await fetch(`/api/insights?${params}`);
      const data = (await res.json()) as { data: Insight[]; total: number };
      setInsights(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchThemes = useCallback(async () => {
    try {
      const res = await fetch("/api/themes?status=active");
      const data = (await res.json()) as { data: typeof themes };
      setThemes(data.data || []);
    } catch (err) {
      console.error("Failed to fetch themes:", err);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleFilterChange = (newFilters: FiltersState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Insight Management</h1>
            <p className="text-sm text-gray-500">Repositorio centralizado de insights de produto</p>
          </div>
          <div className="text-sm text-gray-400">{total} insights</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <Stats />

        <Filters
          filters={filters}
          themes={themes}
          onChange={handleFilterChange}
          onReset={() => handleFilterChange(EMPTY_FILTERS)}
        />

        <InsightList insights={insights} loading={loading} />

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-100"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Pagina {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-100"
            >
              Proxima
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
