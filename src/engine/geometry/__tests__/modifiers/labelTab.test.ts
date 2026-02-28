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
