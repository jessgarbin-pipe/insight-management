import { describe, it, expect } from 'vitest'
import { validateRequired, validateEnum, validateNumericRange } from '../validation'

describe('validateRequired', () => {
  it('returns valid when all required fields are present', () => {
    const body = { name: 'test', email: 'test@example.com' }
    const result = validateRequired(body, ['name', 'email'])
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('returns errors for missing fields (undefined)', () => {
    const body = { name: 'test' }
    const result = validateRequired(body, ['name', 'email'])
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(['email is required'])
  })

  it('returns errors for null fields', () => {
    const body = { name: null }
    const result = validateRequired(body as Record<string, unknown>, ['name'])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name is required')
  })

  it('returns errors for empty string fields', () => {
    const body = { name: '' }
    const result = validateRequired(body, ['name'])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name is required')
  })

  it('returns multiple errors for multiple missing fields', () => {
    const body = {}
    const result = validateRequired(body, ['title', 'description', 'source'])
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(3)
  })

  it('allows zero as a valid value', () => {
    const body = { count: 0 }
    const result = validateRequired(body, ['count'])
    expect(result.valid).toBe(true)
  })

  it('allows false as a valid value', () => {
    const body = { active: false }
    const result = validateRequired(body, ['active'])
    expect(result.valid).toBe(true)
  })
})

describe('validateEnum', () => {
  const allowed = ['open', 'closed', 'archived'] as const

  it('returns true for a valid enum value', () => {
    expect(validateEnum('open', allowed)).toBe(true)
  })

  it('returns false for an invalid enum value', () => {
    expect(validateEnum('deleted', allowed)).toBe(false)
  })

  it('returns false for a number', () => {
    expect(validateEnum(42, allowed)).toBe(false)
  })

  it('returns false for null', () => {
    expect(validateEnum(null, allowed)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(validateEnum(undefined, allowed)).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(validateEnum('Open', allowed)).toBe(false)
  })
})

describe('validateNumericRange', () => {
  it('returns true for a value within range', () => {
    expect(validateNumericRange(50, 0, 100)).toBe(true)
  })

  it('returns true for the minimum boundary', () => {
    expect(validateNumericRange(0, 0, 100)).toBe(true)
  })

  it('returns true for the maximum boundary', () => {
    expect(validateNumericRange(100, 0, 100)).toBe(true)
  })

  it('returns false for a value below range', () => {
    expect(validateNumericRange(-1, 0, 100)).toBe(false)
  })

  it('returns false for a value above range', () => {
    expect(validateNumericRange(101, 0, 100)).toBe(false)
  })

  it('returns true for null (optional)', () => {
    expect(validateNumericRange(null, 0, 100)).toBe(true)
  })

  it('returns true for undefined (optional)', () => {
    expect(validateNumericRange(undefined, 0, 100)).toBe(true)
  })

  it('handles string numbers correctly', () => {
    expect(validateNumericRange('50', 0, 100)).toBe(true)
  })

  it('returns false for NaN-producing values', () => {
    expect(validateNumericRange('abc', 0, 100)).toBe(false)
  })
})
