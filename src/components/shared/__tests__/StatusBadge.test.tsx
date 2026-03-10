import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders the value as text', () => {
    render(<StatusBadge value="open" />)
    expect(screen.getByText('open')).toBeInTheDocument()
  })

  it('replaces underscores with spaces in display text', () => {
    render(<StatusBadge value="feature_request" />)
    expect(screen.getByText('feature request')).toBeInTheDocument()
  })

  it('applies correct color class for "open" status', () => {
    render(<StatusBadge value="open" />)
    const badge = screen.getByText('open')
    expect(badge.className).toContain('bg-blue-100')
    expect(badge.className).toContain('text-blue-800')
  })

  it('applies correct color class for "closed" status', () => {
    render(<StatusBadge value="closed" />)
    const badge = screen.getByText('closed')
    expect(badge.className).toContain('bg-green-100')
    expect(badge.className).toContain('text-green-800')
  })

  it('applies correct color class for "archived" status', () => {
    render(<StatusBadge value="archived" />)
    const badge = screen.getByText('archived')
    expect(badge.className).toContain('bg-muted')
    expect(badge.className).toContain('text-muted-foreground')
  })

  it('applies correct color class for "high" urgency', () => {
    render(<StatusBadge value="high" />)
    const badge = screen.getByText('high')
    expect(badge.className).toContain('text-destructive')
  })

  it('applies correct color class for "positive" sentiment', () => {
    render(<StatusBadge value="positive" />)
    const badge = screen.getByText('positive')
    expect(badge.className).toContain('bg-green-100')
  })

  it('applies correct color class for "negative" sentiment', () => {
    render(<StatusBadge value="negative" />)
    const badge = screen.getByText('negative')
    expect(badge.className).toContain('text-destructive')
  })

  it('applies correct color class for "neutral" sentiment', () => {
    render(<StatusBadge value="neutral" />)
    const badge = screen.getByText('neutral')
    expect(badge.className).toContain('bg-muted')
  })

  it('applies correct color class for "related" status', () => {
    render(<StatusBadge value="related" />)
    const badge = screen.getByText('related')
    expect(badge.className).toContain('bg-yellow-100')
    expect(badge.className).toContain('text-yellow-800')
  })

  it('renders without error for unknown status values', () => {
    render(<StatusBadge value="unknown_status" />)
    expect(screen.getByText('unknown status')).toBeInTheDocument()
  })

  it('applies additional className when provided', () => {
    render(<StatusBadge value="open" className="extra-class" />)
    const badge = screen.getByText('open')
    expect(badge.className).toContain('extra-class')
  })
})
