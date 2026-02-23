import { describe, it, expect, beforeAll } from 'vitest'
import { objectKindRegistry } from '../objectKindRegistry'
import { modifierKindRegistry } from '../modifierKindRegistry'
import { registerBuiltinKinds } from '../builtins'

beforeAll(() => {
  objectKindRegistry.clear()
  modifierKindRegistry.clear()
  registerBuiltinKinds()
})

describe('registerBuiltinKinds', () => {
  it('registers baseplate object kind', () => {
    const reg = objectKindRegistry.get('baseplate')
    expect(reg).toBeDefined()
    expect(reg?.label).toBe('Baseplate')
    expect(reg?.supportsModifiers).toBe(false)
  })

  it('registers bin object kind', () => {
    const reg = objectKindRegistry.get('bin')
    expect(reg).toBeDefined()
    expect(reg?.label).toBe('Bin')
    expect(reg?.supportsModifiers).toBe(true)
    expect(reg?.computeModifierContext).toBeDefined()
  })

  it('registers exactly 2 object kinds', () => {
    expect(objectKindRegistry.getAll()).toHaveLength(2)
    expect(objectKindRegistry.getAllKinds().sort()).toEqual(['baseplate', 'bin'])
  })

  it('registers all 6 modifier kinds', () => {
    expect(modifierKindRegistry.getAll()).toHaveLength(6)
    expect(modifierKindRegistry.getAllKinds().sort()).toEqual([
      'dividerGrid',
      'fingerScoop',
      'insert',
      'labelTab',
      'lid',
      'scoop',
    ])
  })

  it('dividerGrid modifier subdivides space', () => {
    const reg = modifierKindRegistry.get('dividerGrid')
    expect(reg?.subdividesSpace).toBe(true)
    expect(reg?.computeChildContext).toBeDefined()
  })

  it('insert modifier subdivides space', () => {
    const reg = modifierKindRegistry.get('insert')
    expect(reg?.subdividesSpace).toBe(true)
    expect(reg?.computeChildContext).toBeDefined()
  })

  it('simple modifiers do not subdivide space', () => {
    for (const kind of ['labelTab', 'scoop', 'lid']) {
      const reg = modifierKindRegistry.get(kind)
      expect(reg?.subdividesSpace).toBe(false)
    }
  })

  it('all object kinds have required fields', () => {
    for (const reg of objectKindRegistry.getAll()) {
      expect(reg.kind).toBeTruthy()
      expect(reg.label).toBeTruthy()
      expect(reg.icon).toBeDefined()
      expect(reg.defaultParams).toBeDefined()
      expect(reg.generateGeometry).toBeInstanceOf(Function)
      expect(reg.getDimensions).toBeInstanceOf(Function)
      expect(reg.getPrintRotation).toBeInstanceOf(Function)
      expect(typeof reg.supportsModifiers).toBe('boolean')
    }
  })

  it('all modifier kinds have required fields', () => {
    for (const reg of modifierKindRegistry.getAll()) {
      expect(reg.kind).toBeTruthy()
      expect(reg.label).toBeTruthy()
      expect(reg.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(reg.defaultParams).toBeDefined()
      expect(reg.generateGeometry).toBeInstanceOf(Function)
      expect(typeof reg.subdividesSpace).toBe('boolean')
    }
  })

  it('all modifier kinds have a ControlsComponent or controlsSchema', () => {
    for (const reg of modifierKindRegistry.getAll()) {
      const hasControls = reg.ControlsComponent !== undefined || reg.controlsSchema !== undefined
      expect(hasControls).toBe(true)
    }
  })

  it('all object kinds have a PropertiesComponent', () => {
    for (const reg of objectKindRegistry.getAll()) {
      expect(reg.PropertiesComponent).toBeDefined()
    }
  })

  it('is idempotent (calling twice does not throw)', () => {
    expect(() => {
      registerBuiltinKinds()
    }).not.toThrow()
  })
})
