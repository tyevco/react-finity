import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import { modifierKindRegistry } from '../modifierKindRegistry'
import type { ModifierKindRegistration } from '../types'
import type { ModifierContext } from '@/types/gridfinity'

function makeRegistration(
  kind: string,
  overrides?: Partial<ModifierKindRegistration>,
): ModifierKindRegistration {
  return {
    kind,
    label: kind,
    color: '#aabbcc',
    defaultParams: {},
    generateGeometry: () => new THREE.BufferGeometry(),
    subdividesSpace: false,
    ...overrides,
  }
}

describe('ModifierKindRegistry', () => {
  beforeEach(() => {
    modifierKindRegistry.clear()
  })

  it('registers and retrieves a kind', () => {
    modifierKindRegistry.register(makeRegistration('testMod'))
    const reg = modifierKindRegistry.get('testMod')
    expect(reg).toBeDefined()
    expect(reg?.kind).toBe('testMod')
    expect(reg?.color).toBe('#aabbcc')
  })

  it('has() returns true for registered kinds', () => {
    modifierKindRegistry.register(makeRegistration('alpha'))
    expect(modifierKindRegistry.has('alpha')).toBe(true)
    expect(modifierKindRegistry.has('beta')).toBe(false)
  })

  it('get() returns undefined for unregistered kinds', () => {
    expect(modifierKindRegistry.get('nonexistent')).toBeUndefined()
  })

  it('getOrThrow() throws for unregistered kinds', () => {
    expect(() => modifierKindRegistry.getOrThrow('nonexistent')).toThrow(
      'Unknown modifier kind: "nonexistent"',
    )
  })

  it('getAll() returns all registered kinds', () => {
    modifierKindRegistry.register(makeRegistration('alpha'))
    modifierKindRegistry.register(makeRegistration('beta'))
    modifierKindRegistry.register(makeRegistration('gamma'))
    expect(modifierKindRegistry.getAll()).toHaveLength(3)
  })

  it('getAllKinds() returns kind strings', () => {
    modifierKindRegistry.register(makeRegistration('a'))
    modifierKindRegistry.register(makeRegistration('b'))
    expect(modifierKindRegistry.getAllKinds().sort()).toEqual(['a', 'b'])
  })

  it('throws on duplicate registration', () => {
    modifierKindRegistry.register(makeRegistration('dup'))
    expect(() => {
      modifierKindRegistry.register(makeRegistration('dup'))
    }).toThrow('Modifier kind "dup" is already registered')
  })

  it('throws on registration after freeze', () => {
    modifierKindRegistry.freeze()
    expect(() => {
      modifierKindRegistry.register(makeRegistration('late'))
    }).toThrow('ModifierKindRegistry is frozen')
  })

  it('validates subdividesSpace requires computeChildContext', () => {
    expect(() => {
      modifierKindRegistry.register(makeRegistration('bad', { subdividesSpace: true }))
    }).toThrow('subdividesSpace=true but no computeChildContext')
  })

  it('allows subdividesSpace with computeChildContext', () => {
    const childContext: ModifierContext = {
      innerWidth: 10,
      innerDepth: 10,
      wallHeight: 20,
      floorY: 5,
      centerX: 0,
      centerZ: 0,
    }
    modifierKindRegistry.register(
      makeRegistration('divider', {
        subdividesSpace: true,
        computeChildContext: () => childContext,
      }),
    )
    expect(modifierKindRegistry.has('divider')).toBe(true)
  })

  it('getForParent() returns all kinds when no allowedParentKinds set', () => {
    modifierKindRegistry.register(makeRegistration('a'))
    modifierKindRegistry.register(makeRegistration('b'))
    const result = modifierKindRegistry.getForParent('anything')
    expect(result).toHaveLength(2)
  })

  it('getForParent() filters by allowedParentKinds', () => {
    modifierKindRegistry.register(makeRegistration('binOnly', { allowedParentKinds: ['bin'] }))
    modifierKindRegistry.register(makeRegistration('universal'))
    expect(modifierKindRegistry.getForParent('bin')).toHaveLength(2)
    expect(modifierKindRegistry.getForParent('baseplate')).toHaveLength(1)
    expect(modifierKindRegistry.getForParent('baseplate')[0].kind).toBe('universal')
  })

  it('clear() removes all registrations and unfreezes', () => {
    modifierKindRegistry.register(makeRegistration('test'))
    modifierKindRegistry.freeze()
    modifierKindRegistry.clear()
    expect(modifierKindRegistry.has('test')).toBe(false)
    modifierKindRegistry.register(makeRegistration('newTest'))
    expect(modifierKindRegistry.has('newTest')).toBe(true)
  })
})
