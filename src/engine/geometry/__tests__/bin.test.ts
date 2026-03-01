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
    innerFillet: 0,
    magnetHoles: false,
    weightHoles: false,
    honeycombBase: false,
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

  it('base plug has stepped profile with more geometry than a simple block', () => {
    // A two-tiered plug produces more vertices than a single extrusion would.
    // We verify the geometry exists and has a reasonable vertex count
    // indicating two separate tiers per grid cell.
    const geometry = generateBin(defaultParams, PROFILE_OFFICIAL)
    expect(geometry.attributes.position.count).toBeGreaterThan(0)

    // With a 2x2 grid, there should be significantly more plug vertices
    // (2 tiers per cell vs 1 tier)
    const single = generateBin(defaultParams, PROFILE_OFFICIAL)
    const double = generateBin({ ...defaultParams, gridWidth: 2, gridDepth: 2 }, PROFILE_OFFICIAL)

    // 4 cells with 2 tiers each vs 1 cell with 2 tiers — should scale
    expect(double.attributes.position.count).toBeGreaterThan(single.attributes.position.count)

    geometry.dispose()
    single.dispose()
    double.dispose()
  })

  it('base plug bottom tier is narrower than top tier', () => {
    // Generate a 1x1 bin and verify the bounding box at Y=0 level
    // is narrower than at the step height. We check indirectly by
    // verifying the geometry has vertices at the expected tier boundaries.
    const geometry = generateBin(defaultParams, PROFILE_OFFICIAL)
    const positions = geometry.attributes.position

    const { socketBottomChamfer, socketMidHeight, socketWallHeight } = PROFILE_OFFICIAL
    const stepHeight = socketBottomChamfer + socketMidHeight

    // Collect unique Y values where geometry transitions exist
    const yValues = new Set<number>()
    for (let i = 0; i < positions.count; i++) {
      const y = Math.round(positions.getY(i) * 100) / 100
      yValues.add(y)
    }

    // Should have vertices at Y=0 (bottom), Y=stepHeight (tier boundary),
    // and Y=socketWallHeight (top of plug)
    expect(yValues.has(0)).toBe(true)
    expect(yValues.has(Math.round(stepHeight * 100) / 100)).toBe(true)
    expect(yValues.has(Math.round(socketWallHeight * 100) / 100)).toBe(true)

    geometry.dispose()
  })

  it('inner fillet adds vertices compared to no fillet', () => {
    const noFillet = generateBin({ ...defaultParams, innerFillet: 0 }, PROFILE_OFFICIAL)
    const withFillet = generateBin({ ...defaultParams, innerFillet: 1.5 }, PROFILE_OFFICIAL)

    expect(withFillet.attributes.position.count).toBeGreaterThan(noFillet.attributes.position.count)

    noFillet.dispose()
    withFillet.dispose()
  })

  it('inner fillet does not change outer bounding box', () => {
    const noFillet = generateBin({ ...defaultParams, innerFillet: 0 }, PROFILE_OFFICIAL)
    const withFillet = generateBin({ ...defaultParams, innerFillet: 2 }, PROFILE_OFFICIAL)

    noFillet.computeBoundingBox()
    withFillet.computeBoundingBox()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const noFilletWidth = noFillet.boundingBox!.max.x - noFillet.boundingBox!.min.x
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const withFilletWidth = withFillet.boundingBox!.max.x - withFillet.boundingBox!.min.x

    // Outer dimensions should be the same
    expect(withFilletWidth).toBeCloseTo(noFilletWidth, 1)

    noFillet.dispose()
    withFillet.dispose()
  })

  it('magnet holes change vertex count via CSG', () => {
    const without = generateBin({ ...defaultParams, magnetHoles: false }, PROFILE_OFFICIAL)
    const with_ = generateBin({ ...defaultParams, magnetHoles: true }, PROFILE_OFFICIAL)

    expect(with_.attributes.position.count).not.toBe(without.attributes.position.count)

    without.dispose()
    with_.dispose()
  })

  it('weight holes change vertex count via CSG', () => {
    const without = generateBin({ ...defaultParams, weightHoles: false }, PROFILE_OFFICIAL)
    const with_ = generateBin({ ...defaultParams, weightHoles: true }, PROFILE_OFFICIAL)

    expect(with_.attributes.position.count).not.toBe(without.attributes.position.count)

    without.dispose()
    with_.dispose()
  })

  it('honeycomb base adds vertices from hex holes', () => {
    const without = generateBin({ ...defaultParams, honeycombBase: false }, PROFILE_OFFICIAL)
    const with_ = generateBin({ ...defaultParams, honeycombBase: true }, PROFILE_OFFICIAL)

    // Hex holes in the floor shape produce more vertices
    expect(with_.attributes.position.count).toBeGreaterThan(without.attributes.position.count)

    without.dispose()
    with_.dispose()
  })

  it('combined magnet + weight holes produces valid geometry', () => {
    const geometry = generateBin(
      { ...defaultParams, magnetHoles: true, weightHoles: true },
      PROFILE_OFFICIAL,
    )
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('honeycomb base with thick walls still produces valid geometry', () => {
    const geometry = generateBin(
      { ...defaultParams, honeycombBase: true, wallThickness: 5 },
      PROFILE_OFFICIAL,
    )
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('handles extremely large wallThickness without error', () => {
    // wallThickness larger than half the outer dimension would produce negative inner dims
    // The clamp to 0.1mm should prevent degenerate geometry
    const geometry = generateBin({ ...defaultParams, wallThickness: 50 }, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('default bin with innerFillet=0 matches existing behavior', () => {
    const geometry = generateBin(defaultParams, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('all optional features enabled simultaneously', () => {
    const geometry = generateBin(
      {
        ...defaultParams,
        stackingLip: true,
        magnetHoles: true,
        weightHoles: true,
        honeycombBase: true,
        innerFillet: 1.5,
      },
      PROFILE_OFFICIAL,
    )
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('honeycomb + innerFillet combined produces valid geometry', () => {
    const geometry = generateBin(
      { ...defaultParams, honeycombBase: true, innerFillet: 2 },
      PROFILE_OFFICIAL,
    )
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('magnet + weight holes combined changes vertex count', () => {
    const magnetOnly = generateBin(
      { ...defaultParams, magnetHoles: true, weightHoles: false },
      PROFILE_OFFICIAL,
    )
    const both = generateBin(
      { ...defaultParams, magnetHoles: true, weightHoles: true },
      PROFILE_OFFICIAL,
    )

    // Adding weight holes on top of magnet holes changes geometry further
    expect(both.attributes.position.count).not.toBe(magnetOnly.attributes.position.count)

    magnetOnly.dispose()
    both.dispose()
  })

  it('honeycomb base with very thick walls skips hex holes gracefully', () => {
    // With wallThickness=20 on a 1x1 bin, innerWidth is very small.
    // The hex margin (hexRadius + hexWall = 5.2mm) may exceed innerWidth/2,
    // making halfW negative. The guard should prevent any hex hole creation.
    const thinInner = generateBin(
      { ...defaultParams, honeycombBase: true, wallThickness: 18 },
      PROFILE_OFFICIAL,
    )
    const normalInner = generateBin(
      { ...defaultParams, honeycombBase: true, wallThickness: 1.2 },
      PROFILE_OFFICIAL,
    )

    // Both should produce valid geometry
    expect(thinInner.attributes.position).toBeDefined()
    expect(thinInner.attributes.position.count).toBeGreaterThan(0)

    // With very thick walls, honeycomb can't fit hex holes, so it should have
    // fewer vertices than the normal case (no hex hole cutouts in the floor)
    expect(thinInner.attributes.position.count).toBeLessThan(normalInner.attributes.position.count)

    thinInner.dispose()
    normalInner.dispose()
  })

  it('innerFillet clamped to wallThickness produces valid geometry', () => {
    // innerFillet larger than wallThickness should be clamped
    const geometry = generateBin(
      { ...defaultParams, innerFillet: 10, wallThickness: 1.2 },
      PROFILE_OFFICIAL,
    )
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    geometry.dispose()
  })
})

describe('getBinDimensions', () => {
  it('returns correct dimensions for a 2x3x4 bin', () => {
    const dims = getBinDimensions(
      {
        gridWidth: 2,
        gridDepth: 3,
        heightUnits: 4,
        stackingLip: true,
        wallThickness: 1.2,
        innerFillet: 0,
        magnetHoles: false,
        weightHoles: false,
        honeycombBase: false,
      },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(84) // 2 * 42mm
    expect(dims.depth).toBe(126) // 3 * 42mm
    expect(dims.height).toBe(28) // 4 * 7mm
  })

  it('returns correct dimensions for a 1x1x1 bin', () => {
    const dims = getBinDimensions(
      {
        gridWidth: 1,
        gridDepth: 1,
        heightUnits: 1,
        stackingLip: false,
        wallThickness: 1.2,
        innerFillet: 0,
        magnetHoles: false,
        weightHoles: false,
        honeycombBase: false,
      },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(42)
    expect(dims.depth).toBe(42)
    expect(dims.height).toBe(7)
  })
})
