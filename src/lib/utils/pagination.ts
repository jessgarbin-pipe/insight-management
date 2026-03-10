export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const per_page = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("per_page") || "25"))
  );
  const offset = (page - 1) * per_page;
  return { page, per_page, offset };
}

export function paginationMeta(
  page: number,
  per_page: number,
  total: number
) {
  return {
    page,
    per_page,
    total,
    total_pages: Math.ceil(total / per_page),
  };
}
