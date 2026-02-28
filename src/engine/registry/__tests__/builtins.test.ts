import { describe, it, expect, beforeAll } from 'vitest'
import { objectKindRegistry } from '../objectKindRegistry'
import { modifierKindRegistry } from '../modifierKindRegistry'
import { registerBuiltinKinds } from '../builtins'
import type { ModifierContext } from '@/types/gridfinity'

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

function getComputeChildContext(kind: string) {
  const reg = modifierKindRegistry.get(kind)
  if (!reg?.computeChildContext) {
    throw new Error(`No computeChildContext for modifier kind: ${kind}`)
  }
  return reg.computeChildContext
}

const parentContext: ModifierContext = {
  innerWidth: 40,
  innerDepth: 40,
  wallHeight: 20,
  floorY: 5,
  centerX: 0,
  centerZ: 0,
}

describe('dividerGrid computeChildContext', () => {
  let compute: ReturnType<typeof getComputeChildContext>
  beforeAll(() => {
    compute = getComputeChildContext('dividerGrid')
  })

  it('returns parent context unchanged when both dividersX and dividersY are 0', () => {
    const result = compute({ dividersX: 0, dividersY: 0, wallThickness: 2 }, parentContext)
    expect(result).toBe(parentContext)
  })

  it('returns parent context unchanged when dividersX is 0 but dividersY is also 0', () => {
    const result = compute({ dividersX: 0, dividersY: 0, wallThickness: 1 }, parentContext)
    expect(result).toBe(parentContext)
  })

  it('reduces innerWidth when dividersX > 0 and dividersY is 0', () => {
    // dividersX=1, dividersY=0, wallThickness=2
    // compartmentWidth = (40 - 2*1) / (1+1) = 38/2 = 19
    // compartmentDepth = (40 - 2*0) / (0+1) = 40
    const result = compute({ dividersX: 1, dividersY: 0, wallThickness: 2 }, parentContext)
    expect(result).not.toBe(parentContext)
    expect(result.innerWidth).toBeCloseTo(19)
    expect(result.innerDepth).toBeCloseTo(40)
    expect(result.wallHeight).toBe(parentContext.wallHeight)
    expect(result.floorY).toBe(parentContext.floorY)
    expect(result.centerX).toBe(parentContext.centerX)
    expect(result.centerZ).toBe(parentContext.centerZ)
  })

  it('reduces innerDepth when dividersY > 0 and dividersX is 0', () => {
    // dividersX=0, dividersY=1, wallThickness=2
    // compartmentWidth = (40 - 2*0) / (0+1) = 40
    // compartmentDepth = (40 - 2*1) / (1+1) = 38/2 = 19
    const result = compute({ dividersX: 0, dividersY: 1, wallThickness: 2 }, parentContext)
    expect(result).not.toBe(parentContext)
    expect(result.innerWidth).toBeCloseTo(40)
    expect(result.innerDepth).toBeCloseTo(19)
  })

  it('reduces both dimensions when dividersX > 0 and dividersY > 0', () => {
    // dividersX=1, dividersY=1, wallThickness=2
    // compartmentWidth = (40 - 2*1) / 2 = 19
    // compartmentDepth = (40 - 2*1) / 2 = 19
    const result = compute({ dividersX: 1, dividersY: 1, wallThickness: 2 }, parentContext)
    expect(result.innerWidth).toBeCloseTo(19)
    expect(result.innerDepth).toBeCloseTo(19)
  })

  it('clamps compartment dimensions to a minimum of 0.1', () => {
    // Very thick walls with many dividers forces compartment size below 0.1
    // dividersX=10, wallThickness=40 => compartmentWidth = (40 - 40*10) / 11 = very negative
    const result = compute({ dividersX: 10, dividersY: 10, wallThickness: 40 }, parentContext)
    expect(result.innerWidth).toBe(0.1)
    expect(result.innerDepth).toBe(0.1)
  })

  it('preserves non-spatial context fields', () => {
    const result = compute({ dividersX: 2, dividersY: 2, wallThickness: 1 }, parentContext)
    expect(result.wallHeight).toBe(parentContext.wallHeight)
    expect(result.floorY).toBe(parentContext.floorY)
    expect(result.centerX).toBe(parentContext.centerX)
    expect(result.centerZ).toBe(parentContext.centerZ)
  })

  it('clamps wallHeight to a minimum of 0.1 when parent provides negative wallHeight', () => {
    const negativeHeightContext = { ...parentContext, wallHeight: -5 }
    const result = compute({ dividersX: 1, dividersY: 0, wallThickness: 2 }, negativeHeightContext)
    expect(result.wallHeight).toBe(0.1)
  })
})

