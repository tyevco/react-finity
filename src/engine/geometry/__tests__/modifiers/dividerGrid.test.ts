import { describe, it, expect } from 'vitest'
import { generateDividerGrid } from '../../modifiers/dividerGrid'
import { PROFILE_OFFICIAL } from '../../../constants'
import type { DividerGridModifierParams, ModifierContext } from '@/types/gridfinity'

describe('generateDividerGrid', () => {
  const defaultContext: ModifierContext = {
    innerWidth: 38.1,
    innerDepth: 38.1,
    wallHeight: 21,
    floorY: 5.85,
    centerX: 0,
    centerZ: 0,
  }

  const defaultParams: DividerGridModifierParams = {
    dividersX: 1,
    dividersY: 1,
    wallThickness: 1.2,
  }

  it('generates geometry with vertices and faces', () => {
    const geometry = generateDividerGrid(defaultParams, defaultContext, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('returns empty geometry for 0/0 dividers', () => {
    const params: DividerGridModifierParams = {
      dividersX: 0,
      dividersY: 0,
      wallThickness: 1.2,
    }
    const geometry = generateDividerGrid(params, defaultContext, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    // Empty BufferGeometry has no position attribute
    expect(geometry.attributes.position).toBeUndefined()
    geometry.dispose()
  })

  it('more dividers produce more vertices', () => {
    const small = generateDividerGrid(
      { dividersX: 1, dividersY: 0, wallThickness: 1.2 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    const large = generateDividerGrid(
      { dividersX: 3, dividersY: 2, wallThickness: 1.2 },
      defaultContext,
      PROFILE_OFFICIAL,
    )

    expect(large.attributes.position.count).toBeGreaterThan(small.attributes.position.count)

    small.dispose()
    large.dispose()
  })

  it('bounding box fits within parent interior', () => {
    const geometry = generateDividerGrid(defaultParams, defaultContext, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!

    const width = box.max.x - box.min.x
    const depth = box.max.z - box.min.z

    expect(width).toBeLessThanOrEqual(defaultContext.innerWidth + 0.01)
    expect(depth).toBeLessThanOrEqual(defaultContext.innerDepth + 0.01)

    geometry.dispose()
  })

  it('dividers only along X produce geometry spanning depth', () => {
    const params: DividerGridModifierParams = {
      dividersX: 2,
      dividersY: 0,
      wallThickness: 1.2,
    }
    const geometry = generateDividerGrid(params, defaultContext, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('returns empty geometry when wallHeight is zero', () => {
    const context = { ...defaultContext, wallHeight: 0 }
    const geometry = generateDividerGrid(defaultParams, context, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeUndefined()
    geometry.dispose()
  })

  it('returns empty geometry when wallHeight is negative', () => {
    const context = { ...defaultContext, wallHeight: -1 }
    const geometry = generateDividerGrid(defaultParams, context, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeUndefined()
    geometry.dispose()
  })

  it('dividers only along Y produce geometry spanning width', () => {
    const params: DividerGridModifierParams = {
      dividersX: 0,
      dividersY: 2,
      wallThickness: 1.2,
    }
    const geometry = generateDividerGrid(params, defaultContext, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('divider wall positions align with compartment boundaries for 2 dividers', () => {
    // With 2 dividers along X, there are 3 compartments. The divider walls
    // should account for wall thickness so compartments have equal width.
    const context: ModifierContext = {
      innerWidth: 50,
      innerDepth: 30,
      wallHeight: 20,
      floorY: 0,
      centerX: 0,
      centerZ: 0,
    }
    const params: DividerGridModifierParams = {
      dividersX: 2,
      dividersY: 0,
      wallThickness: 1.2,
    }
    const geometry = generateDividerGrid(params, context, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!

    // Compartment width: (50 - 1.2*2) / 3 = 15.867
    const cw =
      (context.innerWidth - params.wallThickness * params.dividersX) / (params.dividersX + 1)
    // First divider center: -25 + cw + wallThickness/2
    const wall1Center = -context.innerWidth / 2 + cw + params.wallThickness / 2
    // Second divider center: wall1 + cw + wallThickness
    const wall2Center = wall1Center + cw + params.wallThickness

    // Bounding box should span from (wall1 - wt/2) to (wall2 + wt/2)
    expect(box.min.x).toBeCloseTo(wall1Center - params.wallThickness / 2, 1)
    expect(box.max.x).toBeCloseTo(wall2Center + params.wallThickness / 2, 1)

    geometry.dispose()
  })

  it('divider wall positions align with compartment boundaries for 3 dividers along Z', () => {
    const context: ModifierContext = {
      innerWidth: 30,
      innerDepth: 60,
      wallHeight: 15,
      floorY: 0,
      centerX: 0,
      centerZ: 0,
    }
    const params: DividerGridModifierParams = {
      dividersX: 0,
      dividersY: 3,
      wallThickness: 2.0,
    }
    const geometry = generateDividerGrid(params, context, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!

    // Compartment depth: (60 - 2.0*3) / 4 = 13.5
    const cd =
      (context.innerDepth - params.wallThickness * params.dividersY) / (params.dividersY + 1)
    // First divider center: -30 + cd + wt/2
    const firstWallCenter = -context.innerDepth / 2 + cd + params.wallThickness / 2
    // Last divider center: firstWall + 2 * (cd + wt)
    const lastWallCenter = firstWallCenter + 2 * (cd + params.wallThickness)

    expect(box.min.z).toBeCloseTo(firstWallCenter - params.wallThickness / 2, 1)
    expect(box.max.z).toBeCloseTo(lastWallCenter + params.wallThickness / 2, 1)

    geometry.dispose()
  })

  it('returns empty geometry when walls exceed available space', () => {
    const context: ModifierContext = {
      innerWidth: 10,
      innerDepth: 10,
      wallHeight: 10,
      floorY: 0,
      centerX: 0,
      centerZ: 0,
    }
    const params: DividerGridModifierParams = {
      dividersX: 3,
      dividersY: 0,
      wallThickness: 5.0,
    }
    // 3 walls * 5mm = 15mm in a 10mm space -> compartmentWidth = (10-15)/4 = -1.25
    const geometry = generateDividerGrid(params, context, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeUndefined()
    geometry.dispose()
  })

  it('handles thick walls that consume most of the available space', () => {
    const context: ModifierContext = {
      innerWidth: 20,
      innerDepth: 20,
      wallHeight: 10,
      floorY: 0,
      centerX: 0,
      centerZ: 0,
    }
    const params: DividerGridModifierParams = {
      dividersX: 3,
      dividersY: 3,
      wallThickness: 4.0,
    }
    // 4 compartments with 3 walls of 4mm each = 12mm of walls in 20mm space
    // Compartment size = (20 - 12) / 4 = 2mm each
    const geometry = generateDividerGrid(params, context, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)

    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!
    const width = box.max.x - box.min.x
    // Should still fit within innerWidth
    expect(width).toBeLessThanOrEqual(context.innerWidth + 0.01)

    geometry.dispose()
  })
})
