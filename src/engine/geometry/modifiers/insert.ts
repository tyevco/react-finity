import { BufferGeometry, Path } from 'three'

import type { InsertModifierParams, ModifierContext, GridfinityProfile } from '@/types/gridfinity'

import { roundedRectShape, extrudeShape, mergeGeometries } from '../primitives'

/**
 * Create a hollow extruded shape for the insert outer rim.
 */
function createHollowExtrusion(
  outerWidth: number,
  outerDepth: number,
  innerWidth: number,
  innerDepth: number,
  height: number,
): BufferGeometry {
  const shape = roundedRectShape(outerWidth, outerDepth, 0)
  const holePath = new Path()
  const hw = innerWidth / 2
  const hd = innerDepth / 2
  // Clockwise winding for hole
  holePath.moveTo(-hw, -hd)
  holePath.lineTo(-hw, hd)
  holePath.lineTo(hw, hd)
  holePath.lineTo(hw, -hd)
  holePath.lineTo(-hw, -hd)
  shape.holes.push(holePath)
  return extrudeShape(shape, height)
}

export function generateInsert(
  params: InsertModifierParams,
  context: ModifierContext,
  _profile: GridfinityProfile,
): BufferGeometry {
  const { compartmentsX, compartmentsY, wallThickness } = params
  const { innerWidth, innerDepth, wallHeight, floorY, centerX, centerZ } = context

  const geometries: BufferGeometry[] = []

  // Outer rim
  const rimInnerWidth = innerWidth - wallThickness * 2
  const rimInnerDepth = innerDepth - wallThickness * 2

  if (rimInnerWidth > 0 && rimInnerDepth > 0) {
    const rimGeo = createHollowExtrusion(
      innerWidth,
      innerDepth,
      rimInnerWidth,
      rimInnerDepth,
      wallHeight,
    )
    rimGeo.translate(centerX, floorY, centerZ)
    geometries.push(rimGeo)
  }

  // Internal divider walls along X (compartmentsX - 1 walls)
  // Account for wall thickness when computing positions so that all
  // compartments have equal width, consistent with computeChildContext.
  const compartmentWidthX = (rimInnerWidth - wallThickness * (compartmentsX - 1)) / compartmentsX
  for (let i = 1; i < compartmentsX; i++) {
    const xPos =
      centerX - rimInnerWidth / 2 + i * (compartmentWidthX + wallThickness) - wallThickness / 2
    const shape = roundedRectShape(wallThickness, rimInnerDepth, 0)
    const geo = extrudeShape(shape, wallHeight)
    geo.translate(xPos, floorY, centerZ)
    geometries.push(geo)
  }

  // Internal divider walls along Z (compartmentsY - 1 walls)
  const compartmentDepthZ = (rimInnerDepth - wallThickness * (compartmentsY - 1)) / compartmentsY
  for (let i = 1; i < compartmentsY; i++) {
    const zPos =
      centerZ - rimInnerDepth / 2 + i * (compartmentDepthZ + wallThickness) - wallThickness / 2
    const shape = roundedRectShape(rimInnerWidth, wallThickness, 0)
    const geo = extrudeShape(shape, wallHeight)
    geo.translate(centerX, floorY, zPos)
    geometries.push(geo)
  }

  if (geometries.length === 0) {
    return new BufferGeometry()
  }

  const result = mergeGeometries(geometries)
  for (const g of geometries) g.dispose()

  return result
}

export function getInsertDimensions(
  _params: InsertModifierParams,
  context: ModifierContext,
  _profile: GridfinityProfile,
): { width: number; depth: number; height: number } {
  return {
    width: context.innerWidth,
    depth: context.innerDepth,
    height: context.wallHeight,
  }
}
