import { BufferGeometry, CylinderGeometry } from 'three'

import type { ScoopModifierParams, ModifierContext, GridfinityProfile } from '@/types/gridfinity'

import { mergeGeometries, getCurveSegments } from '../primitives'

export function generateScoop(
  params: ScoopModifierParams,
  context: ModifierContext,
  _profile: GridfinityProfile,
): BufferGeometry {
  const { wall, radius: explicitRadius } = params
  const { innerWidth, innerDepth, wallHeight, floorY, centerX, centerZ } = context

  if (wallHeight <= 0) return new BufferGeometry()

  // Auto-calculate radius if 0
  const radius = explicitRadius > 0 ? explicitRadius : wallHeight * 0.4
  const clampedRadius = Math.min(radius, wallHeight * 0.9)

  if (clampedRadius <= 0) return new BufferGeometry()

  // Create half-cylinder geometry
  const isXWall = wall === 'front' || wall === 'back'
  const span = isXWall ? innerWidth : innerDepth

  if (span <= 0) return new BufferGeometry()

  const segments = getCurveSegments() * 2

  // Build a half-cylinder as a custom geometry
  const geo = new CylinderGeometry(
    clampedRadius,
    clampedRadius,
    span,
    segments,
    1,
    false,
    0,
    Math.PI,
  )

  // Orient and position based on wall
  switch (wall) {
    case 'front': {
      // Axis Y→X via rotateZ. Arc faces +Z (inward). No rotateY needed.
      geo.rotateZ(Math.PI / 2)
      geo.translate(centerX, floorY + clampedRadius, centerZ - innerDepth / 2 + clampedRadius)
      break
    }
    case 'back': {
      // Axis Y→X. rotateX(PI) flips arc to face -Z (inward from back wall).
      geo.rotateZ(Math.PI / 2)
      geo.rotateX(Math.PI)
      geo.translate(centerX, floorY + clampedRadius, centerZ + innerDepth / 2 - clampedRadius)
      break
    }
    case 'left': {
      // Axis Y→Z via rotateZ+rotateY(-PI/2). Arc faces +X (inward from left wall).
      geo.rotateZ(Math.PI / 2)
      geo.rotateY(-Math.PI / 2)
      geo.translate(centerX - innerWidth / 2 + clampedRadius, floorY + clampedRadius, centerZ)
      break
    }
    case 'right': {
      // Axis Y→Z via rotateZ+rotateY(PI/2). Arc faces -X (inward from right wall).
      geo.rotateZ(Math.PI / 2)
      geo.rotateY(Math.PI / 2)
      geo.translate(centerX + innerWidth / 2 - clampedRadius, floorY + clampedRadius, centerZ)
      break
    }
  }

  const geometries = [geo]
  const result = mergeGeometries(geometries)
  for (const g of geometries) g.dispose()

  return result
}
