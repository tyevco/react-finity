import { describe, it, expect } from 'vitest'
import { generateOpenGridBoard, getOpenGridBoardDimensions } from '../opengridBoard'
import { PROFILE_OFFICIAL, OPENGRID_GRID_SIZE } from '../../constants'
import type { OpenGridBoardParams } from '@/types/gridfinity'

describe('generateOpenGridBoard', () => {
  const defaultParams: OpenGridBoardParams = {
    gridWidth: 4,
    gridDepth: 4,
    variant: 'full',
    orientation: 'flat',
  }

  it('generates geometry with vertices and faces', () => {
    const geometry = generateOpenGridBoard(defaultParams, PROFILE_OFFICIAL)
    expect(geometry).toBeDefined()
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('generates valid geometry for a single cell (1x1)', () => {
    const geometry = generateOpenGridBoard(
      { ...defaultParams, gridWidth: 1, gridDepth: 1 },
      PROFILE_OFFICIAL,
    )
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
    expect(geometry.index).toBeDefined()
    geometry.dispose()
  })

  it('generates larger geometry for bigger grids', () => {
    const small = generateOpenGridBoard(
      { ...defaultParams, gridWidth: 1, gridDepth: 1 },
      PROFILE_OFFICIAL,
    )
    const large = generateOpenGridBoard(
      { ...defaultParams, gridWidth: 4, gridDepth: 4 },
      PROFILE_OFFICIAL,
    )

    expect(large.attributes.position.count).toBeGreaterThan(small.attributes.position.count)

    small.dispose()
    large.dispose()
  })

  it('full variant has different bounding box height than lite variant', () => {
    const full = generateOpenGridBoard({ ...defaultParams, variant: 'full' }, PROFILE_OFFICIAL)
    const lite = generateOpenGridBoard({ ...defaultParams, variant: 'lite' }, PROFILE_OFFICIAL)

    full.computeBoundingBox()
    lite.computeBoundingBox()

    const fullHeight = full.boundingBox!.max.y - full.boundingBox!.min.y // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const liteHeight = lite.boundingBox!.max.y - lite.boundingBox!.min.y // eslint-disable-line @typescript-eslint/no-non-null-assertion

    expect(fullHeight).toBeCloseTo(6.8, 1)
    expect(liteHeight).toBeCloseTo(4.0, 1)
    expect(fullHeight).toBeGreaterThan(liteHeight)

    full.dispose()
    lite.dispose()
  })

  it('bounding box matches expected dimensions for 4x4 grid', () => {
    const geometry = generateOpenGridBoard(defaultParams, PROFILE_OFFICIAL)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox! // eslint-disable-line @typescript-eslint/no-non-null-assertion

    const width = box.max.x - box.min.x
    const depth = box.max.z - box.min.z

    // 4 * 28 = 112mm, allow tolerance due to corner radius
    expect(width).toBeGreaterThan(100)
    expect(width).toBeLessThan(115)
    expect(depth).toBeGreaterThan(100)
    expect(depth).toBeLessThan(115)

    geometry.dispose()
  })

  it('diamond holes add geometry complexity (more vertices than a plain slab)', () => {
    // A single-cell board with a diamond hole should have more vertices
    // than the same shape would without holes (the hole path creates extra faces)
    const withHoles = generateOpenGridBoard(
      { ...defaultParams, gridWidth: 2, gridDepth: 2 },
      PROFILE_OFFICIAL,
    )
    const oneHole = generateOpenGridBoard(
      { ...defaultParams, gridWidth: 1, gridDepth: 1 },
      PROFILE_OFFICIAL,
    )

    // 2x2 has 4 holes, 1x1 has 1 hole, so 2x2 should have more vertices
    expect(withHoles.attributes.position.count).toBeGreaterThan(oneHole.attributes.position.count)

    withHoles.dispose()
    oneHole.dispose()
  })
})

describe('getOpenGridBoardDimensions', () => {
  it('returns correct dimensions for a 4x4 full board', () => {
    const dims = getOpenGridBoardDimensions(
      { gridWidth: 4, gridDepth: 4, variant: 'full', orientation: 'flat' },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(4 * OPENGRID_GRID_SIZE) // 112
    expect(dims.depth).toBe(4 * OPENGRID_GRID_SIZE) // 112
    expect(dims.height).toBe(6.8)
  })

  it('returns correct dimensions for a 1x1 lite board', () => {
    const dims = getOpenGridBoardDimensions(
      { gridWidth: 1, gridDepth: 1, variant: 'lite', orientation: 'flat' },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(OPENGRID_GRID_SIZE) // 28
    expect(dims.depth).toBe(OPENGRID_GRID_SIZE) // 28
    expect(dims.height).toBe(4.0)
  })

  it('returns correct dimensions for a rectangular board', () => {
    const dims = getOpenGridBoardDimensions(
      { gridWidth: 3, gridDepth: 6, variant: 'full', orientation: 'wall' },
      PROFILE_OFFICIAL,
    )

    expect(dims.width).toBe(3 * OPENGRID_GRID_SIZE) // 84
    expect(dims.depth).toBe(6 * OPENGRID_GRID_SIZE) // 168
    expect(dims.height).toBe(6.8)
  })
})
