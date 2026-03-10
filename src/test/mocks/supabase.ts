import { vi } from 'vitest'

type FilterFn = (...args: unknown[]) => QueryBuilder
type QueryBuilder = {
  select: FilterFn
  insert: FilterFn
  update: FilterFn
  upsert: FilterFn
  delete: FilterFn
  eq: FilterFn
  neq: FilterFn
  gt: FilterFn
  gte: FilterFn
  lt: FilterFn
  lte: FilterFn
  ilike: FilterFn
  in: FilterFn
  not: FilterFn
  is: FilterFn
  order: FilterFn
  limit: FilterFn
  single: () => Promise<{ data: unknown; error: unknown }>
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>
  then: (resolve: (value: { data: unknown; error: unknown; count?: number | null }) => void) => void
  rpc: FilterFn
}

interface MockQueryResult {
  data?: unknown
  error?: unknown
  count?: number | null
}

/**
 * Create a chainable mock Supabase query builder.
 * Call `mockResult()` to set what the terminal methods return.
 */
export function createMockQueryBuilder(result: MockQueryResult = { data: null, error: null }): QueryBuilder {
  const builder: QueryBuilder = {} as QueryBuilder

  const chainMethods: (keyof QueryBuilder)[] = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'ilike', 'in', 'not', 'is',
    'order', 'limit', 'rpc',
  ]

  for (const method of chainMethods) {
    (builder as Record<string, unknown>)[method] = vi.fn().mockReturnValue(builder)
  }

  builder.single = vi.fn().mockResolvedValue(result)
  builder.maybeSingle = vi.fn().mockResolvedValue(result)

  // When awaited directly (no .single()/.maybeSingle()), resolve with result
  builder.then = ((resolve: (value: MockQueryResult) => void) => {
    resolve(result)
  }) as QueryBuilder['then']

  return builder
}

/**
 * Create a mock Supabase client with `from()` and `rpc()` methods.
 * Use `mockTable()` to configure per-table return values.
 */
export function createMockSupabaseClient() {
  const tableBuilders = new Map<string, QueryBuilder>()

  const client = {
    from: vi.fn((table: string) => {
      if (tableBuilders.has(table)) {
        return tableBuilders.get(table)!
      }
      return createMockQueryBuilder()
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  return {
    client,
    /**
     * Configure the mock result for a specific table name.
     */
    mockTable(table: string, result: MockQueryResult): QueryBuilder {
      const builder = createMockQueryBuilder(result)
      tableBuilders.set(table, builder)
      return builder
    },
  }
}
