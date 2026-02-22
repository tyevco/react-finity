import * as THREE from 'three'

import type { ScoopModifierParams, ModifierContext, GridfinityProfile } from '@/types/gridfinity'

import { mergeGeometries, getCurveSegments } from '../primitives'

export function generateScoop(
  params: ScoopModifierParams,
  context: ModifierContext,
  _profile: GridfinityProfile,
): THREE.BufferGeometry {
  const { wall, radius: explicitRadius } = params
  const { innerWidth, innerDepth, wallHeight, floorY, centerX, centerZ } = context

  // Auto-calculate radius if 0
  const radius = explicitRadius > 0 ? explicitRadius : wallHeight * 0.4
  const clampedRadius = Math.min(radius, wallHeight * 0.9)

  // Create half-cylinder geometry
  const isXWall = wall === 'front' || wall === 'back'
  const span = isXWall ? innerWidth : innerDepth
  const segments = getCurveSegments() * 2

  // Build a half-cylinder as a custom geometry
  const geo = new THREE.CylinderGeometry(
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
      // Scoop ramp at base of front wall (-Z), cylinder axis along X
      geo.rotateZ(Math.PI / 2)
      geo.rotateY(Math.PI / 2)
      geo.translate(centerX, floorY + clampedRadius, centerZ - innerDepth / 2 + clampedRadius)
      break
    }
    case 'back': {
      geo.rotateZ(Math.PI / 2)
      geo.rotateY(-Math.PI / 2)
      geo.translate(centerX, floorY + clampedRadius, centerZ + innerDepth / 2 - clampedRadius)
      break
    }
    case 'left': {
      geo.rotateZ(Math.PI / 2)
      geo.rotateY(Math.PI)
      geo.translate(centerX - innerWidth / 2 + clampedRadius, floorY + clampedRadius, centerZ)
      break
    }
    case 'right': {
      geo.rotateZ(Math.PI / 2)
      geo.translate(centerX + innerWidth / 2 - clampedRadius, floorY + clampedRadius, centerZ)
      break
    }
  }

  const geometries = [geo]
  const result = mergeGeometries(geometries)
  for (const g of geometries) g.dispose()

  return result
}
