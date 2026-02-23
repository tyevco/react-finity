import type { BufferGeometry } from 'three'
import { Shape } from 'three'

import type { BinParams, GridfinityProfile } from '@/types/gridfinity'

import {
  roundedRectShape,
  extrudeShape,
  mergeGeometries,
  createHollowExtrusion,
} from './primitives'

/**
 * Generate bin geometry from parameters and profile.
 *
 * Gridfinity bin structure (cross-section from bottom to top):
 * 1. Base plugs — one solid block per grid cell, interlocks with baseplate socket
 * 2. Hollow walls — outer shell with inner cutout, forms the bin body
 * 3. Interior floor — solid slab at the base of the hollow interior
 * 4. Stacking lip (optional) — raised rim at top edge for bin stacking
 */
export function generateBin(params: BinParams, profile: GridfinityProfile): BufferGeometry {
  const { gridWidth, gridDepth, heightUnits, stackingLip, wallThickness, innerFillet } = params
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

  const geometries: BufferGeometry[] = []

  // === 1. Base plugs (one per grid cell) ===
  // Two-tiered stepped profile matching the baseplate socket:
  //   - Bottom tier (narrow): fits inside the socket step ring
  //   - Top tier (wide): fills the full socket cavity above the ledge
  const cellSize = gridSize - tolerance * 2
  const cellRadius = Math.max(0.1, cornerRadius)

  const { socketBottomChamfer, socketMidHeight } = profile
  const stepHeight = socketBottomChamfer + socketMidHeight // 2.6mm for Official
  const stepWallThickness = 1.2 // matches baseplate step ring
  const stepInnerSize = cellSize - stepWallThickness * 2
  const stepInnerRadius = Math.max(0.1, cellRadius - stepWallThickness)
  const topTierHeight = socketWallHeight - stepHeight

  for (let gx = 0; gx < gridWidth; gx++) {
    for (let gz = 0; gz < gridDepth; gz++) {
      const cx = (gx - (gridWidth - 1) / 2) * gridSize
      const cz = (gz - (gridDepth - 1) / 2) * gridSize

      // Bottom tier (narrow) — fits inside the step ring opening
      const bottomShape = roundedRectShape(stepInnerSize, stepInnerSize, stepInnerRadius)
      const bottomGeo = extrudeShape(bottomShape, stepHeight)
      bottomGeo.translate(cx, 0, cz)
      geometries.push(bottomGeo)

      // Top tier (wide) — fills the full cavity above the step ledge
      const topShape = roundedRectShape(cellSize, cellSize, cellRadius)
      const topGeo = extrudeShape(topShape, topTierHeight)
      topGeo.translate(cx, stepHeight, cz)
      geometries.push(topGeo)
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

  // === 5. Inner fillet (optional) ===
  if (innerFillet > 0) {
    const filletR = Math.min(innerFillet, wt, wallHeight / 2)
    const floorY = socketWallHeight + wt

    // Chamfer strip cross-section: right triangle with legs = filletR
    const chamferShape = new Shape()
    chamferShape.moveTo(0, 0)
    chamferShape.lineTo(filletR, 0)
    chamferShape.lineTo(0, filletR)
    chamferShape.lineTo(0, 0)

    // Front wall (negative Z)
    const frontGeo = extrudeShape(chamferShape, innerWidth - innerRadius * 2)
    frontGeo.rotateY(Math.PI / 2)
    frontGeo.translate(-(innerWidth / 2 - innerRadius), floorY, -innerDepth / 2)
    geometries.push(frontGeo)

    // Back wall (positive Z)
    const backGeo = extrudeShape(chamferShape, innerWidth - innerRadius * 2)
    backGeo.rotateY(Math.PI / 2)
    backGeo.rotateY(Math.PI)
    backGeo.translate(innerWidth / 2 - innerRadius, floorY, innerDepth / 2)
    geometries.push(backGeo)

    // Left wall (negative X)
    const leftGeo = extrudeShape(chamferShape, innerDepth - innerRadius * 2)
    leftGeo.rotateY(0)
    leftGeo.translate(-innerWidth / 2, floorY, -(innerDepth / 2 - innerRadius))
    geometries.push(leftGeo)

    // Right wall (positive X)
    const rightGeo = extrudeShape(chamferShape, innerDepth - innerRadius * 2)
    rightGeo.rotateY(Math.PI)
    rightGeo.translate(innerWidth / 2, floorY, innerDepth / 2 - innerRadius)
    geometries.push(rightGeo)
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
