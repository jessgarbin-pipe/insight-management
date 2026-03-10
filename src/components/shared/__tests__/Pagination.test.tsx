import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from '../Pagination'

describe('Pagination', () => {
  it('renders page info correctly', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('renders Previous and Next buttons', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('disables Previous button on first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />)
    const prevButton = screen.getByText('Previous').closest('button')
    expect(prevButton).toBeDisabled()
  })

  it('disables Next button on last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />)
    const nextButton = screen.getByText('Next').closest('button')
    expect(nextButton).toBeDisabled()
  })

  it('enables both buttons on a middle page', () => {
    render(<Pagination page={3} totalPages={5} onPageChange={vi.fn()} />)
    const prevButton = screen.getByText('Previous').closest('button')
    const nextButton = screen.getByText('Next').closest('button')
    expect(prevButton).not.toBeDisabled()
    expect(nextButton).not.toBeDisabled()
  })

  it('calls onPageChange with previous page when Previous is clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByText('Previous'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with next page when Next is clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByText('Next'))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('does not call onPageChange when Previous is disabled and clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />)

    // Button is disabled, click should not trigger callback
    fireEvent.click(screen.getByText('Previous'))
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('does not call onPageChange when Next is disabled and clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={5} totalPages={5} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByText('Next'))
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('handles single page correctly', () => {
    render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />)

    const prevButton = screen.getByText('Previous').closest('button')
    const nextButton = screen.getByText('Next').closest('button')
    expect(prevButton).toBeDisabled()
    expect(nextButton).toBeDisabled()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })
})
