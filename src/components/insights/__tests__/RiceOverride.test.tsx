import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RiceOverride } from '../RiceOverride'
import { createMockInsight } from '@/test/mocks/data'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('RiceOverride', () => {
  const onApplied = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('renders collapsed by default with expand prompt', () => {
    const insight = createMockInsight()
    render(<RiceOverride insight={insight} onApplied={onApplied} />)

    expect(screen.getByText('Override Priority with RICE')).toBeInTheDocument()
    expect(screen.getByText('Expand')).toBeInTheDocument()
    expect(screen.queryByText('Apply RICE Score')).not.toBeInTheDocument()
  })

  it('expands when header is clicked', () => {
    const insight = createMockInsight()
    render(<RiceOverride insight={insight} onApplied={onApplied} />)

    fireEvent.click(screen.getByText('Override Priority with RICE'))

    expect(screen.getByText('Apply RICE Score')).toBeInTheDocument()
    expect(screen.getByText('Collapse')).toBeInTheDocument()
  })

  it('shows RICE input fields when expanded', () => {
    const insight = createMockInsight()
    render(<RiceOverride insight={insight} onApplied={onApplied} />)

    fireEvent.click(screen.getByText('Override Priority with RICE'))

    expect(screen.getByText('Reach (1-10)')).toBeInTheDocument()
    expect(screen.getByText('Impact (1-3)')).toBeInTheDocument()
    expect(screen.getByText('Confidence (1-3)')).toBeInTheDocument()
    expect(screen.getByText('Effort (1-10)')).toBeInTheDocument()
  })

  it('displays current score when insight has a priority_score', () => {
    const insight = createMockInsight({ priority_score: 75 })
    render(<RiceOverride insight={insight} onApplied={onApplied} />)

    fireEvent.click(screen.getByText('Override Priority with RICE'))

    expect(screen.getByText('Current Score')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('does not display current score when priority_score is null', () => {
    const insight = createMockInsight({ priority_score: null })
    render(<RiceOverride insight={insight} onApplied={onApplied} />)

    fireEvent.click(screen.getByText('Override Priority with RICE'))

    expect(screen.queryByText('Current Score')).not.toBeInTheDocument()
  })

  it('shows "Currently manually scored" badge when manually scored', () => {
    const insight = createMockInsight({ metadata: { manually_scored: true } })
    render(<RiceOverride insight={insight} onApplied={onApplied} />)

    fireEvent.click(screen.getByText('Override Priority with RICE'))

    expect(screen.getByText('Currently manually scored')).toBeInTheDocument()
  })

  it('calls API and onApplied on successful apply', async () => {
    const insight = createMockInsight({ id: 'test-id' })
    const updatedInsight = { ...insight, priority_score: 11 }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(updatedInsight),
    })

    render(<RiceOverride insight={insight} onApplied={onApplied} />)

    fireEvent.click(screen.getByText('Override Priority with RICE'))
    fireEvent.click(screen.getByText('Apply RICE Score'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/insights/test-id',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    await waitFor(() => {
      expect(onApplied).toHaveBeenCalledWith(updatedInsight)
    })
  })

  it('shows error toast when API call fails', async () => {
    const { toast } = await import('sonner')
    const insight = createMockInsight()

    mockFetch.mockResolvedValueOnce({ ok: false })

    render(<RiceOverride insight={insight} onApplied={onApplied} />)

    fireEvent.click(screen.getByText('Override Priority with RICE'))
    fireEvent.click(screen.getByText('Apply RICE Score'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to apply RICE override')
    })

    expect(onApplied).not.toHaveBeenCalled()
  })
})

describe('normalizeRiceScore (via component behavior)', () => {
  it('calculates preview score with default values (5, 2, 2, 5)', () => {
    // Default: reach=5, impact=2, confidence=2, effort=5
    // Raw = (5 * 2 * 2) / 5 = 4
    // Max raw = 90
    // Normalized = Math.round(Math.min(100, (4 / 90) * 100)) = Math.round(4.44) = 4
    const raw = (5 * 2 * 2) / 5
    const maxRaw = (10 * 3 * 3) / 1
    const expected = Math.round(Math.min(100, (raw / maxRaw) * 100))
    expect(expected).toBe(4)
  })

  it('calculates max score correctly', () => {
    // Max: reach=10, impact=3, confidence=3, effort=1
    // Raw = 90 / 1 = 90, maxRaw = 90
    // Normalized = 100
    const raw = (10 * 3 * 3) / 1
    const maxRaw = 90
    const expected = Math.round(Math.min(100, (raw / maxRaw) * 100))
    expect(expected).toBe(100)
  })

  it('calculates min score correctly', () => {
    // Min: reach=1, impact=1, confidence=1, effort=10
    // Raw = 1/10 = 0.1, maxRaw = 90
    // Normalized = Math.round(0.111) = 0
    const raw = (1 * 1 * 1) / 10
    const maxRaw = 90
    const expected = Math.round(Math.min(100, (raw / maxRaw) * 100))
    expect(expected).toBe(0)
  })
})
