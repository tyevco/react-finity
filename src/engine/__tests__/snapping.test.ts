import { describe, it, expect } from 'vitest'
import { snapToGrid, snapValue } from '../snapping'

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
