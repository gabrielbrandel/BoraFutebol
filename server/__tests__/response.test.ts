import { describe, it, expect } from 'vitest'
import { paginate, parsePagination } from '../lib/response.js'

describe('response helpers', () => {
  it('pagina resultados corretamente', () => {
    const page = paginate(['a', 'b'], 1, 2, 5)
    expect(page.items).toEqual(['a', 'b'])
    expect(page.totalCount).toBe(5)
    expect(page.totalPages).toBe(3)
    expect(page.hasNext).toBe(true)
    expect(page.hasPrevious).toBe(false)
  })

  it('parsePagination limita pageSize a 50', () => {
    expect(parsePagination({ page: '2', pageSize: '100' })).toEqual({
      page: 2,
      pageSize: 50,
      search: undefined
    })
  })
})
