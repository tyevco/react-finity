import type { BufferGeometry } from 'three'
import { CylinderGeometry } from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

import type { BaseplateParams, GridfinityProfile } from '@/types/gridfinity'

import {
  roundedRectShape,
  roundedRectHolePathAt,
  extrudeShape,
  createHollowExtrusion,
  mergeGeometries,
  getCurveSegments,
} from './primitives'

/**
 * Generate baseplate geometry from parameters and profile.
 *
 * Gridfinity baseplate structure (cross-section from bottom to top):
 * Layer 1: Solid base slab (Y=0 to Y=slabHeight)
 * Layer 2: Grid frame with socket cavities (full footprint with per-cell holes)
 * Layer 3: Per-cell socket step rings (mid-step ledge inside each cavity)
 * Layer 4: CSG subtraction for magnet/screw holes (conditional)
 */
export function generateBaseplate(
  params: BaseplateParams,
  profile: GridfinityProfile,
): BufferGeometry {
  const { gridWidth, gridDepth, slim, magnetHoles, screwHoles } = params
  const {
    gridSize,
    baseplateHeight,
    baseplateCornerRadius,
    tolerance,
    socketWallHeight,
    socketBottomChamfer,
    socketMidHeight,
  } = profile

  const totalWidth = gridWidth * gridSize
  const totalDepth = gridDepth * gridSize
  const cellInnerSize = gridSize - tolerance * 2
  const cellCornerRadius = Math.max(0.1, baseplateCornerRadius - tolerance)
  const slabHeight = slim ? 0 : baseplateHeight - socketWallHeight
  const frameBaseY = slabHeight

  const geometries: BufferGeometry[] = []

  // === Layer 1: Solid base slab (skipped in slim mode) ===
  if (!slim) {
    const slabShape = roundedRectShape(totalWidth, totalDepth, baseplateCornerRadius)
    const slabGeo = extrudeShape(slabShape, baseplateHeight - socketWallHeight)
    geometries.push(slabGeo)
  }

  // === Layer 2: Grid frame with socket cavities ===
  // Full footprint shape with per-cell rectangular holes punched out
  const frameShape = roundedRectShape(totalWidth, totalDepth, baseplateCornerRadius)
  for (let gx = 0; gx < gridWidth; gx++) {
    for (let gz = 0; gz < gridDepth; gz++) {
      const cx = (gx - (gridWidth - 1) / 2) * gridSize
      const cz = (gz - (gridDepth - 1) / 2) * gridSize
      frameShape.holes.push(
        roundedRectHolePathAt(cellInnerSize, cellInnerSize, cellCornerRadius, cx, cz),
      )
    }
  }
  const frameGeo = extrudeShape(frameShape, socketWallHeight)
  frameGeo.translate(0, frameBaseY, 0)
  geometries.push(frameGeo)

  // === Layer 3: Per-cell socket step rings ===
  // Hollow extrusion creating the mid-step ledge inside each socket cavity
  const stepHeight = socketBottomChamfer + socketMidHeight
  const stepWallThickness = 1.2
  const stepInnerSize = cellInnerSize - stepWallThickness * 2
  const stepInnerRadius = Math.max(0.1, cellCornerRadius - stepWallThickness)

  for (let gx = 0; gx < gridWidth; gx++) {
    for (let gz = 0; gz < gridDepth; gz++) {
      const cx = (gx - (gridWidth - 1) / 2) * gridSize
      const cz = (gz - (gridDepth - 1) / 2) * gridSize

      const ringGeo = createHollowExtrusion(
        cellInnerSize,
        cellInnerSize,
        cellCornerRadius,
        stepInnerSize,
        stepInnerSize,
        stepInnerRadius,
        stepHeight,
      )
      ringGeo.translate(cx, frameBaseY, cz)
      geometries.push(ringGeo)
    }
  }

  // Merge layers 1-3
  let result = mergeGeometries(geometries)

  // Clean up source geometries
  for (const g of geometries) g.dispose()

  // === Layer 4: CSG subtraction for magnet/screw holes (disabled in slim mode) ===
  if (!slim && (magnetHoles || screwHoles)) {
    const holeGeometries: BufferGeometry[] = []
    const segments = getCurveSegments() * 3

    for (let gx = 0; gx < gridWidth; gx++) {
      for (let gz = 0; gz < gridDepth; gz++) {
        const cx = (gx - (gridWidth - 1) / 2) * gridSize
        const cz = (gz - (gridDepth - 1) / 2) * gridSize

        const cornerOffset = cellInnerSize / 2 - 4.0
        const corners = [
          [cx - cornerOffset, cz - cornerOffset],
          [cx + cornerOffset, cz - cornerOffset],
          [cx - cornerOffset, cz + cornerOffset],
          [cx + cornerOffset, cz + cornerOffset],
        ]

        for (const [hx, hz] of corners) {
          if (magnetHoles) {
            const magnetRadius = profile.magnetDiameter / 2
            const magnetDepth = profile.magnetDepth
            const overshoot = 0.1 // extend below Y=0 to avoid coplanar CSG artifacts
            const magnetGeo = new CylinderGeometry(
              magnetRadius,
              magnetRadius,
              magnetDepth + overshoot,
              segments,
            )
            // Blind holes in slab bottom, shifted down by overshoot/2 to punch through
            magnetGeo.translate(hx, (magnetDepth - overshoot) / 2, hz)
            holeGeometries.push(magnetGeo)
          }

          if (screwHoles) {
            const screwRadius = profile.screwDiameter / 2
            const screwDepth = slabHeight + 0.1 // slight overshoot for clean cut
            const screwGeo = new CylinderGeometry(screwRadius, screwRadius, screwDepth, segments)
            // Through-holes in slab
            screwGeo.translate(hx, screwDepth / 2, hz)
            holeGeometries.push(screwGeo)
          }
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

      const csgResult = evaluator.evaluate(baseBrush, holeBrush, SUBTRACTION)
      const finalGeometry = csgResult.geometry

      // Dispose intermediates
      result.dispose()
      mergedHoles.dispose()
      baseBrush.geometry.dispose()
      holeBrush.geometry.dispose()

      result = finalGeometry
    }
  }

  return result
}

/**
 * Get the bounding dimensions of a baseplate for display purposes.
 */
export function getBaseplateDimensions(
  params: BaseplateParams,
  profile: GridfinityProfile,
): { width: number; depth: number; height: number } {
  return {
    width: params.gridWidth * profile.gridSize,
    depth: params.gridDepth * profile.gridSize,
    height: params.slim ? profile.socketWallHeight : profile.baseplateHeight,
  }
}
