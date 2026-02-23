import { describe, it, expect, beforeEach } from 'vitest'
import { BufferGeometry, Euler } from 'three'
import { Grid3x3 } from 'lucide-react'
import { objectKindRegistry } from '../objectKindRegistry'
import type { ObjectKindRegistration } from '../types'

function makeRegistration(kind: string): ObjectKindRegistration {
  return {
    kind,
    label: kind.charAt(0).toUpperCase() + kind.slice(1),
    icon: Grid3x3,
    defaultParams: { width: 1, depth: 1 },
    generateGeometry: () => new BufferGeometry(),
    getDimensions: () => ({ width: 42, depth: 42, height: 7 }),
    getPrintRotation: () => new Euler(0, 0, 0),
    supportsModifiers: false,
  }
}

describe('ObjectKindRegistry', () => {
  beforeEach(() => {
    objectKindRegistry.clear()
  })

  it('registers and retrieves a kind', () => {
    objectKindRegistry.register(makeRegistration('testKind'))
    const reg = objectKindRegistry.get('testKind')
    expect(reg).toBeDefined()
    expect(reg?.kind).toBe('testKind')
    expect(reg?.label).toBe('TestKind')
  })

  it('has() returns true for registered kinds', () => {
    objectKindRegistry.register(makeRegistration('alpha'))
    expect(objectKindRegistry.has('alpha')).toBe(true)
    expect(objectKindRegistry.has('beta')).toBe(false)
  })

  it('get() returns undefined for unregistered kinds', () => {
    expect(objectKindRegistry.get('nonexistent')).toBeUndefined()
  })

  it('getOrThrow() throws for unregistered kinds', () => {
    expect(() => objectKindRegistry.getOrThrow('nonexistent')).toThrow(
      'Unknown object kind: "nonexistent"',
    )
  })

  it('getOrThrow() returns registration for registered kinds', () => {
    objectKindRegistry.register(makeRegistration('test'))
    const reg = objectKindRegistry.getOrThrow('test')
    expect(reg.kind).toBe('test')
  })

  it('getAll() returns all registered kinds', () => {
    objectKindRegistry.register(makeRegistration('alpha'))
    objectKindRegistry.register(makeRegistration('beta'))
    const all = objectKindRegistry.getAll()
    expect(all).toHaveLength(2)
    expect(all.map((r) => r.kind).sort()).toEqual(['alpha', 'beta'])
  })

  it('getAllKinds() returns kind strings', () => {
    objectKindRegistry.register(makeRegistration('alpha'))
    objectKindRegistry.register(makeRegistration('beta'))
    expect(objectKindRegistry.getAllKinds().sort()).toEqual(['alpha', 'beta'])
  })

  it('throws on duplicate registration', () => {
    objectKindRegistry.register(makeRegistration('dup'))
    expect(() => {
      objectKindRegistry.register(makeRegistration('dup'))
    }).toThrow('Object kind "dup" is already registered')
  })

  it('throws on registration after freeze', () => {
    objectKindRegistry.freeze()
    expect(() => {
      objectKindRegistry.register(makeRegistration('late'))
    }).toThrow('ObjectKindRegistry is frozen')
  })

  it('allows registration after unfreeze', () => {
    objectKindRegistry.freeze()
    objectKindRegistry.unfreeze()
    objectKindRegistry.register(makeRegistration('lateButOk'))
    expect(objectKindRegistry.has('lateButOk')).toBe(true)
  })

  it('clear() removes all registrations and unfreezes', () => {
    objectKindRegistry.register(makeRegistration('test'))
    objectKindRegistry.freeze()
    objectKindRegistry.clear()
    expect(objectKindRegistry.has('test')).toBe(false)
    objectKindRegistry.register(makeRegistration('newTest'))
    expect(objectKindRegistry.has('newTest')).toBe(true)
  })
})
