import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('filters out falsy values', () => {
    const shouldInclude = false as boolean
    expect(cn('foo', shouldInclude && 'bar', null, undefined, 'baz')).toBe('foo baz')
  })

  it('resolves Tailwind conflicts by keeping the last value', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('returns an empty string for empty input', () => {
    expect(cn()).toBe('')
  })

  it('handles conditional object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active')
  })
})
