import { describe, it, expect } from 'vitest'
import { generateLid, getLidDimensions } from '../../modifiers/lid'
import { PROFILE_OFFICIAL } from '../../../constants'
import type { LidModifierParams, ModifierContext } from '@/types/gridfinity'

describe('generateLid', () => {
  const defaultContext: ModifierContext = {
    innerWidth: 38.1,
    innerDepth: 38.1,
    wallHeight: 21,
    floorY: 5.85,
    centerX: 0,
    centerZ: 0,
  }

  it('generates flat lid geometry with vertices and faces', () => {
    const params: LidModifierParams = { stacking: false }
    const geometry = generateLid(params, defaultContext, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('generates stacking lid geometry with vertices and faces', () => {
    const params: LidModifierParams = { stacking: true }
    const geometry = generateLid(params, defaultContext, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('stacking lid has more vertices than flat lid', () => {
    const flat = generateLid({ stacking: false }, defaultContext, PROFILE_OFFICIAL)
    const stacking = generateLid({ stacking: true }, defaultContext, PROFILE_OFFICIAL)

    expect(stacking.attributes.position.count).toBeGreaterThan(flat.attributes.position.count)

    flat.dispose()
    stacking.dispose()
  })

  it('stacking lid is taller than flat lid', () => {
    const flat = generateLid({ stacking: false }, defaultContext, PROFILE_OFFICIAL)
    const stacking = generateLid({ stacking: true }, defaultContext, PROFILE_OFFICIAL)

    flat.computeBoundingBox()
    stacking.computeBoundingBox()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const flatHeight = flat.boundingBox!.max.y - flat.boundingBox!.min.y
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const stackingHeight = stacking.boundingBox!.max.y - stacking.boundingBox!.min.y

    expect(stackingHeight).toBeGreaterThan(flatHeight)

    flat.dispose()
    stacking.dispose()
  })

  it('lid width matches expected dimensions', () => {
    const geometry = generateLid({ stacking: false }, defaultContext, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!

    const width = box.max.x - box.min.x
    const depth = box.max.z - box.min.z

    // Lid width = innerWidth + 2 = 40.1
    expect(width).toBeCloseTo(40.1, 0)
    expect(depth).toBeCloseTo(40.1, 0)

    geometry.dispose()
  })

  it('returns empty geometry when innerWidth is zero', () => {
    const zeroCtx: ModifierContext = { ...defaultContext, innerWidth: 0 }
    const geo = generateLid({ stacking: false }, zeroCtx, PROFILE_OFFICIAL)
    expect(geo.attributes.position).toBeUndefined()
    geo.dispose()
  })

  it('returns empty geometry when innerDepth is negative', () => {
    const negCtx: ModifierContext = { ...defaultContext, innerDepth: -5 }
    const geo = generateLid({ stacking: true }, negCtx, PROFILE_OFFICIAL)
    expect(geo.attributes.position).toBeUndefined()
    geo.dispose()
  })

  it('skips lip when inner dimensions are too small', () => {
    // lipInnerWidth = innerWidth - lipThickness*2 = 1.5 - 2.0 = -0.5 → skip lip
    const tinyContext: ModifierContext = {
      innerWidth: 1.5,
      innerDepth: 1.5,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 0,
      centerZ: 0,
    }
    const withLip = generateLid({ stacking: false }, defaultContext, PROFILE_OFFICIAL)
    const withoutLip = generateLid({ stacking: false }, tinyContext, PROFILE_OFFICIAL)

    // Both should produce valid geometry
    expect(withLip.attributes.position.count).toBeGreaterThan(0)
    expect(withoutLip.attributes.position.count).toBeGreaterThan(0)

    // The tiny context version should have fewer vertices (no lip rim)
    expect(withoutLip.attributes.position.count).toBeLessThan(withLip.attributes.position.count)

    withLip.dispose()
    withoutLip.dispose()
  })

  it('stacking rim sits above the slab', () => {
    const flatGeo = generateLid({ stacking: false }, defaultContext, PROFILE_OFFICIAL)
    const stackGeo = generateLid({ stacking: true }, defaultContext, PROFILE_OFFICIAL)

    flatGeo.computeBoundingBox()
    stackGeo.computeBoundingBox()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const flatTop = flatGeo.boundingBox!.max.y
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const stackTop = stackGeo.boundingBox!.max.y

    // Stacking rim extends above where the flat slab top would be
    expect(stackTop).toBeGreaterThan(flatTop)

    // The extra height should be approximately stackingLipHeight
    expect(stackTop - flatTop).toBeCloseTo(PROFILE_OFFICIAL.stackingLipHeight, 0)

    flatGeo.dispose()
    stackGeo.dispose()
  })

  it('respects non-zero center offsets', () => {
    const offsetCtx: ModifierContext = {
      innerWidth: 38.1,
      innerDepth: 38.1,
      wallHeight: 21,
      floorY: 5.85,
      centerX: 20,
      centerZ: -10,
    }

    const geometry = generateLid({ stacking: false }, offsetCtx, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!

    const midX = (box.max.x + box.min.x) / 2
    const midZ = (box.max.z + box.min.z) / 2

    expect(midX).toBeCloseTo(20, 0)
    expect(midZ).toBeCloseTo(-10, 0)

    geometry.dispose()
  })
})

describe('getLidDimensions', () => {
  const defaultContext: ModifierContext = {
    innerWidth: 38.1,
    innerDepth: 38.1,
    wallHeight: 21,
    floorY: 5.85,
    centerX: 0,
    centerZ: 0,
  }

  it('returns correct dimensions for flat lid', () => {
    const dims = getLidDimensions({ stacking: false }, defaultContext, PROFILE_OFFICIAL)

    expect(dims.width).toBe(40.1) // 38.1 + 2
    expect(dims.depth).toBe(40.1) // 38.1 + 2
    expect(dims.height).toBe(2) // LID_SLAB_HEIGHT
  })

  it('returns correct dimensions for stacking lid', () => {
    const dims = getLidDimensions({ stacking: true }, defaultContext, PROFILE_OFFICIAL)

    expect(dims.width).toBe(40.1)
    expect(dims.depth).toBe(40.1)
    // LID_SLAB_HEIGHT + stackingLipHeight (4.4) = 6.4
    expect(dims.height).toBe(2 + PROFILE_OFFICIAL.stackingLipHeight)
  })
})