describe('insert computeChildContext', () => {
  let compute: ReturnType<typeof getComputeChildContext>
  beforeAll(() => {
    compute = getComputeChildContext('insert')
  })

  it('returns parent context unchanged when compartmentsX is less than 1', () => {
    const result = compute({ compartmentsX: 0, compartmentsY: 2, wallThickness: 2 }, parentContext)
    expect(result).toBe(parentContext)
  })

  it('returns parent context unchanged when compartmentsY is less than 1', () => {
    const result = compute({ compartmentsX: 2, compartmentsY: 0, wallThickness: 2 }, parentContext)
    expect(result).toBe(parentContext)
  })

  it('returns parent context unchanged when both compartmentsX and compartmentsY are less than 1', () => {
    const result = compute({ compartmentsX: 0, compartmentsY: 0, wallThickness: 2 }, parentContext)
    expect(result).toBe(parentContext)
  })

  it('returns parent context unchanged when excessive wall thickness makes rimInner <= 0', () => {
    // wallThickness=25 => rimInnerWidth = 40 - 25*2 = -10 <= 0
    const result = compute({ compartmentsX: 1, compartmentsY: 1, wallThickness: 25 }, parentContext)
    expect(result).toBe(parentContext)
  })

  it('computes correct compartment dimensions for a single compartment', () => {
    // compartmentsX=1, compartmentsY=1, wallThickness=2
    // rimInnerWidth = 40 - 4 = 36, rimInnerDepth = 40 - 4 = 36
    // compartmentWidth = (36 - 2*(1-1)) / 1 = 36
    // compartmentDepth = (36 - 2*(1-1)) / 1 = 36
    const result = compute({ compartmentsX: 1, compartmentsY: 1, wallThickness: 2 }, parentContext)
    expect(result).not.toBe(parentContext)
    expect(result.innerWidth).toBeCloseTo(36)
    expect(result.innerDepth).toBeCloseTo(36)
  })

  it('reduces dimensions correctly when subdivided into multiple compartments', () => {
    // compartmentsX=2, compartmentsY=2, wallThickness=2
    // rimInnerWidth = 40 - 4 = 36, rimInnerDepth = 40 - 4 = 36
    // compartmentWidth = (36 - 2*(2-1)) / 2 = (36 - 2) / 2 = 17
    // compartmentDepth = (36 - 2*(2-1)) / 2 = 17
    const result = compute({ compartmentsX: 2, compartmentsY: 2, wallThickness: 2 }, parentContext)
    expect(result.innerWidth).toBeCloseTo(17)
    expect(result.innerDepth).toBeCloseTo(17)
  })

  it('clamps compartment dimensions to a minimum of 0.1', () => {
    // Large compartment counts with thick walls pushes dimensions below 0.1
    // compartmentsX=20, wallThickness=3
    // rimInnerWidth = 40 - 6 = 34
    // compartmentWidth = (34 - 3*19) / 20 = (34 - 57) / 20 = very negative
    const result = compute(
      { compartmentsX: 20, compartmentsY: 20, wallThickness: 3 },
      parentContext,
    )
    expect(result.innerWidth).toBe(0.1)
    expect(result.innerDepth).toBe(0.1)
  })

  it('preserves non-spatial context fields', () => {
    const result = compute({ compartmentsX: 2, compartmentsY: 2, wallThickness: 2 }, parentContext)
    expect(result.wallHeight).toBe(parentContext.wallHeight)
    expect(result.floorY).toBe(parentContext.floorY)
    expect(result.centerX).toBe(parentContext.centerX)
    expect(result.centerZ).toBe(parentContext.centerZ)
  })

  it('clamps wallHeight to a minimum of 0.1 when parent provides negative wallHeight', () => {
    const negativeHeightContext = { ...parentContext, wallHeight: -5 }
    const result = compute(
      { compartmentsX: 2, compartmentsY: 2, wallThickness: 2 },
      negativeHeightContext,
    )
    expect(result.wallHeight).toBe(0.1)
  })
})
