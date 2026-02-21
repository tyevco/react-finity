import * as THREE from 'three'

import type { LabelTabModifierParams, ModifierContext, GridfinityProfile } from '@/types/gridfinity'

import { extrudeShape, mergeGeometries } from '../primitives'

export function generateLabelTab(
  params: LabelTabModifierParams,
  context: ModifierContext,
  _profile: GridfinityProfile,
): THREE.BufferGeometry {
  const { wall, angle, height } = params
  const { innerWidth, innerDepth, wallHeight, floorY, centerX, centerZ } = context

  // Label tab is a wedge at ~60% wall height on the targeted wall
  const tabBaseY = floorY + wallHeight * 0.6
  const angleRad = (angle * Math.PI) / 180
  const tabDepthVal = height / Math.tan(angleRad)

  // Triangular cross-section (right triangle in Y-Z plane)
  const wedgeShape = new THREE.Shape()
  wedgeShape.moveTo(0, 0)
  wedgeShape.lineTo(0, height)
  wedgeShape.lineTo(tabDepthVal, 0)
  wedgeShape.lineTo(0, 0)

  // The tab spans ~80% of the wall width, centered
  const isXWall = wall === 'front' || wall === 'back'
  const span = (isXWall ? innerWidth : innerDepth) * 0.8

  const geo = extrudeShape(wedgeShape, span)

  // Position and orient based on wall
  switch (wall) {
    case 'front': {
      // Front = -Z wall. Wedge faces +Z (inward).
      // extrudeShape extrudes along Y then rotates to Y-up, so we need to re-orient
      geo.rotateZ(-Math.PI / 2)
      geo.rotateY(-Math.PI / 2)
      geo.translate(centerX - span / 2, tabBaseY, centerZ - innerDepth / 2)
      break
    }
    case 'back': {
      geo.rotateZ(-Math.PI / 2)
      geo.rotateY(Math.PI / 2)
      geo.translate(centerX + span / 2, tabBaseY, centerZ + innerDepth / 2)
      break
    }
    case 'left': {
      geo.rotateZ(-Math.PI / 2)
      geo.rotateY(Math.PI)
      geo.translate(centerX - innerWidth / 2, tabBaseY, centerZ + span / 2)
      break
    }
    case 'right': {
      geo.rotateZ(-Math.PI / 2)
      geo.translate(centerX + innerWidth / 2, tabBaseY, centerZ - span / 2)
      break
    }
  }

  const geometries = [geo]
  const result = mergeGeometries(geometries)
  for (const g of geometries) g.dispose()

  return result
}
