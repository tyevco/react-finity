import { describe, it, expect } from 'vitest'
import { snapToGrid, snapValue, snapObjectToGrid } from '../snapping'

describe('snapValue', () => {
  it('snaps exact multiples to themselves', () => {
    expect(snapValue(0, 42)).toBe(0)
    expect(snapValue(42, 42)).toBe(42)
    expect(snapValue(84, 42)).toBe(84)
    expect(snapValue(-42, 42)).toBe(-42)
  })

  it('rounds up when closer to the next multiple', () => {
    expect(snapValue(22, 42)).toBe(42)
    expect(snapValue(63, 42)).toBe(84)
  })

  it('rounds down when closer to the previous multiple', () => {
    expect(snapValue(20, 42)).toBe(0)
    expect(snapValue(41, 42)).toBe(42)
  })

  it('handles the midpoint by rounding to nearest even', () => {
    // Math.round(21/42) = Math.round(0.5) = 1 -> 42
    expect(snapValue(21, 42)).toBe(42)
  })

  it('handles negative values', () => {
    expect(snapValue(-20, 42)).toBe(-0)
    expect(snapValue(-22, 42)).toBe(-42)
    expect(snapValue(-84, 42)).toBe(-84)
  })

  it('returns the value unchanged when gridSize is 0', () => {
    expect(snapValue(25, 0)).toBe(25)
    expect(snapValue(-10, 0)).toBe(-10)
  })
})

describe('snapToGrid', () => {
  it('snaps origin to origin', () => {
    expect(snapToGrid([0, 0, 0], 42)).toEqual([0, 0, 0])
  })

  it('snaps X and Z but preserves Y', () => {
    expect(snapToGrid([21, 5, 21], 42)).toEqual([42, 5, 42])
  })

  it('rounds down X and Z when closer to previous multiple', () => {
    expect(snapToGrid([20, 5, 20], 42)).toEqual([0, 5, 0])
  })

  it('handles mixed rounding directions', () => {
    expect(snapToGrid([63, 0, -21], 42)).toEqual([84, 0, -0])
  })

  it('preserves exact multiples', () => {
    expect(snapToGrid([-84, 0, 126], 42)).toEqual([-84, 0, 126])
  })

  it('always preserves Y axis value', () => {
    expect(snapToGrid([10, 123.456, 30], 42)).toEqual([0, 123.456, 42])
  })

  it('handles zero grid size by returning original position', () => {
    expect(snapToGrid([25, 10, 35], 0)).toEqual([25, 10, 35])
  })
})

describe('snapObjectToGrid', () => {
  const gridSize = 42

  it('snaps odd grid dimensions (1x1) to standard grid multiples', () => {
    expect(snapObjectToGrid([0, 0, 0], gridSize, 1, 1)).toEqual([0, 0, 0])
    expect(snapObjectToGrid([20, 0, 20], gridSize, 1, 1)).toEqual([0, 0, 0])
    expect(snapObjectToGrid([30, 0, 30], gridSize, 1, 1)).toEqual([42, 0, 42])
    expect(snapObjectToGrid([84, 0, 84], gridSize, 1, 1)).toEqual([84, 0, 84])
  })

  it('snaps odd grid dimensions (3x3) to standard grid multiples', () => {
    expect(snapObjectToGrid([0, 0, 0], gridSize, 3, 3)).toEqual([0, 0, 0])
    expect(snapObjectToGrid([42, 0, 42], gridSize, 3, 3)).toEqual([42, 0, 42])
  })

  it('snaps even grid dimensions (2x2) to half-grid offsets', () => {
    // 2x2 bin center needs to be at (21, z, 21) to align plugs with cell centers
    expect(snapObjectToGrid([0, 0, 0], gridSize, 2, 2)).toEqual([21, 0, 21])
    expect(snapObjectToGrid([21, 0, 21], gridSize, 2, 2)).toEqual([21, 0, 21])
    expect(snapObjectToGrid([50, 0, 50], gridSize, 2, 2)).toEqual([63, 0, 63])
    expect(snapObjectToGrid([63, 0, 63], gridSize, 2, 2)).toEqual([63, 0, 63])
  })

  it('snaps even grid dimensions (4x2) to half-grid offsets', () => {
    expect(snapObjectToGrid([0, 0, 0], gridSize, 4, 2)).toEqual([21, 0, 21])
    expect(snapObjectToGrid([63, 0, 63], gridSize, 4, 2)).toEqual([63, 0, 63])
  })

  it('snaps mixed dimensions (2x3) with per-axis offsets', () => {
    // X is even (offset 21), Z is odd (offset 0)
    expect(snapObjectToGrid([0, 0, 0], gridSize, 2, 3)).toEqual([21, 0, 0])
    expect(snapObjectToGrid([50, 0, 30], gridSize, 2, 3)).toEqual([63, 0, 42])
  })

  it('snaps mixed dimensions (3x2) with per-axis offsets', () => {
    // X is odd (offset 0), Z is even (offset 21)
    expect(snapObjectToGrid([0, 0, 0], gridSize, 3, 2)).toEqual([0, 0, 21])
    expect(snapObjectToGrid([30, 0, 50], gridSize, 3, 2)).toEqual([42, 0, 63])
  })

  it('preserves Y axis value', () => {
    expect(snapObjectToGrid([21, 5.5, 21], gridSize, 2, 2)).toEqual([21, 5.5, 21])
  })

  it('handles negative positions', () => {
    expect(snapObjectToGrid([-21, 0, -21], gridSize, 2, 2)).toEqual([-21, 0, -21])
    expect(snapObjectToGrid([-50, 0, -50], gridSize, 2, 2)).toEqual([-63, 0, -63])
  })

  it('returns position unchanged when gridSize is 0', () => {
    expect(snapObjectToGrid([25, 10, 35], 0, 2, 2)).toEqual([25, 10, 35])
    expect(snapObjectToGrid([-5, 3, 17], 0, 1, 1)).toEqual([-5, 3, 17])
  })
})
