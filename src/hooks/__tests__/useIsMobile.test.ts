import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../useIsMobile'

describe('useIsMobile', () => {
  let changeListeners: (() => void)[] = []
  let currentMatches = false

  function createMatchMediaMock(matches: boolean) {
    currentMatches = matches
    changeListeners = []
    return vi.fn(() => ({
      get matches() {
        return currentMatches
      },
      media: '',
      addEventListener: (_event: string, cb: () => void) => {
        changeListeners.push(cb)
      },
      removeEventListener: (_event: string, cb: () => void) => {
        changeListeners = changeListeners.filter((l) => l !== cb)
      },
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }

  beforeEach(() => {
    changeListeners = []
    currentMatches = false
  })

  it('returns false for desktop widths', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMediaMock(false),
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true for mobile widths', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMediaMock(true),
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('updates when media query changes', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMediaMock(false),
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate media query change
    act(() => {
      currentMatches = true
      changeListeners.forEach((cb) => {
        cb()
      })
    })
    expect(result.current).toBe(true)
  })

  it('updates back to false when resized to desktop', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMediaMock(true),
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    act(() => {
      currentMatches = false
      changeListeners.forEach((cb) => {
        cb()
      })
    })
    expect(result.current).toBe(false)
  })

  it('cleans up event listener on unmount', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMediaMock(false),
    })
    const { unmount } = renderHook(() => useIsMobile())
    expect(changeListeners.length).toBeGreaterThan(0)
    unmount()
    expect(changeListeners.length).toBe(0)
  })
})
