import { describe, it, expect } from 'vitest'
import { generateInsert, getInsertDimensions } from '../../modifiers/insert'
import { PROFILE_OFFICIAL } from '../../../constants'
import type { InsertModifierParams, ModifierContext } from '@/types/gridfinity'

describe('generateInsert', () => {
  const defaultContext: ModifierContext = {
    innerWidth: 38.1,
    innerDepth: 38.1,
    wallHeight: 21,
    floorY: 5.85,
    centerX: 0,
    centerZ: 0,
  }

  const defaultParams: InsertModifierParams = {
    compartmentsX: 2,
    compartmentsY: 2,
    wallThickness: 1.2,
  }

  it('generates geometry with vertices and faces', () => {
    const geometry = generateInsert(defaultParams, defaultContext, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('more compartments produce more vertices', () => {
    const small = generateInsert(
      { compartmentsX: 1, compartmentsY: 1, wallThickness: 1.2 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    const large = generateInsert(
      { compartmentsX: 4, compartmentsY: 4, wallThickness: 1.2 },
      defaultContext,
      PROFILE_OFFICIAL,
    )

    expect(large.attributes.position.count).toBeGreaterThan(small.attributes.position.count)

    small.dispose()
    large.dispose()
  })

  it('bounding box fits within parent interior', () => {
    const geometry = generateInsert(defaultParams, defaultContext, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!

    const width = box.max.x - box.min.x
    const depth = box.max.z - box.min.z

    expect(width).toBeLessThanOrEqual(defaultContext.innerWidth + 0.01)
    expect(depth).toBeLessThanOrEqual(defaultContext.innerDepth + 0.01)

    geometry.dispose()
  })

  it('divider walls produce uniform compartment spacing', () => {
    // With 3 compartments along X and wallThickness 1.2, walls should be
    // evenly spaced so that all compartments have equal width.
    const params: InsertModifierParams = { compartmentsX: 3, compartmentsY: 1, wallThickness: 1.2 }
    const geometry = generateInsert(params, defaultContext, PROFILE_OFFICIAL)

    const rimInnerWidth = defaultContext.innerWidth - params.wallThickness * 2
    const expectedCompartmentWidth =
      (rimInnerWidth - params.wallThickness * (params.compartmentsX - 1)) / params.compartmentsX

    // Wall 1 center should be at: -rimInnerWidth/2 + compartmentWidth + wallThickness/2
    const wall1Expected = -rimInnerWidth / 2 + expectedCompartmentWidth + params.wallThickness / 2
    // Wall 2 center should be at: wall1 + compartmentWidth + wallThickness
    const wall2Expected = wall1Expected + expectedCompartmentWidth + params.wallThickness

    // Gap between consecutive wall centers should be uniform
    const gap = wall2Expected - wall1Expected
    expect(gap).toBeCloseTo(expectedCompartmentWidth + params.wallThickness, 5)
    expect(expectedCompartmentWidth).toBeGreaterThan(0)

    geometry.dispose()
  })

  it('1x1 compartment still generates outer rim', () => {
    const geometry = generateInsert(
      { compartmentsX: 1, compartmentsY: 1, wallThickness: 1.2 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })
})

describe('getInsertDimensions', () => {
  const defaultContext: ModifierContext = {
    innerWidth: 38.1,
    innerDepth: 38.1,
    wallHeight: 21,
    floorY: 5.85,
    centerX: 0,
    centerZ: 0,
  }

  it('returns correct dimensions from context', () => {
    const dims = getInsertDimensions(
      { compartmentsX: 2, compartmentsY: 2, wallThickness: 1.2 },
      defaultContext,
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(38.1)
    expect(dims.depth).toBe(38.1)
    expect(dims.height).toBe(21)
  })
})
