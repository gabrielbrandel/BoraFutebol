export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  errors?: string[]
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message }
}

export function fail(message: string, errors?: string[]): ApiResponse<null> {
  return { success: false, data: null, message, errors }
}

export function paginate<T>(items: T[], page: number, pageSize: number, totalCount: number): PagedResult<T> {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1
  }
}

export function parsePagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
  const search = query.search?.trim() || undefined
  return { page, pageSize, search }
}
