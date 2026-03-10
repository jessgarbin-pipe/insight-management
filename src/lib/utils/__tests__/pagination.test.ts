import { describe, it, expect } from 'vitest'
import { parsePagination, paginationMeta } from '../pagination'

describe('parsePagination', () => {
  it('returns defaults when no params are provided', () => {
    const params = new URLSearchParams()
    const result = parsePagination(params)
    expect(result).toEqual({ page: 1, per_page: 25, offset: 0 })
  })

  it('parses page and per_page from search params', () => {
    const params = new URLSearchParams({ page: '3', per_page: '10' })
    const result = parsePagination(params)
    expect(result).toEqual({ page: 3, per_page: 10, offset: 20 })
  })

  it('clamps page to minimum of 1', () => {
    const params = new URLSearchParams({ page: '-5' })
    const result = parsePagination(params)
    expect(result.page).toBe(1)
  })

  it('clamps page to 1 for zero', () => {
    const params = new URLSearchParams({ page: '0' })
    const result = parsePagination(params)
    expect(result.page).toBe(1)
  })

  it('clamps per_page to minimum of 1', () => {
    const params = new URLSearchParams({ per_page: '0' })
    const result = parsePagination(params)
    expect(result.per_page).toBe(1)
  })

  it('clamps per_page to maximum of 100', () => {
    const params = new URLSearchParams({ per_page: '500' })
    const result = parsePagination(params)
    expect(result.per_page).toBe(100)
  })

  it('calculates correct offset for page 5 with 20 per_page', () => {
    const params = new URLSearchParams({ page: '5', per_page: '20' })
    const result = parsePagination(params)
    expect(result.offset).toBe(80)
  })

  it('handles non-numeric page value', () => {
    const params = new URLSearchParams({ page: 'abc' })
    const result = parsePagination(params)
    // parseInt('abc') returns NaN, Math.max(1, NaN) returns NaN
    expect(result.page).toBeNaN()
  })
})

describe('paginationMeta', () => {
  it('calculates total_pages correctly', () => {
    const result = paginationMeta(1, 25, 100)
    expect(result).toEqual({
      page: 1,
      per_page: 25,
      total: 100,
      total_pages: 4,
    })
  })

  it('rounds total_pages up for partial pages', () => {
    const result = paginationMeta(1, 25, 101)
    expect(result.total_pages).toBe(5)
  })

  it('returns 1 total_page when total is less than per_page', () => {
    const result = paginationMeta(1, 25, 10)
    expect(result.total_pages).toBe(1)
  })

  it('returns 0 total_pages when total is 0', () => {
    const result = paginationMeta(1, 25, 0)
    expect(result.total_pages).toBe(0)
  })
})
