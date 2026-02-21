import { describe, it, expect } from 'vitest'
import { generateBin, getBinDimensions } from '../bin'
import { PROFILE_OFFICIAL } from '../../constants'
import type { BinParams } from '@/types/gridfinity'

describe('generateBin', () => {
  const defaultParams: BinParams = {
    gridWidth: 1,
    gridDepth: 1,
    heightUnits: 3,
    stackingLip: false,
    wallThickness: 1.2,
  }

  it('generates geometry with vertices and faces', () => {
    const geometry = generateBin(defaultParams, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('generates larger geometry for bigger grids', () => {
    const small = generateBin(defaultParams, PROFILE_OFFICIAL)
    const large = generateBin({ ...defaultParams, gridWidth: 3, gridDepth: 3 }, PROFILE_OFFICIAL)

    // Larger grid should have more vertices (more base plugs)
    expect(large.attributes.position.count).toBeGreaterThan(small.attributes.position.count)

    small.dispose()
    large.dispose()
  })

  it('generates additional geometry when stacking lip is enabled', () => {
    const withoutLip = generateBin({ ...defaultParams, stackingLip: false }, PROFILE_OFFICIAL)
    const withLip = generateBin({ ...defaultParams, stackingLip: true }, PROFILE_OFFICIAL)

    // Stacking lip adds more vertices
    expect(withLip.attributes.position.count).toBeGreaterThan(withoutLip.attributes.position.count)

    withoutLip.dispose()
    withLip.dispose()
  })

  it('bounding box matches expected dimensions for 1x1x3 bin', () => {
    const geometry = generateBin(defaultParams, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!

    const width = box.max.x - box.min.x
    const depth = box.max.z - box.min.z
    const height = box.max.y - box.min.y

    // Width and depth should be approximately 42mm (1 grid unit minus tolerance)
    expect(width).toBeGreaterThan(35)
    expect(width).toBeLessThan(45)
    expect(depth).toBeGreaterThan(35)
    expect(depth).toBeLessThan(45)

    // Height: socketWallHeight (4.65mm) + 3 * 7mm (21mm) = ~25.65mm
    expect(height).toBeGreaterThan(20)
    expect(height).toBeLessThan(30)

    geometry.dispose()
  })

  it('taller bins have greater bounding box height', () => {
    const short = generateBin({ ...defaultParams, heightUnits: 1 }, PROFILE_OFFICIAL)
    const tall = generateBin({ ...defaultParams, heightUnits: 6 }, PROFILE_OFFICIAL)

    short.computeBoundingBox()
    tall.computeBoundingBox()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const shortHeight = short.boundingBox!.max.y - short.boundingBox!.min.y
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tallHeight = tall.boundingBox!.max.y - tall.boundingBox!.min.y

    expect(tallHeight).toBeGreaterThan(shortHeight)

    short.dispose()
    tall.dispose()
  })
})

describe('getBinDimensions', () => {
  it('returns correct dimensions for a 2x3x4 bin', () => {
    const dims = getBinDimensions(
      { gridWidth: 2, gridDepth: 3, heightUnits: 4, stackingLip: true, wallThickness: 1.2 },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(84) // 2 * 42mm
    expect(dims.depth).toBe(126) // 3 * 42mm
    expect(dims.height).toBe(28) // 4 * 7mm
  })

  it('returns correct dimensions for a 1x1x1 bin', () => {
    const dims = getBinDimensions(
      { gridWidth: 1, gridDepth: 1, heightUnits: 1, stackingLip: false, wallThickness: 1.2 },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(42)
    expect(dims.depth).toBe(42)
    expect(dims.height).toBe(7)
  })
})
