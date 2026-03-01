import { describe, it, expect } from 'vitest'
import { generateFingerScoop } from '../../modifiers/fingerScoop'
import { PROFILE_OFFICIAL } from '../../../constants'
import type { FingerScoopModifierParams, ModifierContext } from '@/types/gridfinity'

describe('generateFingerScoop', () => {
  const defaultContext: ModifierContext = {
    innerWidth: 39.1,
    innerDepth: 39.1,
    wallHeight: 21,
    floorY: 5.85,
    centerX: 0,
    centerZ: 0,
  }

  const defaultParams: FingerScoopModifierParams = {
    wall: 'front',
    width: 20,
    depth: 15,
  }

  it('generates valid geometry with vertices and faces', () => {
    const geo = generateFingerScoop(defaultParams, defaultContext, PROFILE_OFFICIAL)
    expect(geo).toBeDefined()
    expect(geo.attributes.position).toBeDefined()
    expect(geo.attributes.position.count).toBeGreaterThan(0)
    expect(geo.index).toBeDefined()
    geo.dispose()
  })

  it('generates geometry for all four walls', () => {
    const walls = ['front', 'back', 'left', 'right'] as const
    for (const wall of walls) {
      const geo = generateFingerScoop({ ...defaultParams, wall }, defaultContext, PROFILE_OFFICIAL)
      expect(geo.attributes.position.count).toBeGreaterThan(0)
      geo.dispose()
    }
  })

  it('wider scoop has more vertices', () => {
    const narrow = generateFingerScoop(
      { ...defaultParams, width: 10 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    const wide = generateFingerScoop(
      { ...defaultParams, width: 30 },
      defaultContext,
      PROFILE_OFFICIAL,
    )

    // Wider scoop should produce at least as many vertices
    expect(wide.attributes.position.count).toBeGreaterThanOrEqual(narrow.attributes.position.count)

    narrow.dispose()
    wide.dispose()
  })

  it('geometry is positioned near the top of the wall', () => {
    const geo = generateFingerScoop(defaultParams, defaultContext, PROFILE_OFFICIAL)
    geo.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geo.boundingBox!

    const wallTopY = defaultContext.floorY + defaultContext.wallHeight
    // The top of the geometry should extend above the wall top (includes overshoot)
    expect(box.max.y).toBeGreaterThan(wallTopY - 1)
    // The bottom should be at wallTopY - depth
    expect(box.min.y).toBeCloseTo(wallTopY - defaultParams.depth, 0)

    geo.dispose()
  })

  it('front/back scoops positioned at correct Z on asymmetric context', () => {
    const asymCtx: ModifierContext = {
      innerWidth: 50,
      innerDepth: 30,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 0,
      centerZ: 0,
    }

    const frontGeo = generateFingerScoop(
      { ...defaultParams, wall: 'front' },
      asymCtx,
      PROFILE_OFFICIAL,
    )
    const backGeo = generateFingerScoop(
      { ...defaultParams, wall: 'back' },
      asymCtx,
      PROFILE_OFFICIAL,
    )

    frontGeo.computeBoundingBox()
    backGeo.computeBoundingBox()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const frontBox = frontGeo.boundingBox!
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const backBox = backGeo.boundingBox!

    // Front scoop should be near -innerDepth/2 (-15)
    expect(frontBox.min.z).toBeLessThan(-10)
    // Back scoop should be near +innerDepth/2 (+15)
    expect(backBox.max.z).toBeGreaterThan(10)

    frontGeo.dispose()
    backGeo.dispose()
  })

  it('left/right scoops positioned at correct X on asymmetric context', () => {
    const asymCtx: ModifierContext = {
      innerWidth: 50,
      innerDepth: 30,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 0,
      centerZ: 0,
    }

    const leftGeo = generateFingerScoop(
      { ...defaultParams, wall: 'left' },
      asymCtx,
      PROFILE_OFFICIAL,
    )
    const rightGeo = generateFingerScoop(
      { ...defaultParams, wall: 'right' },
      asymCtx,
      PROFILE_OFFICIAL,
    )

    leftGeo.computeBoundingBox()
    rightGeo.computeBoundingBox()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const leftBox = leftGeo.boundingBox!
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rightBox = rightGeo.boundingBox!

    // Left scoop should be near -innerWidth/2 (-25)
    expect(leftBox.min.x).toBeLessThan(-20)
    // Right scoop should be near +innerWidth/2 (+25)
    expect(rightBox.max.x).toBeGreaterThan(20)

    leftGeo.dispose()
    rightGeo.dispose()
  })

  it('clamps width to span when width exceeds available space', () => {
    const geo = generateFingerScoop(
      { wall: 'front', width: 200, depth: 15 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    geo.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geo.boundingBox!
    const xExtent = box.max.x - box.min.x

    // Should be clamped to innerWidth, not 200
    expect(xExtent).toBeLessThanOrEqual(defaultContext.innerWidth + 1)
    expect(xExtent).toBeGreaterThan(0)

    geo.dispose()
  })

  it('clamps depth to 90% of wallHeight', () => {
    const geo = generateFingerScoop(
      { wall: 'front', width: 20, depth: 200 },
      defaultContext,
      PROFILE_OFFICIAL,
    )
    geo.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geo.boundingBox!

    const wallTopY = defaultContext.floorY + defaultContext.wallHeight
    const maxDepth = defaultContext.wallHeight * 0.9
    // The geometry should extend from (wallTop - clampedDepth) to wallTop + overshoot
    expect(box.min.y).toBeCloseTo(wallTopY - maxDepth, 0)

    geo.dispose()
  })

  it('returns empty geometry when wallHeight is zero', () => {
    const zeroCtx = { ...defaultContext, wallHeight: 0 }
    const geo = generateFingerScoop(defaultParams, zeroCtx, PROFILE_OFFICIAL)
    expect(geo.attributes.position).toBeUndefined()
    geo.dispose()
  })

  it('returns empty geometry when wallHeight is negative', () => {
    const negCtx = { ...defaultContext, wallHeight: -5 }
    const geo = generateFingerScoop(defaultParams, negCtx, PROFILE_OFFICIAL)
    expect(geo.attributes.position).toBeUndefined()
    geo.dispose()
  })

  it('respects non-zero center offsets', () => {
    const offsetCtx: ModifierContext = {
      innerWidth: 39.1,
      innerDepth: 39.1,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 10,
      centerZ: 15,
    }

    const geo = generateFingerScoop(defaultParams, offsetCtx, PROFILE_OFFICIAL)
    geo.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geo.boundingBox!

    // Front wall scoop should be centered around centerX=10
    const midX = (box.max.x + box.min.x) / 2
    expect(midX).toBeCloseTo(10, 0)

    geo.dispose()
  })
})
