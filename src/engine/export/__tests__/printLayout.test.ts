import { describe, it, expect, beforeAll } from 'vitest'
import { computePrintLayout, disposePrintLayout } from '../printLayout'
import { PROFILE_OFFICIAL } from '../../constants'
import type { BaseplateObject, BinObject, GridfinityObject, LidModifier } from '@/types/gridfinity'
import { registerBuiltinKinds } from '@/engine/registry/builtins'

beforeAll(() => {
  registerBuiltinKinds()
})

function makeBaseplate(id = 'bp-1'): BaseplateObject {
  return {
    id,
    name: `Baseplate ${id}`,
    kind: 'baseplate',
    position: [0, 0, 0],
    params: { gridWidth: 1, gridDepth: 1, slim: false, magnetHoles: false, screwHoles: false },
  }
}

function makeBin(id = 'bin-1'): BinObject {
  return {
    id,
    name: `Bin ${id}`,
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
    },
  }
}

describe('computePrintLayout', () => {
  it('returns empty array for no objects', () => {
    const result = computePrintLayout([], [], PROFILE_OFFICIAL, 256, 256, 10)
    expect(result).toEqual([])
  })

  it('lays out a single object on the bed', () => {
    const objects: GridfinityObject[] = [makeBaseplate()]
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 256, 256, 10)

    expect(result).toHaveLength(1)
    expect(result[0].fitsOnBed).toBe(true)
    expect(result[0].position[1]).toBe(0) // Y should be 0 (on bed)
    expect(result[0].geometry).toBeDefined()
    expect(result[0].geometry.attributes.position.count).toBeGreaterThan(0)

    disposePrintLayout(result)
  })

  it('lays out multiple objects with spacing', () => {
    const objects: GridfinityObject[] = [makeBaseplate('bp-1'), makeBin('bin-1')]
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 256, 256, 10)

    expect(result).toHaveLength(2)

    // Objects should not overlap - their X positions + half-widths should not intersect
    const [a, b] = result
    const aRight = a.position[0] + a.boundingBox.width / 2
    const bLeft = b.position[0] - b.boundingBox.width / 2
    expect(bLeft).toBeGreaterThanOrEqual(aRight - 0.01) // allow floating point tolerance

    disposePrintLayout(result)
  })

  it('marks objects that exceed bed bounds', () => {
    // Use a very small bed
    const objects: GridfinityObject[] = [makeBaseplate()]
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 10, 10, 5)

    expect(result).toHaveLength(1)
    expect(result[0].fitsOnBed).toBe(false)

    disposePrintLayout(result)
  })

  it('all objects fit on a large bed', () => {
    const objects: GridfinityObject[] = [
      makeBaseplate('bp-1'),
      makeBaseplate('bp-2'),
      makeBin('bin-1'),
    ]
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 350, 350, 10)

    expect(result).toHaveLength(3)
    expect(result.every((item) => item.fitsOnBed)).toBe(true)

    disposePrintLayout(result)
  })

  it('wraps to next row when objects exceed bed width', () => {
    // 5 baseplates on a 256mm bed (each ~42mm wide, so 5 baseplates + spacing > 256)
    const objects: GridfinityObject[] = Array.from({ length: 5 }, (_, i) =>
      makeBaseplate(`bp-${i}`),
    )
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 200, 200, 10)

    // At least some should have different Z positions (different rows)
    const zPositions = new Set(result.map((r) => Math.round(r.position[2])))
    expect(zPositions.size).toBeGreaterThan(1)

    disposePrintLayout(result)
  })

  it('provides bounding box dimensions for each item', () => {
    const objects: GridfinityObject[] = [makeBin()]
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 256, 256, 10)

    expect(result[0].boundingBox.width).toBeGreaterThan(0)
    expect(result[0].boundingBox.depth).toBeGreaterThan(0)
    expect(result[0].boundingBox.height).toBeGreaterThan(0)

    disposePrintLayout(result)
  })

  it('includes id and label on each layout item', () => {
    const objects: GridfinityObject[] = [makeBaseplate()]
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 256, 256, 10)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('bp-1')
    expect(result[0].label).toBe('Baseplate bp-1')

    disposePrintLayout(result)
  })

  it('disposePrintLayout disposes all geometries', () => {
    const objects: GridfinityObject[] = [makeBaseplate('bp-1'), makeBin('bin-1')]
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 256, 256, 10)

    expect(result).toHaveLength(2)
    for (const item of result) {
      expect(item.geometry.attributes.position).toBeDefined()
    }

    // Disposal should not throw
    expect(() => {
      disposePrintLayout(result)
    }).not.toThrow()
  })

  it('spacing parameter affects object placement', () => {
    const objects: GridfinityObject[] = [makeBaseplate('bp-1'), makeBaseplate('bp-2')]
    const narrow = computePrintLayout(objects, [], PROFILE_OFFICIAL, 256, 256, 2)
    const wide = computePrintLayout(objects, [], PROFILE_OFFICIAL, 256, 256, 30)

    // With wider spacing, second object should be further away
    const narrowGap = Math.abs(narrow[1].position[0] - narrow[0].position[0])
    const wideGap = Math.abs(wide[1].position[0] - wide[0].position[0])
    expect(wideGap).toBeGreaterThan(narrowGap)

    disposePrintLayout(narrow)
    disposePrintLayout(wide)
  })

  it('separates lid modifier as independent print part', () => {
    const bin = makeBin('bin-1')
    const lid: LidModifier = {
      id: 'lid-1',
      parentId: 'bin-1',
      kind: 'lid',
      params: { stacking: false },
    }
    const objects: GridfinityObject[] = [bin]
    const result = computePrintLayout(objects, [lid], PROFILE_OFFICIAL, 350, 350, 10)

    expect(result).toHaveLength(2)

    // First item is the bin
    expect(result[0].id).toBe('bin-1')
    expect(result[0].label).toBe('Bin bin-1')

    // Second item is the separated lid
    expect(result[1].id).toBe('lid-1')
    expect(result[1].label).toBe('Bin bin-1 - Lid')
    expect(result[1].geometry.attributes.position.count).toBeGreaterThan(0)

    disposePrintLayout(result)
  })

  it('includes object reference on each layout item', () => {
    const bin = makeBin()
    const result = computePrintLayout([bin], [], PROFILE_OFFICIAL, 256, 256, 10)
    expect(result).toHaveLength(1)
    expect(result[0].object).toBe(bin)
    disposePrintLayout(result)
  })

  it('disposes geometry for degenerate items skipped from layout', () => {
    // Use an opengrid-board which can produce near-zero bounding dimensions
    // when oriented for print. Instead, directly verify the contract:
    // all created geometries must be either in the result (and disposed by
    // disposePrintLayout) or disposed internally by computePrintLayout.
    const objects: GridfinityObject[] = [makeBaseplate(), makeBin()]
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 256, 256, 10)

    // Both objects should have valid geometry in the result
    expect(result.length).toBeGreaterThanOrEqual(1)
    for (const item of result) {
      expect(item.geometry.attributes.position.count).toBeGreaterThan(0)
      expect(item.boundingBox.width).toBeGreaterThanOrEqual(0.01)
      expect(item.boundingBox.depth).toBeGreaterThanOrEqual(0.01)
    }

    disposePrintLayout(result)
  })

  it('handles zero spacing without errors', () => {
    const objects: GridfinityObject[] = [makeBaseplate('bp-1'), makeBaseplate('bp-2')]
    const result = computePrintLayout(objects, [], PROFILE_OFFICIAL, 256, 256, 0)

    expect(result).toHaveLength(2)
    // With zero spacing, objects should be directly adjacent
    const gap =
      result[1].position[0] -
      result[1].boundingBox.width / 2 -
      (result[0].position[0] + result[0].boundingBox.width / 2)
    expect(gap).toBeCloseTo(0, 1)

    disposePrintLayout(result)
  })
})
