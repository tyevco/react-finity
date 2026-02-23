import { describe, it, expect, beforeAll } from 'vitest'
import { computePrintLayout, disposePrintLayout } from '../printLayout'
import { PROFILE_OFFICIAL } from '../../constants'
import type { BaseplateObject, BinObject, GridfinityObject } from '@/types/gridfinity'
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
    params: { gridWidth: 1, gridDepth: 1, magnetHoles: false, screwHoles: false },
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
})
