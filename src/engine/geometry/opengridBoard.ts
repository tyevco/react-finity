import type { BufferGeometry } from 'three'
import type { GridfinityProfile, OpenGridBoardParams } from '@/types/gridfinity'
import {
  OPENGRID_GRID_SIZE,
  OPENGRID_FULL_THICKNESS,
  OPENGRID_LITE_THICKNESS,
  OPENGRID_HOLE_SIZE,
  OPENGRID_CORNER_RADIUS,
} from '@/engine/constants'
import { roundedRectShape, extrudeShape, createDiamondHolePath } from './primitives'

/**
 * Generate OpenGrid board geometry from parameters.
 *
 * OpenGrid uses a 28mm grid with diamond-shaped snap holes at each cell center.
 * The board is a flat rounded rectangle with through-hole diamonds.
 */
export function generateOpenGridBoard(
  params: OpenGridBoardParams,
  _profile: GridfinityProfile,
): BufferGeometry {
  const { gridWidth, gridDepth, variant } = params
  const width = gridWidth * OPENGRID_GRID_SIZE
  const depth = gridDepth * OPENGRID_GRID_SIZE
  const thickness = variant === 'full' ? OPENGRID_FULL_THICKNESS : OPENGRID_LITE_THICKNESS

  const shape = roundedRectShape(width, depth, OPENGRID_CORNER_RADIUS)

  for (let i = 0; i < gridWidth; i++) {
    for (let j = 0; j < gridDepth; j++) {
      const cx = -width / 2 + (i + 0.5) * OPENGRID_GRID_SIZE
      const cz = -depth / 2 + (j + 0.5) * OPENGRID_GRID_SIZE
      shape.holes.push(createDiamondHolePath(OPENGRID_HOLE_SIZE, cx, cz))
    }
  }

  return extrudeShape(shape, thickness)
}

/**
 * Get the bounding dimensions of an OpenGrid board for display purposes.
 */
export function getOpenGridBoardDimensions(
  params: OpenGridBoardParams,
  _profile: GridfinityProfile,
): { width: number; depth: number; height: number } {
  const { gridWidth, gridDepth, variant } = params
  return {
    width: gridWidth * OPENGRID_GRID_SIZE,
    depth: gridDepth * OPENGRID_GRID_SIZE,
    height: variant === 'full' ? OPENGRID_FULL_THICKNESS : OPENGRID_LITE_THICKNESS,
  }
}
