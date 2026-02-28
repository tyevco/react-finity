import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewportErrorBoundary } from '../ViewportErrorBoundary'

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test viewport crash')
  return <div>Viewport content</div>
}

describe('ViewportErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React error boundary console.error noise
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('renders children when no error occurs', () => {
    render(
      <ViewportErrorBoundary>
        <div>Child content</div>
      </ViewportErrorBoundary>,
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('shows fallback UI when child throws', () => {
    render(
      <ViewportErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ViewportErrorBoundary>,
    )
    expect(screen.getByText('Viewport encountered an error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('displays the error message in fallback', () => {
    render(
      <ViewportErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ViewportErrorBoundary>,
    )
    expect(screen.getByText('Test viewport crash')).toBeInTheDocument()
  })

  it('resets and re-renders children when Retry is clicked', async () => {
    const user = userEvent.setup()

    // We need a component that can toggle between throwing and not
    let shouldThrow = true
    function ToggleChild() {
      if (shouldThrow) throw new Error('Crash')
      return <div>Recovered</div>
    }

    const { rerender } = render(
      <ViewportErrorBoundary>
        <ToggleChild />
      </ViewportErrorBoundary>,
    )

    expect(screen.getByText('Viewport encountered an error')).toBeInTheDocument()

    // Fix the error condition before retrying
    shouldThrow = false

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    // After retry, should re-render children successfully
    rerender(
      <ViewportErrorBoundary>
        <ToggleChild />
      </ViewportErrorBoundary>,
    )
    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })

  it('resets when key prop changes', () => {
    const { rerender } = render(
      <ViewportErrorBoundary key="edit">
        <ThrowingChild shouldThrow={true} />
      </ViewportErrorBoundary>,
    )

    expect(screen.getByText('Viewport encountered an error')).toBeInTheDocument()

    // Changing the key remounts the boundary, resetting error state
    rerender(
      <ViewportErrorBoundary key="printLayout">
        <ThrowingChild shouldThrow={false} />
      </ViewportErrorBoundary>,
    )

    expect(screen.getByText('Viewport content')).toBeInTheDocument()
  })
})
