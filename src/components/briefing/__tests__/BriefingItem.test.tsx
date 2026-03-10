import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BriefingItemCard } from '../BriefingItem'
import { createMockBriefingItem } from '@/test/mocks/data'

describe('BriefingItemCard', () => {
  const onAccept = vi.fn()
  const onDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    onAccept.mockResolvedValue(undefined)
    onDismiss.mockResolvedValue(undefined)
  })

  it('renders the briefing item description', () => {
    const item = createMockBriefingItem({ description: 'Review login performance issues' })
    render(<BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />)

    expect(screen.getByText('Review login performance issues')).toBeInTheDocument()
  })

  it('renders the suggested action label', () => {
    const item = createMockBriefingItem({
      suggested_action: {
        label: 'Create opportunity',
        type: 'create_opportunity',
        params: { theme_id: 'theme-1', title: 'Fix login' },
      },
    })
    render(<BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />)

    expect(screen.getByText('Create opportunity')).toBeInTheDocument()
  })

  it('renders the priority value', () => {
    const item = createMockBriefingItem({ priority: 3 })
    render(<BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />)

    expect(screen.getByText('Priority: 3')).toBeInTheDocument()
  })

  it('renders accept and dismiss buttons', () => {
    const item = createMockBriefingItem()
    render(<BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />)

    expect(screen.getByText('Accept')).toBeInTheDocument()
    expect(screen.getByText('Dismiss')).toBeInTheDocument()
  })

  it('calls onAccept when Accept button is clicked', async () => {
    const item = createMockBriefingItem()
    render(<BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByText('Accept'))

    await waitFor(() => {
      expect(onAccept).toHaveBeenCalledWith(item)
    })
  })

  it('calls onDismiss when Dismiss button is clicked', async () => {
    const item = createMockBriefingItem()
    render(<BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByText('Dismiss'))

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledWith(item)
    })
  })

  it('hides the card after accept is completed', async () => {
    const item = createMockBriefingItem({ description: 'Disappearing item' })
    const { container } = render(
      <BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />
    )

    expect(screen.getByText('Disappearing item')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Accept'))

    await waitFor(() => {
      expect(container.innerHTML).toBe('')
    })
  })

  it('hides the card after dismiss is completed', async () => {
    const item = createMockBriefingItem({ description: 'Disappearing item' })
    const { container } = render(
      <BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />
    )

    fireEvent.click(screen.getByText('Dismiss'))

    await waitFor(() => {
      expect(container.innerHTML).toBe('')
    })
  })

  it('disables both buttons while loading', async () => {
    // Make the onAccept take a while
    let resolveAccept: () => void
    onAccept.mockReturnValue(new Promise<void>((resolve) => {
      resolveAccept = resolve
    }))

    const item = createMockBriefingItem()
    render(<BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByText('Accept'))

    // Both buttons should be disabled while loading
    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument()
    })

    const dismissBtn = screen.getByText('Dismiss')
    expect(dismissBtn.closest('button')).toBeDisabled()

    // Resolve to clean up
    resolveAccept!()
  })

  it('renders different action types correctly', () => {
    const actionTypes = [
      { type: 'change_status' as const, label: 'Change status to closed' },
      { type: 'create_opportunity' as const, label: 'Create opportunity' },
      { type: 'investigate' as const, label: 'Investigate further' },
      { type: 'archive_theme' as const, label: 'Archive theme' },
      { type: 'link_to_opportunity' as const, label: 'Link to opportunity' },
    ]

    for (const action of actionTypes) {
      const item = createMockBriefingItem({
        suggested_action: {
          label: action.label,
          type: action.type,
          params: {},
        },
      })

      const { unmount } = render(
        <BriefingItemCard item={item} onAccept={onAccept} onDismiss={onDismiss} />
      )

      expect(screen.getByText(action.label)).toBeInTheDocument()
      unmount()
    }
  })
})
