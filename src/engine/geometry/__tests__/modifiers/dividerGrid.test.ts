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
})
