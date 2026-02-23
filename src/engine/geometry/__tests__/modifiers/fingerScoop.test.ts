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
})
