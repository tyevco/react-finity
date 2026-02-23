import { describe, it, expect, beforeAll } from 'vitest'
import {
  mergeObjectWithModifiers,
  computeBinContext,
  generateModifierGeometry,
} from '../mergeObjectGeometry'
import { PROFILE_OFFICIAL } from '../../constants'
import { registerBuiltinKinds } from '@/engine/registry/builtins'

beforeAll(() => {
  registerBuiltinKinds()
})
import type {
  BaseplateObject,
  BinObject,
  Modifier,
  DividerGridModifier,
  LabelTabModifier,
} from '@/types/gridfinity'

function makeBin(overrides?: Partial<BinObject['params']>): BinObject {
  return {
    id: 'bin-1',
    name: 'Test Bin',
    kind: 'bin',
    position: [0, 0, 0],
    params: {
      gridWidth: 1,
      gridDepth: 1,
      heightUnits: 3,
      stackingLip: true,
      wallThickness: 1.2,
      innerFillet: 0,
      ...overrides,
    },
  }
}

function makeBaseplate(): BaseplateObject {
  return {
    id: 'bp-1',
    name: 'Test Baseplate',
    kind: 'baseplate',
    position: [0, 0, 0],
    params: {
      gridWidth: 1,
      gridDepth: 1,
      magnetHoles: false,
      screwHoles: false,
    },
  }
}

describe('computeBinContext', () => {
  it('computes inner dimensions for a 1x1 bin', () => {
    const bin = makeBin()
    const ctx = computeBinContext(bin.params, PROFILE_OFFICIAL)

    expect(ctx.innerWidth).toBeGreaterThan(0)
    expect(ctx.innerDepth).toBeGreaterThan(0)
    expect(ctx.wallHeight).toBe(3 * 7) // 3 height units * 7mm
    expect(ctx.floorY).toBeGreaterThan(0)
  })

  it('wider bins have larger inner width', () => {
    const small = computeBinContext(makeBin({ gridWidth: 1 }).params, PROFILE_OFFICIAL)
    const large = computeBinContext(makeBin({ gridWidth: 3 }).params, PROFILE_OFFICIAL)
    expect(large.innerWidth).toBeGreaterThan(small.innerWidth)
  })
})

describe('generateModifierGeometry', () => {
  it('generates divider grid geometry', () => {
    const bin = makeBin()
    const ctx = computeBinContext(bin.params, PROFILE_OFFICIAL)
    const modifier: DividerGridModifier = {
      id: 'div-1',
      parentId: 'bin-1',
      kind: 'dividerGrid',
      params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
    }
    const geo = generateModifierGeometry(modifier, ctx, PROFILE_OFFICIAL)
    expect(geo).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(geo!.attributes.position).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(geo!.attributes.position.count).toBeGreaterThan(0)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    geo!.dispose()
  })

  it('generates label tab geometry', () => {
    const bin = makeBin()
    const ctx = computeBinContext(bin.params, PROFILE_OFFICIAL)
    const modifier: LabelTabModifier = {
      id: 'label-1',
      parentId: 'bin-1',
      kind: 'labelTab',
      params: { wall: 'front', angle: 45, height: 7 },
    }
    const geo = generateModifierGeometry(modifier, ctx, PROFILE_OFFICIAL)
    expect(geo).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(geo!.attributes.position.count).toBeGreaterThan(0)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    geo!.dispose()
  })
})

describe('mergeObjectWithModifiers', () => {
  it('returns base geometry for baseplate with no modifiers', () => {
    const bp = makeBaseplate()
    const geo = mergeObjectWithModifiers(bp, [], PROFILE_OFFICIAL)
    expect(geo).toBeDefined()
    expect(geo.attributes.position).toBeDefined()
    expect(geo.attributes.position.count).toBeGreaterThan(0)
    geo.dispose()
  })

  it('returns base geometry for bin with no modifiers', () => {
    const bin = makeBin()
    const geo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)
    expect(geo).toBeDefined()
    expect(geo.attributes.position.count).toBeGreaterThan(0)
    geo.dispose()
  })

  it('merges bin with divider modifiers producing more vertices', () => {
    const bin = makeBin()
    const baseGeo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)
    const baseCount = baseGeo.attributes.position.count

    const divider: DividerGridModifier = {
      id: 'div-1',
      parentId: 'bin-1',
      kind: 'dividerGrid',
      params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
    }
    const mergedGeo = mergeObjectWithModifiers(bin, [divider], PROFILE_OFFICIAL)
    expect(mergedGeo.attributes.position.count).toBeGreaterThan(baseCount)

    baseGeo.dispose()
    mergedGeo.dispose()
  })

  it('handles nested modifiers (divider with child label tab)', () => {
    const bin = makeBin()
    const divider: DividerGridModifier = {
      id: 'div-1',
      parentId: 'bin-1',
      kind: 'dividerGrid',
      params: { dividersX: 1, dividersY: 0, wallThickness: 1.2 },
    }
    const label: LabelTabModifier = {
      id: 'label-1',
      parentId: 'div-1',
      kind: 'labelTab',
      params: { wall: 'front', angle: 45, height: 7 },
    }
    const modifiers: Modifier[] = [divider, label]
    const geo = mergeObjectWithModifiers(bin, modifiers, PROFILE_OFFICIAL)
    expect(geo.attributes.position.count).toBeGreaterThan(0)
    geo.dispose()
  })
})
