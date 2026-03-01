import { describe, it, expect } from 'vitest'
import { generateBaseplate, getBaseplateDimensions } from '../baseplate'
import { PROFILE_OFFICIAL } from '../../constants'
import type { BaseplateParams } from '@/types/gridfinity'

describe('generateBaseplate', () => {
  const defaultParams: BaseplateParams = {
    gridWidth: 1,
    gridDepth: 1,
    slim: false,
    magnetHoles: false,
    screwHoles: false,
  }

  it('generates geometry with vertices and faces', () => {
    const geometry = generateBaseplate(defaultParams, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('generates larger geometry for bigger grids', () => {
    const small = generateBaseplate(defaultParams, PROFILE_OFFICIAL)
    const large = generateBaseplate(
      { ...defaultParams, gridWidth: 3, gridDepth: 3 },
      PROFILE_OFFICIAL,
    )

    // Larger grid should have more vertices (more cells = more cavities + step rings)
    expect(large.attributes.position.count).toBeGreaterThan(small.attributes.position.count)

    small.dispose()
    large.dispose()
  })

  it('generates different geometry when magnet holes are enabled', () => {
    const withoutHoles = generateBaseplate(
      { ...defaultParams, magnetHoles: false },
      PROFILE_OFFICIAL,
    )
    const withHoles = generateBaseplate({ ...defaultParams, magnetHoles: true }, PROFILE_OFFICIAL)

    // CSG subtraction changes vertex count
    expect(withHoles.attributes.position.count).not.toBe(withoutHoles.attributes.position.count)

    withoutHoles.dispose()
    withHoles.dispose()
  })

  it('generates different geometry when screw holes are enabled', () => {
    const withoutHoles = generateBaseplate(
      { ...defaultParams, screwHoles: false },
      PROFILE_OFFICIAL,
    )
    const withHoles = generateBaseplate({ ...defaultParams, screwHoles: true }, PROFILE_OFFICIAL)

    expect(withHoles.attributes.position.count).not.toBe(withoutHoles.attributes.position.count)

    withoutHoles.dispose()
    withHoles.dispose()
  })

  it('generates more vertices than a simple solid block (cavity construction)', () => {
    const geometry = generateBaseplate(defaultParams, PROFILE_OFFICIAL)

    // A simple solid extruded rounded rect would have relatively few vertices.
    // The socket cavity construction (frame with holes + step rings) produces significantly more.
    // A basic rounded rect extrusion typically produces ~68-100 vertices.
    // With cavities and step rings, we expect well above that.
    expect(geometry.attributes.position.count).toBeGreaterThan(150)

    geometry.dispose()
  })

  it('slim mode generates fewer vertices than full mode (no slab)', () => {
    const full = generateBaseplate(defaultParams, PROFILE_OFFICIAL)
    const slim = generateBaseplate({ ...defaultParams, slim: true }, PROFILE_OFFICIAL)

    expect(slim.attributes.position.count).toBeLessThan(full.attributes.position.count)

    full.dispose()
    slim.dispose()
  })

  it('slim mode bounding box is shorter than full mode', () => {
    const full = generateBaseplate(defaultParams, PROFILE_OFFICIAL)
    const slim = generateBaseplate({ ...defaultParams, slim: true }, PROFILE_OFFICIAL)

    full.computeBoundingBox()
    slim.computeBoundingBox()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fullHeight = full.boundingBox!.max.y - full.boundingBox!.min.y
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const slimHeight = slim.boundingBox!.max.y - slim.boundingBox!.min.y

    expect(slimHeight).toBeLessThan(fullHeight)

    full.dispose()
    slim.dispose()
  })

  it('slim mode disables magnet/screw holes', () => {
    const slimNoHoles = generateBaseplate(
      { ...defaultParams, slim: true, magnetHoles: false },
      PROFILE_OFFICIAL,
    )
    const slimWithHoles = generateBaseplate(
      { ...defaultParams, slim: true, magnetHoles: true },
      PROFILE_OFFICIAL,
    )

    // In slim mode, holes are disabled regardless of the flag
    expect(slimWithHoles.attributes.position.count).toBe(slimNoHoles.attributes.position.count)

    slimNoHoles.dispose()
    slimWithHoles.dispose()
  })

  it('bounding box matches expected dimensions for 1x1 grid', () => {
    const geometry = generateBaseplate(defaultParams, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geometry.boundingBox!

    // Width and depth should be approximately 42mm
    const width = box.max.x - box.min.x
    const depth = box.max.z - box.min.z

    // Allow some tolerance due to fillet radius adjustments
    expect(width).toBeGreaterThan(35)
    expect(width).toBeLessThan(45)
    expect(depth).toBeGreaterThan(35)
    expect(depth).toBeLessThan(45)

    geometry.dispose()
  })

  it('magnet + screw holes combined produces valid geometry', () => {
    const geometry = generateBaseplate(
      { ...defaultParams, magnetHoles: true, screwHoles: true },
      PROFILE_OFFICIAL,
    )
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('slim mode disables screw holes too', () => {
    const slimNoHoles = generateBaseplate(
      { ...defaultParams, slim: true, screwHoles: false },
      PROFILE_OFFICIAL,
    )
    const slimWithHoles = generateBaseplate(
      { ...defaultParams, slim: true, screwHoles: true },
      PROFILE_OFFICIAL,
    )

    // In slim mode, screw holes are disabled regardless of the flag
    expect(slimWithHoles.attributes.position.count).toBe(slimNoHoles.attributes.position.count)

    slimNoHoles.dispose()
    slimWithHoles.dispose()
  })

  it('magnet + screw holes combined on a 2x2 grid produces valid geometry', () => {
    const geometry = generateBaseplate(
      { gridWidth: 2, gridDepth: 2, slim: false, magnetHoles: true, screwHoles: true },
      PROFILE_OFFICIAL,
    )
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  }, 15_000)
})

describe('getBaseplateDimensions', () => {
  it('returns correct dimensions for a 3x3 baseplate', () => {
    const dims = getBaseplateDimensions(
      { gridWidth: 3, gridDepth: 3, slim: false, magnetHoles: false, screwHoles: false },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(126) // 3 * 42mm
    expect(dims.depth).toBe(126) // 3 * 42mm
    expect(dims.height).toBe(7) // 7mm standard
  })

  it('returns correct dimensions for a 1x1 baseplate', () => {
    const dims = getBaseplateDimensions(
      { gridWidth: 1, gridDepth: 1, slim: false, magnetHoles: false, screwHoles: false },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(42)
    expect(dims.depth).toBe(42)
    expect(dims.height).toBe(7)
  })

  it('returns reduced height for slim baseplate', () => {
    const dims = getBaseplateDimensions(
      { gridWidth: 1, gridDepth: 1, slim: true, magnetHoles: false, screwHoles: false },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(42)
    expect(dims.depth).toBe(42)
    expect(dims.height).toBe(PROFILE_OFFICIAL.socketWallHeight) // 4.65mm
  })
})
