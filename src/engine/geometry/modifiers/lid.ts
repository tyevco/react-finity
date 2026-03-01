import { BufferGeometry, Path } from 'three'

import type { LidModifierParams, ModifierContext, GridfinityProfile } from '@/types/gridfinity'

import { roundedRectShape, extrudeShape, mergeGeometries } from '../primitives'

const LID_SLAB_HEIGHT = 2 // mm

/**
 * Create a hollow extruded shape for rims.
 */
function createHollowExtrusion(
  outerWidth: number,
  outerDepth: number,
  outerRadius: number,
  innerWidth: number,
  innerDepth: number,
  innerRadius: number,
  height: number,
): BufferGeometry {
  const shape = roundedRectShape(outerWidth, outerDepth, outerRadius)
  const r = Math.min(innerRadius, innerWidth / 2, innerDepth / 2)
  const hw = innerWidth / 2
  const hd = innerDepth / 2
  const holePath = new Path()

  holePath.moveTo(-hw + r, -hd)
  holePath.quadraticCurveTo(-hw, -hd, -hw, -hd + r)
  holePath.lineTo(-hw, hd - r)
  holePath.quadraticCurveTo(-hw, hd, -hw + r, hd)
  holePath.lineTo(hw - r, hd)
  holePath.quadraticCurveTo(hw, hd, hw, hd - r)
  holePath.lineTo(hw, -hd + r)
  holePath.quadraticCurveTo(hw, -hd, hw - r, -hd)
  holePath.lineTo(-hw + r, -hd)

  shape.holes.push(holePath)
  return extrudeShape(shape, height)
}

export function generateLid(
  params: LidModifierParams,
  context: ModifierContext,
  profile: GridfinityProfile,
): BufferGeometry {
  const { stacking } = params
  const { innerWidth, innerDepth, wallHeight, floorY, centerX, centerZ } = context
  const { binCornerRadius, stackingLipHeight } = profile

  if (innerWidth <= 0 || innerDepth <= 0) return new BufferGeometry()

  // The lid sits on top of the bin walls
  // Use the context to determine the outer dimensions
  // The lid should cover the full bin opening, so use innerWidth + small margin
  const lidWidth = innerWidth + 2 // slightly larger than inner to rest on walls
  const lidDepth = innerDepth + 2
  const lidTopY = floorY + wallHeight

  const geometries: BufferGeometry[] = []

  // Main slab
  const slabShape = roundedRectShape(lidWidth, lidDepth, binCornerRadius)
  const slabGeo = extrudeShape(slabShape, LID_SLAB_HEIGHT)
  slabGeo.translate(centerX, lidTopY, centerZ)
  geometries.push(slabGeo)

  // Underside lip rim (fits inside bin opening)
  const lipThickness = 1.0
  const lipHeight = 1.0
  const lipInnerWidth = innerWidth - lipThickness * 2
  const lipInnerDepth = innerDepth - lipThickness * 2
  const lipInnerRadius = Math.max(0.1, binCornerRadius - lipThickness)

  if (lipInnerWidth > 0 && lipInnerDepth > 0) {
    const lipGeo = createHollowExtrusion(
      innerWidth,
      innerDepth,
      Math.max(0.1, binCornerRadius),
      lipInnerWidth,
      lipInnerDepth,
      lipInnerRadius,
      lipHeight,
    )
    lipGeo.translate(centerX, lidTopY - lipHeight, centerZ)
    geometries.push(lipGeo)
  }

  // Stacking rim on top (optional)
  if (stacking) {
    const stackLipThickness = Math.min(lipThickness, 1.2)
    const stackInnerWidth = lidWidth - stackLipThickness * 2
    const stackInnerDepth = lidDepth - stackLipThickness * 2
    const stackInnerRadius = Math.max(0.1, binCornerRadius - stackLipThickness)

    const stackGeo = createHollowExtrusion(
      lidWidth,
      lidDepth,
      binCornerRadius,
      stackInnerWidth,
      stackInnerDepth,
      stackInnerRadius,
      stackingLipHeight,
    )
    stackGeo.translate(centerX, lidTopY + LID_SLAB_HEIGHT, centerZ)
    geometries.push(stackGeo)
  }

  const result = mergeGeometries(geometries)
  for (const g of geometries) g.dispose()

  return result
}

export function getLidDimensions(
  params: LidModifierParams,
  context: ModifierContext,
  profile: GridfinityProfile,
): { width: number; depth: number; height: number } {
  const lidHeight = LID_SLAB_HEIGHT + (params.stacking ? profile.stackingLipHeight : 0)
  return {
    width: context.innerWidth + 2,
    depth: context.innerDepth + 2,
    height: lidHeight,
  }
}
