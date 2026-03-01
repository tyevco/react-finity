import { describe, it, expect, beforeAll } from 'vitest'
import {
  mergeObjectWithModifiers,
  collectSeparatePartModifiers,
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
  LidModifier,
  FingerScoopModifier,
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
      magnetHoles: false,
      weightHoles: false,
      honeycombBase: false,
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
      slim: false,
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
  it('returns null for unknown modifier kind', () => {
    const bin = makeBin()
    const ctx = computeBinContext(bin.params, PROFILE_OFFICIAL)
    const modifier = {
      id: 'unk-1',
      parentId: 'bin-1',
      kind: 'unknownKind',
      params: {},
    } as unknown as Modifier
    const geo = generateModifierGeometry(modifier, ctx, PROFILE_OFFICIAL)
    expect(geo).toBeNull()
  })

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

  it('subtractive modifier (finger scoop) changes vertex count via CSG', () => {
    const bin = makeBin()
    const baseGeo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)
    const baseCount = baseGeo.attributes.position.count

    const fingerScoop: FingerScoopModifier = {
      id: 'fs-1',
      parentId: 'bin-1',
      kind: 'fingerScoop',
      params: { wall: 'front', width: 20, depth: 15 },
    }
    const mergedGeo = mergeObjectWithModifiers(bin, [fingerScoop], PROFILE_OFFICIAL)
    // CSG subtraction changes vertex count
    expect(mergedGeo.attributes.position.count).not.toBe(baseCount)

    baseGeo.dispose()
    mergedGeo.dispose()
  })

  it('skips unknown modifier kinds gracefully', () => {
    const bin = makeBin()
    const unknown = {
      id: 'unk-1',
      parentId: 'bin-1',
      kind: 'unknownKind',
      params: {},
    } as unknown as Modifier
    const baseGeo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)
    const withUnknown = mergeObjectWithModifiers(bin, [unknown], PROFILE_OFFICIAL)

    // Unknown modifier should be skipped, producing same vertex count as no modifiers
    expect(withUnknown.attributes.position.count).toBe(baseGeo.attributes.position.count)

    baseGeo.dispose()
    withUnknown.dispose()
  })

  it('excludes lid modifier geometry from merge (separatePrintPart)', () => {
    const bin = makeBin()
    const lid: LidModifier = {
      id: 'lid-1',
      parentId: 'bin-1',
      kind: 'lid',
      params: { stacking: false },
    }

    const withoutLid = mergeObjectWithModifiers(bin, [lid], PROFILE_OFFICIAL)
    const withoutModifiers = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)

    // Lid should be excluded, so vertex count should be the same as no modifiers
    expect(withoutLid.attributes.position.count).toBe(withoutModifiers.attributes.position.count)

    withoutLid.dispose()
    withoutModifiers.dispose()
  })
})

describe('collectSeparatePartModifiers', () => {
  it('returns lid modifier geometry for a bin with lid', () => {
    const bin = makeBin()
    const lid: LidModifier = {
      id: 'lid-1',
      parentId: 'bin-1',
      kind: 'lid',
      params: { stacking: false },
    }

    const parts = collectSeparatePartModifiers(bin.id, [lid], PROFILE_OFFICIAL, bin)
    expect(parts).toHaveLength(1)
    expect(parts[0].modifier.id).toBe('lid-1')
    expect(parts[0].geometry.attributes.position.count).toBeGreaterThan(0)

    for (const p of parts) p.geometry.dispose()
  })

  it('returns empty for non-separate-part modifiers', () => {
    const bin = makeBin()
    const divider: DividerGridModifier = {
      id: 'div-1',
      parentId: 'bin-1',
      kind: 'dividerGrid',
      params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
    }

    const parts = collectSeparatePartModifiers(bin.id, [divider], PROFILE_OFFICIAL, bin)
    expect(parts).toHaveLength(0)
  })

  it('returns empty for baseplates (no modifier support)', () => {
    const bp = makeBaseplate()
    const parts = collectSeparatePartModifiers(bp.id, [], PROFILE_OFFICIAL, bp)
    expect(parts).toHaveLength(0)
  })
})
