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
