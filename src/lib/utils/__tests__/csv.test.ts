import { describe, it, expect } from 'vitest'
import { autoMapColumns, applyMapping } from '../csv'

describe('autoMapColumns', () => {
  it('maps standard field names correctly', () => {
    const mapping = autoMapColumns(['title', 'description', 'source'])
    expect(mapping).toEqual({
      title: 'title',
      description: 'description',
      source: 'source',
    })
  })

  it('maps synonym "name" to title', () => {
    const mapping = autoMapColumns(['name', 'feedback', 'origin'])
    expect(mapping.name).toBe('title')
    expect(mapping.feedback).toBe('description')
    expect(mapping.origin).toBe('source')
  })

  it('maps synonym "subject" to title', () => {
    const mapping = autoMapColumns(['subject', 'body', 'channel'])
    expect(mapping.subject).toBe('title')
    expect(mapping.body).toBe('description')
    expect(mapping.channel).toBe('source')
  })

  it('maps unmapped columns to metadata', () => {
    const mapping = autoMapColumns(['title', 'description', 'customer_id', 'date'])
    expect(mapping.customer_id).toBe('metadata')
    expect(mapping.date).toBe('metadata')
  })

  it('prevents duplicate field assignments', () => {
    // "name" and "subject" are both synonyms for "title"
    // Only the first encountered should be mapped to "title"
    const mapping = autoMapColumns(['name', 'subject', 'description'])
    const titleMappings = Object.values(mapping).filter(v => v === 'title')
    expect(titleMappings).toHaveLength(1)
    expect(mapping.name).toBe('title')
    // "subject" should fall to metadata since "title" is taken
    expect(mapping.subject).toBe('metadata')
  })

  it('handles case-insensitive matching', () => {
    // The normalizer lowercases, so Title -> title
    const mapping = autoMapColumns(['Title', 'Description', 'Source'])
    expect(mapping['Title']).toBe('title')
    expect(mapping['Description']).toBe('description')
    expect(mapping['Source']).toBe('source')
  })

  it('handles columns with spaces, dashes, and underscores', () => {
    const mapping = autoMapColumns(['user_feedback', 'customer-notes'])
    // These don't directly match synonyms after normalization since
    // "userfeedback" !== "feedback" and "customernotes" !== "notes"
    // Let's verify — "feedback" synonym normalizes to "feedback", "user_feedback" normalizes to "userfeedback"
    // so "user_feedback" won't match "feedback"
    expect(mapping['user_feedback']).toBe('metadata')
  })

  it('maps "comments" to description', () => {
    const mapping = autoMapColumns(['heading', 'comments'])
    expect(mapping.heading).toBe('title')
    expect(mapping.comments).toBe('description')
  })

  it('returns all metadata for completely unrecognized headers', () => {
    const mapping = autoMapColumns(['col_a', 'col_b', 'col_c'])
    expect(mapping).toEqual({
      col_a: 'metadata',
      col_b: 'metadata',
      col_c: 'metadata',
    })
  })
})

describe('applyMapping', () => {
  it('maps row values according to mapping', () => {
    const row = { 'Title': 'Bug report', 'Body': 'App crashes', 'Channel': 'slack' }
    const mapping = { 'Title': 'title', 'Body': 'description', 'Channel': 'source' }
    const result = applyMapping(row, mapping)
    expect(result).toEqual({
      title: 'Bug report',
      description: 'App crashes',
      source: 'slack',
      metadata: {},
    })
  })

  it('puts unmapped columns into metadata', () => {
    const row = { 'name': 'Issue', 'text': 'Details', 'customer': 'Acme' }
    const mapping = { 'name': 'title', 'text': 'description', 'customer': 'metadata' }
    const result = applyMapping(row, mapping)
    expect(result.title).toBe('Issue')
    expect(result.description).toBe('Details')
    expect(result.metadata).toEqual({ customer: 'Acme' })
  })

  it('defaults source to "csv" when no source mapping', () => {
    const row = { 'title': 'Test' }
    const mapping = { 'title': 'title' }
    const result = applyMapping(row, mapping)
    expect(result.source).toBe('csv')
  })

  it('defaults source to "csv" when source value is empty', () => {
    const row = { 'title': 'Test', 'origin': '' }
    const mapping = { 'title': 'title', 'origin': 'source' }
    const result = applyMapping(row, mapping)
    expect(result.source).toBe('csv')
  })

  it('returns undefined title and description when not mapped', () => {
    const row = { 'extra': 'data' }
    const mapping = { 'extra': 'metadata' }
    const result = applyMapping(row, mapping)
    expect(result.title).toBeUndefined()
    expect(result.description).toBeUndefined()
  })

  it('handles null/undefined row values gracefully', () => {
    const row = { 'title': undefined as unknown as string, 'desc': null as unknown as string }
    const mapping = { 'title': 'title', 'desc': 'description' }
    const result = applyMapping(row, mapping)
    // Both should be skipped since the values are null/undefined
    expect(result.title).toBeUndefined()
    expect(result.description).toBeUndefined()
  })
})
