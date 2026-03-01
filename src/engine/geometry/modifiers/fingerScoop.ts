import type { BufferGeometry } from 'three'
import { Shape } from 'three'

import type {
  FingerScoopModifierParams,
  ModifierContext,
  GridfinityProfile,
} from '@/types/gridfinity'

import { extrudeShape, mergeGeometries } from '../primitives'

/**
 * Generate finger scoop cutout geometry.
 *
 * Produces a solid block positioned at the top of the selected wall face.
 * The block represents material to be removed via CSG subtraction in the
 * merge pipeline (the modifier is registered as subtractive).
 *
 * Shape: U-notch with rounded bottom (width x depth), centered on the wall,
 * top-aligned with the wall top.
 */
export function generateFingerScoop(
  params: FingerScoopModifierParams,
  context: ModifierContext,
  _profile: GridfinityProfile,
): BufferGeometry {
  const { wall, width, depth } = params
  const { innerWidth, innerDepth, wallHeight, floorY, centerX, centerZ } = context

  const isXWall = wall === 'front' || wall === 'back'
  const span = isXWall ? innerWidth : innerDepth
  const clampedWidth = Math.max(0.1, Math.min(width, span))
  const clampedDepth = Math.max(0.1, Math.min(depth, wallHeight * 0.9))

  // U-shaped notch cross-section in 2D (X = width, Y = depth from bottom of notch upward)
  const halfW = clampedWidth / 2
  const roundRadius = Math.min(halfW, clampedDepth / 2)
  const overshoot = 1.0 // extra at the top for clean CSG cut
  const cutoutShape = new Shape()
  cutoutShape.moveTo(-halfW, clampedDepth + overshoot)
  cutoutShape.lineTo(-halfW, roundRadius)
  cutoutShape.quadraticCurveTo(-halfW, 0, -halfW + roundRadius, 0)
  cutoutShape.lineTo(halfW - roundRadius, 0)
  cutoutShape.quadraticCurveTo(halfW, 0, halfW, roundRadius)
  cutoutShape.lineTo(halfW, clampedDepth + overshoot)
  cutoutShape.closePath()

  // Extrude through wall: generous thickness for full penetration
  const thickness = 4.0
  const geo = extrudeShape(cutoutShape, thickness)

  // After extrudeShape: X = width, Y = [0, thickness], Z = [-(depth+overshoot), 0]
  // Rotate around X by +90 degrees to orient depth along Y (vertical)
  // Result: X = width, Y = [0, depth+overshoot], Z = [0, thickness]
  geo.rotateX(Math.PI / 2)

  const wallTopY = floorY + wallHeight

  switch (wall) {
    case 'front': {
      // Front inner wall at Z = centerZ - innerDepth/2
      geo.translate(centerX, wallTopY - clampedDepth, centerZ - innerDepth / 2 - thickness / 2)
      break
    }
    case 'back': {
      // Back inner wall at Z = centerZ + innerDepth/2
      geo.translate(centerX, wallTopY - clampedDepth, centerZ + innerDepth / 2 - thickness / 2)
      break
    }
    case 'left': {
      // Left inner wall at X = centerX - innerWidth/2
      // Rotate 90 degrees around Y to face X direction
      geo.rotateY(Math.PI / 2)
      geo.translate(centerX - innerWidth / 2 - thickness / 2, wallTopY - clampedDepth, centerZ)
      break
    }
    case 'right': {
      // Right inner wall at X = centerX + innerWidth/2
      geo.rotateY(-Math.PI / 2)
      geo.translate(centerX + innerWidth / 2 + thickness / 2, wallTopY - clampedDepth, centerZ)
      break
    }
  }

  const geometries = [geo]
  const result = mergeGeometries(geometries)
  for (const g of geometries) g.dispose()

  return result
}
