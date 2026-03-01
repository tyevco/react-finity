import { BufferGeometry, Shape } from 'three'

import type { LabelTabModifierParams, ModifierContext, GridfinityProfile } from '@/types/gridfinity'

import { extrudeShape, mergeGeometries } from '../primitives'

export function generateLabelTab(
  params: LabelTabModifierParams,
  context: ModifierContext,
  _profile: GridfinityProfile,
): BufferGeometry {
  const { wall, angle } = params
  const { innerWidth, innerDepth, wallHeight, floorY, centerX, centerZ } = context

  // Clamp height to 40% of wall height to avoid oversized tabs
  const height = Math.min(params.height, wallHeight * 0.4)

  // The tab spans ~80% of the wall width, centered
  const isXWall = wall === 'front' || wall === 'back'
  const span = (isXWall ? innerWidth : innerDepth) * 0.8

  // Early return if clamped dimensions are degenerate
  if (height <= 0 || span <= 0) return new BufferGeometry()

  // Label tab is a wedge at ~60% wall height on the targeted wall
  const tabBaseY = floorY + wallHeight * 0.6
  // Clamp angle to safe range to prevent division by zero (tan(0)) or infinity (tan(90))
  const safeAngle = Math.max(5, Math.min(85, angle))
  const angleRad = (safeAngle * Math.PI) / 180
  const tabDepthVal = Math.min(height / Math.tan(angleRad), innerWidth, innerDepth)

  // Triangular cross-section (right triangle in Y-Z plane)
  const wedgeShape = new Shape()
  wedgeShape.moveTo(0, 0)
  wedgeShape.lineTo(0, height)
  wedgeShape.lineTo(tabDepthVal, 0)
  wedgeShape.lineTo(0, 0)

  const geo = extrudeShape(wedgeShape, span)

  // Position and orient based on wall
  // After extrudeShape: X=[0,tabDepth], Y=[0,span], Z=[-height,0]
  switch (wall) {
    case 'front': {
      // rotateZ(PI/2)+rotateX(PI/2): span along X, height along Y, depth toward +Z (inward from front wall at -Z)
      geo.rotateZ(Math.PI / 2)
      geo.rotateX(Math.PI / 2)
      geo.translate(centerX + span / 2, tabBaseY, centerZ - innerDepth / 2)
      break
    }
    case 'back': {
      // rotateZ(-PI/2)+rotateX(PI/2): span along X, height along Y, depth toward -Z (inward from back wall at +Z)
      geo.rotateZ(-Math.PI / 2)
      geo.rotateX(Math.PI / 2)
      geo.translate(centerX - span / 2, tabBaseY, centerZ + innerDepth / 2)
      break
    }
    case 'left': {
      // rotateX(PI/2): depth toward +X (inward from left wall at -X), span along Z
      geo.rotateX(Math.PI / 2)
      geo.translate(centerX - innerWidth / 2, tabBaseY, centerZ - span / 2)
      break
    }
    case 'right': {
      // rotateX(PI/2)+rotateY(PI): depth toward -X (inward from right wall at +X), span along Z
      geo.rotateX(Math.PI / 2)
      geo.rotateY(Math.PI)
      geo.translate(centerX + innerWidth / 2, tabBaseY, centerZ + span / 2)
      break
    }
  }

  const geometries = [geo]
  const result = mergeGeometries(geometries)
  for (const g of geometries) g.dispose()

  return result
}
