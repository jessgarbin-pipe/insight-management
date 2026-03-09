import type { FiltersState } from "../App";

interface FiltersProps {
  filters: FiltersState;
  themes: Array<{ id: string; name: string; color: string | null; insightCount: number }>;
  onChange: (filters: FiltersState) => void;
  onReset: () => void;
}

export function Filters({ filters, themes, onChange, onReset }: FiltersProps) {
  const update = (key: keyof FiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-700">Filtros</h2>
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <input
          type="text"
          placeholder="Buscar..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="col-span-2 md:col-span-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={filters.theme}
          onChange={(e) => update("theme", e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os temas</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.insightCount})
            </option>
          ))}
        </select>

        <select
          value={filters.source}
          onChange={(e) => update("source", e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as fontes</option>
          <option value="api">API</option>
          <option value="slack">Slack</option>
          <option value="csv_import">CSV Import</option>
        </select>

        <select
          value={filters.sentiment}
          onChange={(e) => update("sentiment", e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sentimento</option>
          <option value="positive">Positivo</option>
          <option value="negative">Negativo</option>
          <option value="neutral">Neutro</option>
          <option value="mixed">Misto</option>
        </select>

        <select
          value={filters.importance}
          onChange={(e) => update("importance", e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Importancia</option>
          <option value="critical">Critico</option>
          <option value="high">Alto</option>
          <option value="medium">Medio</option>
          <option value="low">Baixo</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Status</option>
          <option value="new">Novo</option>
          <option value="classified">Classificado</option>
          <option value="reviewed">Revisado</option>
          <option value="actioned">Acionado</option>
          <option value="archived">Arquivado</option>
        </select>
      </div>
    </div>
  );
}
