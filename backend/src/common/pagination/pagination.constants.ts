export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
}

export function normalizePagination(
  page?: number,
  limit?: number,
): NormalizedPagination {
  const safePage =
    Number.isFinite(page) && (page as number) > 0
      ? Math.floor(page as number)
      : DEFAULT_PAGE;

  const requestedLimit =
    Number.isFinite(limit) && (limit as number) > 0
      ? Math.floor(limit as number)
      : DEFAULT_PAGE_LIMIT;

  const safeLimit = Math.min(requestedLimit, MAX_PAGE_LIMIT);

  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}
