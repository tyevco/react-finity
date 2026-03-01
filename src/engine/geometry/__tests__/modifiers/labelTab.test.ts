import { describe, it, expect } from 'vitest'
import { generateLabelTab } from '../../modifiers/labelTab'
import { PROFILE_OFFICIAL } from '../../../constants'
import type { LabelTabModifierParams, ModifierContext } from '@/types/gridfinity'

describe('generateLabelTab', () => {
  const defaultContext: ModifierContext = {
    innerWidth: 38.1,
    innerDepth: 38.1,
    wallHeight: 21,
    floorY: 5.85,
    centerX: 0,
    centerZ: 0,
  }

  const defaultParams: LabelTabModifierParams = {
    wall: 'front',
    angle: 45,
    height: 7,
  }

  it('generates geometry with vertices and faces', () => {
    const geometry = generateLabelTab(defaultParams, defaultContext, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('wall targeting changes bounding box position', () => {
    const frontGeo = generateLabelTab(
      { ...defaultParams, wall: 'front' },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    const backGeo = generateLabelTab(
      { ...defaultParams, wall: 'back' },
      defaultContext,
      PROFILE_OFFICIAL,
    )

    frontGeo.computeBoundingBox()
    backGeo.computeBoundingBox()

    // Front wall is at -Z, back wall is at +Z
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(frontGeo.boundingBox!.min.z).toBeLessThan(backGeo.boundingBox!.min.z)

    frontGeo.dispose()
    backGeo.dispose()
  })

  it('handles extreme angle of 0 degrees without error', () => {
    const geometry = generateLabelTab(
      { ...defaultParams, angle: 0 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('handles extreme angle of 90 degrees without error', () => {
    const geometry = generateLabelTab(
      { ...defaultParams, angle: 90 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('different angles produce geometry', () => {
    const geo30 = generateLabelTab(
      { ...defaultParams, angle: 30 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    const geo60 = generateLabelTab(
      { ...defaultParams, angle: 60 },
      defaultContext,
      PROFILE_OFFICIAL,
    )

    expect(geo30.attributes.position.count).toBeGreaterThan(0)
    expect(geo60.attributes.position.count).toBeGreaterThan(0)

    geo30.dispose()
    geo60.dispose()
  })

  it('different heights affect geometry', () => {
    const small = generateLabelTab(
      { ...defaultParams, height: 5 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    const large = generateLabelTab(
      { ...defaultParams, height: 14 },
      defaultContext,
      PROFILE_OFFICIAL,
    )

    small.computeBoundingBox()
    large.computeBoundingBox()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const smallHeight = small.boundingBox!.max.y - small.boundingBox!.min.y
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const largeHeight = large.boundingBox!.max.y - large.boundingBox!.min.y

    expect(largeHeight).toBeGreaterThan(smallHeight)

    small.dispose()
    large.dispose()
  })

  it('returns empty geometry when wallHeight is 0', () => {
    const zeroCtx = { ...defaultContext, wallHeight: 0 }
    const geometry = generateLabelTab(defaultParams, zeroCtx, PROFILE_OFFICIAL)
    expect(geometry.attributes.position).toBeUndefined()
    geometry.dispose()
  })

  it('clamps height to 40% of wallHeight', () => {
    // height=100 on wallHeight=21 should clamp to 8.4
    const geometry = generateLabelTab(
      { ...defaultParams, height: 100 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    geometry.computeBoundingBox()
    const box = geometry.boundingBox! // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const geoHeight = box.max.y - box.min.y
    // Clamped to wallHeight * 0.4 = 8.4, so geometry height should be <= 8.5
    expect(geoHeight).toBeLessThanOrEqual(defaultContext.wallHeight * 0.4 + 0.5)
    geometry.dispose()
  })

  it('clamps tab depth to bin interior dimensions at shallow angles', () => {
    // At angle=5 (min clamp), tabDepthVal would be height/tan(5deg) = huge
    // With the clamp, it should stay within innerWidth/innerDepth
    const geometry = generateLabelTab(
      { ...defaultParams, angle: 5 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    geometry.computeBoundingBox()
    const box = geometry.boundingBox! // eslint-disable-line @typescript-eslint/no-non-null-assertion

    // Bounding box should fit within the bin's inner dimensions
    const geoWidth = Math.abs(box.max.x - box.min.x)
    const geoDepth = Math.abs(box.max.z - box.min.z)
    expect(geoWidth).toBeLessThanOrEqual(defaultContext.innerWidth + 1)
    expect(geoDepth).toBeLessThanOrEqual(defaultContext.innerDepth + 1)

    geometry.dispose()
  })

  it('front/back tab X-extent approximates span on asymmetric context', () => {
    const asymCtx: ModifierContext = {
      innerWidth: 50,
      innerDepth: 30,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 0,
      centerZ: 0,
    }

    const frontGeo = generateLabelTab(
      { ...defaultParams, wall: 'front' },
      asymCtx,
      PROFILE_OFFICIAL,
    )
    const backGeo = generateLabelTab({ ...defaultParams, wall: 'back' }, asymCtx, PROFILE_OFFICIAL)

    frontGeo.computeBoundingBox()
    backGeo.computeBoundingBox()

    // Front/back tabs span along X. Span = 80% of innerWidth = 40
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const frontXExtent = frontGeo.boundingBox!.max.x - frontGeo.boundingBox!.min.x
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const backXExtent = backGeo.boundingBox!.max.x - backGeo.boundingBox!.min.x

    // X extent should be close to 80% of innerWidth (40), not 80% of innerDepth (24)
    expect(frontXExtent).toBeGreaterThan(35)
    expect(backXExtent).toBeGreaterThan(35)

    frontGeo.dispose()
    backGeo.dispose()
  })

  it('left/right tab Z-extent approximates span on asymmetric context', () => {
    const asymCtx: ModifierContext = {
      innerWidth: 50,
      innerDepth: 30,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 0,
      centerZ: 0,
    }

    const leftGeo = generateLabelTab({ ...defaultParams, wall: 'left' }, asymCtx, PROFILE_OFFICIAL)
    const rightGeo = generateLabelTab(
      { ...defaultParams, wall: 'right' },
      asymCtx,
      PROFILE_OFFICIAL,
    )

    leftGeo.computeBoundingBox()
    rightGeo.computeBoundingBox()

    // Left/right tabs span along Z. Span = 80% of innerDepth = 24
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const leftZExtent = leftGeo.boundingBox!.max.z - leftGeo.boundingBox!.min.z
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rightZExtent = rightGeo.boundingBox!.max.z - rightGeo.boundingBox!.min.z

    // Z extent should be close to 80% of innerDepth (24), not 80% of innerWidth (40)
    expect(leftZExtent).toBeGreaterThan(20)
    expect(leftZExtent).toBeLessThan(35)
    expect(rightZExtent).toBeGreaterThan(20)
    expect(rightZExtent).toBeLessThan(35)

    leftGeo.dispose()
    rightGeo.dispose()
  })

  it('front tab depth is clamped by innerDepth on asymmetric context', () => {
    // For front/back walls, tab extends inward along Z, so depth limit is innerDepth
    const asymCtx: ModifierContext = {
      innerWidth: 80,
      innerDepth: 10,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 0,
      centerZ: 0,
    }

    // Use a shallow angle so tab depth would be large without clamping
    const frontGeo = generateLabelTab(
      { ...defaultParams, wall: 'front', angle: 5 },
      asymCtx,
      PROFILE_OFFICIAL,
    )
    frontGeo.computeBoundingBox()
    const box = frontGeo.boundingBox! // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const tabZExtent = Math.abs(box.max.z - box.min.z)

    // Tab depth should be clamped to innerDepth (10), not innerWidth (80)
    expect(tabZExtent).toBeLessThanOrEqual(asymCtx.innerDepth + 1)

    frontGeo.dispose()
  })

  it('left tab depth is clamped by innerWidth on asymmetric context', () => {
    // For left/right walls, tab extends inward along X, so depth limit is innerWidth
    const asymCtx: ModifierContext = {
      innerWidth: 10,
      innerDepth: 80,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 0,
      centerZ: 0,
    }

    const leftGeo = generateLabelTab(
      { ...defaultParams, wall: 'left', angle: 5 },
      asymCtx,
      PROFILE_OFFICIAL,
    )
    leftGeo.computeBoundingBox()
    const box = leftGeo.boundingBox! // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const tabXExtent = Math.abs(box.max.x - box.min.x)

    // Tab depth should be clamped to innerWidth (10), not innerDepth (80)
    expect(tabXExtent).toBeLessThanOrEqual(asymCtx.innerWidth + 1)

    leftGeo.dispose()
  })

  it('generates on left and right walls', () => {
    const leftGeo = generateLabelTab(
      { ...defaultParams, wall: 'left' },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    const rightGeo = generateLabelTab(
      { ...defaultParams, wall: 'right' },
      defaultContext,
      PROFILE_OFFICIAL,
    )

    leftGeo.computeBoundingBox()
    rightGeo.computeBoundingBox()

    // Left wall is at -X, right wall is at +X
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(leftGeo.boundingBox!.min.x).toBeLessThan(rightGeo.boundingBox!.min.x)

    leftGeo.dispose()
    rightGeo.dispose()
  })
})
