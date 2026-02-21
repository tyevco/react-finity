import * as THREE from 'three'

import type { BinParams, GridfinityProfile } from '@/types/gridfinity'

import { roundedRectShape, extrudeShape, mergeGeometries } from './primitives'

/**
 * Create a rounded rectangle Path (clockwise winding) for use as a hole
 * in a THREE.Shape. Opposite winding to roundedRectShape (CCW).
 */
function roundedRectHolePath(width: number, depth: number, radius: number): THREE.Path {
  const r = Math.min(radius, width / 2, depth / 2)
  const hw = width / 2
  const hd = depth / 2
  const path = new THREE.Path()

  // Clockwise: BL→left edge up→TL→top edge right→TR→right edge down→BR→bottom edge left
  path.moveTo(-hw + r, -hd)
  path.quadraticCurveTo(-hw, -hd, -hw, -hd + r)
  path.lineTo(-hw, hd - r)
  path.quadraticCurveTo(-hw, hd, -hw + r, hd)
  path.lineTo(hw - r, hd)
  path.quadraticCurveTo(hw, hd, hw, hd - r)
  path.lineTo(hw, -hd + r)
  path.quadraticCurveTo(hw, -hd, hw - r, -hd)
  path.lineTo(-hw + r, -hd)

  return path
}

/**
 * Create a hollow extruded shape (tube with rounded-rect cross section).
 * Uses Shape.holes to cut out the interior.
 */
function createHollowExtrusion(
  outerWidth: number,
  outerDepth: number,
  outerRadius: number,
  innerWidth: number,
  innerDepth: number,
  innerRadius: number,
  height: number,
): THREE.BufferGeometry {
  const shape = roundedRectShape(outerWidth, outerDepth, outerRadius)
  shape.holes.push(roundedRectHolePath(innerWidth, innerDepth, innerRadius))
  return extrudeShape(shape, height)
}

/**
 * Generate bin geometry from parameters and profile.
 *
 * Gridfinity bin structure (cross-section from bottom to top):
 * 1. Base plugs — one solid block per grid cell, interlocks with baseplate socket
 * 2. Hollow walls — outer shell with inner cutout, forms the bin body
 * 3. Interior floor — solid slab at the base of the hollow interior
 * 4. Stacking lip (optional) — raised rim at top edge for bin stacking
 */
export function generateBin(params: BinParams, profile: GridfinityProfile): THREE.BufferGeometry {
  const { gridWidth, gridDepth, heightUnits, stackingLip, wallThickness } = params
  const { gridSize, heightUnit, binCornerRadius, tolerance, socketWallHeight, stackingLipHeight } =
    profile

  // Outer dimensions — fits within baseplate grid with clearance
  const outerWidth = gridWidth * gridSize - tolerance * 2
  const outerDepth = gridDepth * gridSize - tolerance * 2
  const cornerRadius = binCornerRadius

  // Wall height (the bin body above the base)
  const wallHeight = heightUnits * heightUnit

  // Interior dimensions
  const wt = wallThickness
  const innerWidth = outerWidth - wt * 2
  const innerDepth = outerDepth - wt * 2
  const innerRadius = Math.max(0.1, cornerRadius - wt)

  const geometries: THREE.BufferGeometry[] = []

  // === 1. Base plugs (one per grid cell) ===
  // Each plug is a solid rounded-rect block that fits into the baseplate socket
  const cellSize = gridSize - tolerance * 2
  const cellRadius = Math.max(0.1, cornerRadius)

  for (let gx = 0; gx < gridWidth; gx++) {
    for (let gz = 0; gz < gridDepth; gz++) {
      const cx = (gx - (gridWidth - 1) / 2) * gridSize
      const cz = (gz - (gridDepth - 1) / 2) * gridSize

      const plugShape = roundedRectShape(cellSize, cellSize, cellRadius)
      const plugGeo = extrudeShape(plugShape, socketWallHeight)
      plugGeo.translate(cx, 0, cz)
      geometries.push(plugGeo)
    }
  }

  // === 2. Hollow bin walls ===
  const wallGeo = createHollowExtrusion(
    outerWidth,
    outerDepth,
    cornerRadius,
    innerWidth,
    innerDepth,
    innerRadius,
    wallHeight,
  )
  wallGeo.translate(0, socketWallHeight, 0)
  geometries.push(wallGeo)

  // === 3. Interior floor ===
  const floorShape = roundedRectShape(innerWidth, innerDepth, innerRadius)
  const floorGeo = extrudeShape(floorShape, wt)
  floorGeo.translate(0, socketWallHeight, 0)
  geometries.push(floorGeo)

  // === 4. Stacking lip (optional) ===
  if (stackingLip) {
    // The lip is a thin-walled rim at the top, creating a ledge for stacking
    const lipThickness = Math.min(wt, 1.2)
    const lipInnerWidth = outerWidth - lipThickness * 2
    const lipInnerDepth = outerDepth - lipThickness * 2
    const lipInnerRadius = Math.max(0.1, cornerRadius - lipThickness)

    const lipGeo = createHollowExtrusion(
      outerWidth,
      outerDepth,
      cornerRadius,
      lipInnerWidth,
      lipInnerDepth,
      lipInnerRadius,
      stackingLipHeight,
    )
    lipGeo.translate(0, socketWallHeight + wallHeight, 0)
    geometries.push(lipGeo)
  }

  // Merge all sub-geometries
  const result = mergeGeometries(geometries)

  // Clean up source geometries
  for (const g of geometries) g.dispose()

  return result
}

/**
 * Get the bounding dimensions of a bin for display purposes.
 * Returns the user-facing dimensions (wall height, not including base plug).
 */
export function getBinDimensions(
  params: BinParams,
  profile: GridfinityProfile,
): { width: number; depth: number; height: number } {
  return {
    width: params.gridWidth * profile.gridSize,
    depth: params.gridDepth * profile.gridSize,
    height: params.heightUnits * profile.heightUnit,
  }
}
