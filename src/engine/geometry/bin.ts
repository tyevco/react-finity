import type { BufferGeometry } from 'three'
import { Shape, CylinderGeometry } from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

import type { BinParams, GridfinityProfile } from '@/types/gridfinity'

import {
  roundedRectShape,
  extrudeShape,
  mergeGeometries,
  createHollowExtrusion,
  createHexagonHolePath,
  getCurveSegments,
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
  const {
    gridWidth,
    gridDepth,
    heightUnits,
    stackingLip,
    wallThickness,
    innerFillet,
    magnetHoles,
    weightHoles,
    honeycombBase,
  } = params
  const { gridSize, heightUnit, binCornerRadius, tolerance, socketWallHeight, stackingLipHeight } =
    profile

  // Outer dimensions — fits within baseplate grid with clearance
  const outerWidth = gridWidth * gridSize - tolerance * 2
  const outerDepth = gridDepth * gridSize - tolerance * 2
  const cornerRadius = binCornerRadius

  // Wall height (the bin body above the base)
  const wallHeight = heightUnits * heightUnit

  // Interior dimensions -- clamp to minimum 0.1mm to prevent degenerate geometry
  // when wall thickness exceeds half the outer dimension
  const wt = wallThickness
  const innerWidth = Math.max(0.1, outerWidth - wt * 2)
  const innerDepth = Math.max(0.1, outerDepth - wt * 2)
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
      if (topTierHeight > 0) {
        const topShape = roundedRectShape(cellSize, cellSize, cellRadius)
        const topGeo = extrudeShape(topShape, topTierHeight)
        topGeo.translate(cx, stepHeight, cz)
        geometries.push(topGeo)
      }
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

  // Honeycomb pattern: hex holes in the floor to save material
  if (honeycombBase) {
    const hexRadius = 4 // 8mm flat-to-flat
    const hexWall = 1.2 // wall between hexagons
    const hexSpacingX = (hexRadius + hexWall / 2) * Math.sqrt(3)
    const hexSpacingZ = (hexRadius + hexWall / 2) * 1.5
    const margin = hexRadius + hexWall
    const halfW = innerWidth / 2 - margin
    const halfD = innerDepth / 2 - margin

    let row = 0
    for (let z = -halfD; z <= halfD; z += hexSpacingZ) {
      const xOffset = row % 2 === 1 ? hexSpacingX / 2 : 0
      for (let x = -halfW + xOffset; x <= halfW; x += hexSpacingX) {
        // Skip hexes whose center is too close to the rounded rect edge
        if (Math.abs(x) <= halfW && Math.abs(z) <= halfD) {
          floorShape.holes.push(createHexagonHolePath(hexRadius, x, z))
        }
      }
      row++
    }
  }

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
  // Skip fillet when inner dimensions are too small to accommodate the straight
  // wall sections between corner radii (extrusion length would be zero or negative).
  const filletWidthSpan = innerWidth - innerRadius * 2
  const filletDepthSpan = innerDepth - innerRadius * 2
  if (innerFillet > 0 && filletWidthSpan > 0.01 && filletDepthSpan > 0.01) {
    const filletR = Math.min(innerFillet, wt, wallHeight / 2)
    const floorY = socketWallHeight + wt

    // Chamfer strip cross-section: right triangle with legs = filletR
    const chamferShape = new Shape()
    chamferShape.moveTo(0, 0)
    chamferShape.lineTo(filletR, 0)
    chamferShape.lineTo(0, filletR)
    chamferShape.lineTo(0, 0)

    // Front wall (negative Z)
    const frontGeo = extrudeShape(chamferShape, filletWidthSpan)
    frontGeo.rotateY(Math.PI / 2)
    frontGeo.translate(-(innerWidth / 2 - innerRadius), floorY, -innerDepth / 2)
    geometries.push(frontGeo)

    // Back wall (positive Z)
    const backGeo = extrudeShape(chamferShape, filletWidthSpan)
    backGeo.rotateY(Math.PI / 2)
    backGeo.rotateY(Math.PI)
    backGeo.translate(innerWidth / 2 - innerRadius, floorY, innerDepth / 2)
    geometries.push(backGeo)

    // Left wall (negative X)
    const leftGeo = extrudeShape(chamferShape, filletDepthSpan)
    leftGeo.rotateY(0)
    leftGeo.translate(-innerWidth / 2, floorY, -(innerDepth / 2 - innerRadius))
    geometries.push(leftGeo)

    // Right wall (positive X)
    const rightGeo = extrudeShape(chamferShape, filletDepthSpan)
    rightGeo.rotateY(Math.PI)
    rightGeo.translate(innerWidth / 2, floorY, innerDepth / 2 - innerRadius)
    geometries.push(rightGeo)
  }

  // Merge all sub-geometries
  let result = mergeGeometries(geometries)

  // Clean up source geometries
  for (const g of geometries) g.dispose()

  // === 6. CSG subtraction for magnet/weight holes in base plug ===
  if (magnetHoles || weightHoles) {
    const holeGeometries: BufferGeometry[] = []
    const segments = getCurveSegments() * 3
    const cellSize = gridSize - tolerance * 2

    for (let gx = 0; gx < gridWidth; gx++) {
      for (let gz = 0; gz < gridDepth; gz++) {
        const cx = (gx - (gridWidth - 1) / 2) * gridSize
        const cz = (gz - (gridDepth - 1) / 2) * gridSize

        if (magnetHoles) {
          // 4 magnet holes per cell at corners, matching baseplate positions
          const cornerOffset = cellSize / 2 - 4.0
          const corners = [
            [cx - cornerOffset, cz - cornerOffset],
            [cx + cornerOffset, cz - cornerOffset],
            [cx - cornerOffset, cz + cornerOffset],
            [cx + cornerOffset, cz + cornerOffset],
          ]
          const magnetRadius = profile.magnetDiameter / 2
          const magnetDepth = profile.magnetDepth
          const overshoot = 0.1

          for (const [hx, hz] of corners) {
            const magnetGeo = new CylinderGeometry(
              magnetRadius,
              magnetRadius,
              magnetDepth + overshoot,
              segments,
            )
            // Blind holes from bottom of plug, overshoot below Y=0
            magnetGeo.translate(hx, (magnetDepth - overshoot) / 2, hz)
            holeGeometries.push(magnetGeo)
          }
        }

        if (weightHoles) {
          // 1 weight hole per cell at center (penny-sized)
          const weightDiameter = 20
          const weightDepth = 2
          const overshoot = 0.1
          const weightGeo = new CylinderGeometry(
            weightDiameter / 2,
            weightDiameter / 2,
            weightDepth + overshoot,
            segments,
          )
          weightGeo.translate(cx, (weightDepth - overshoot) / 2, cz)
          holeGeometries.push(weightGeo)
        }
      }
    }

    if (holeGeometries.length > 0) {
      const mergedHoles = mergeGeometries(holeGeometries)
      for (const g of holeGeometries) g.dispose()

      const evaluator = new Evaluator()
      evaluator.attributes = ['position', 'normal']
      const baseBrush = new Brush(result)
      const holeBrush = new Brush(mergedHoles)

      try {
        const csgResult = evaluator.evaluate(baseBrush, holeBrush, SUBTRACTION)
        const finalGeometry = csgResult.geometry
        result.dispose()
        result = finalGeometry
      } finally {
        mergedHoles.dispose()
        baseBrush.geometry.dispose()
        holeBrush.geometry.dispose()
      }
    }
  }

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
