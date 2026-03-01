import { describe, it, expect } from 'vitest'
import { generateScoop } from '../../modifiers/scoop'
import { PROFILE_OFFICIAL } from '../../../constants'
import type { ScoopModifierParams, ModifierContext } from '@/types/gridfinity'

describe('generateScoop', () => {
  const defaultContext: ModifierContext = {
    innerWidth: 38.1,
    innerDepth: 38.1,
    wallHeight: 21,
    floorY: 5.85,
    centerX: 0,
    centerZ: 0,
  }

  const defaultParams: ScoopModifierParams = {
    wall: 'front',
    radius: 0,
  }

  it('generates geometry with vertices and faces', () => {
    const geometry = generateScoop(defaultParams, defaultContext, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('auto radius (0) produces valid geometry', () => {
    const geometry = generateScoop({ wall: 'front', radius: 0 }, defaultContext, PROFILE_OFFICIAL)
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('explicit radius produces valid geometry', () => {
    const geometry = generateScoop({ wall: 'front', radius: 10 }, defaultContext, PROFILE_OFFICIAL)
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('wall targeting changes bounding box position', () => {
    const frontGeo = generateScoop({ wall: 'front', radius: 0 }, defaultContext, PROFILE_OFFICIAL)
    const backGeo = generateScoop({ wall: 'back', radius: 0 }, defaultContext, PROFILE_OFFICIAL)

    frontGeo.computeBoundingBox()
    backGeo.computeBoundingBox()

    // Front wall at -Z, back wall at +Z
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(frontGeo.boundingBox!.min.z).toBeLessThan(backGeo.boundingBox!.min.z)

    frontGeo.dispose()
    backGeo.dispose()
  })

  it('geometry height fits within wall height', () => {
    const geometry = generateScoop(defaultParams, defaultContext, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!

    // Scoop height should be bounded by the wall
    const scoopHeight = box.max.y - box.min.y
    expect(scoopHeight).toBeLessThanOrEqual(defaultContext.wallHeight + 1)
    expect(scoopHeight).toBeGreaterThan(0)

    geometry.dispose()
  })

  it('returns empty geometry when wallHeight <= 0', () => {
    const zeroCtx = { ...defaultContext, wallHeight: 0 }
    const geometry = generateScoop(defaultParams, zeroCtx, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeUndefined()
    geometry.dispose()
  })

  it('returns empty geometry when span is zero', () => {
    const zeroWidthCtx = { ...defaultContext, innerWidth: 0 }
    const geometry = generateScoop({ wall: 'front', radius: 0 }, zeroWidthCtx, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeUndefined()
    geometry.dispose()
  })

  it('returns empty geometry when span is negative', () => {
    const negCtx = { ...defaultContext, innerDepth: -5 }
    const geometry = generateScoop({ wall: 'left', radius: 0 }, negCtx, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeUndefined()
    geometry.dispose()
  })

  it('front/back scoop X-extent matches innerWidth on asymmetric context', () => {
    const asymCtx: ModifierContext = {
      innerWidth: 50,
      innerDepth: 30,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 0,
      centerZ: 0,
    }

    const frontGeo = generateScoop({ wall: 'front', radius: 8 }, asymCtx, PROFILE_OFFICIAL)
    const backGeo = generateScoop({ wall: 'back', radius: 8 }, asymCtx, PROFILE_OFFICIAL)

    frontGeo.computeBoundingBox()
    backGeo.computeBoundingBox()

    // Front/back scoops span along X, which should match innerWidth (50), not innerDepth (30)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const frontXExtent = frontGeo.boundingBox!.max.x - frontGeo.boundingBox!.min.x
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const backXExtent = backGeo.boundingBox!.max.x - backGeo.boundingBox!.min.x

    // X extent should be close to innerWidth (50), not innerDepth (30)
    expect(frontXExtent).toBeGreaterThan(40)
    expect(backXExtent).toBeGreaterThan(40)

    frontGeo.dispose()
    backGeo.dispose()
  })

  it('left/right scoop Z-extent matches innerDepth on asymmetric context', () => {
    const asymCtx: ModifierContext = {
      innerWidth: 50,
      innerDepth: 30,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 0,
      centerZ: 0,
    }

    const leftGeo = generateScoop({ wall: 'left', radius: 8 }, asymCtx, PROFILE_OFFICIAL)
    const rightGeo = generateScoop({ wall: 'right', radius: 8 }, asymCtx, PROFILE_OFFICIAL)

    leftGeo.computeBoundingBox()
    rightGeo.computeBoundingBox()

    // Left/right scoops span along Z, which should match innerDepth (30), not innerWidth (50)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const leftZExtent = leftGeo.boundingBox!.max.z - leftGeo.boundingBox!.min.z
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rightZExtent = rightGeo.boundingBox!.max.z - rightGeo.boundingBox!.min.z

    // Z extent should be close to innerDepth (30), not innerWidth (50)
    expect(leftZExtent).toBeGreaterThan(20)
    expect(leftZExtent).toBeLessThan(40)
    expect(rightZExtent).toBeGreaterThan(20)
    expect(rightZExtent).toBeLessThan(40)

    leftGeo.dispose()
    rightGeo.dispose()
  })

  it('generates on left and right walls', () => {
    const leftGeo = generateScoop({ wall: 'left', radius: 0 }, defaultContext, PROFILE_OFFICIAL)
    const rightGeo = generateScoop({ wall: 'right', radius: 0 }, defaultContext, PROFILE_OFFICIAL)

    leftGeo.computeBoundingBox()
    rightGeo.computeBoundingBox()

    // Left wall at -X, right wall at +X
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(leftGeo.boundingBox!.min.x).toBeLessThan(rightGeo.boundingBox!.min.x)

    leftGeo.dispose()
    rightGeo.dispose()
  })
})
