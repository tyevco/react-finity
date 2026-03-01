import { BufferGeometry } from 'three'

import type {
  DividerGridModifierParams,
  ModifierContext,
  GridfinityProfile,
} from '@/types/gridfinity'

import { roundedRectShape, extrudeShape, mergeGeometries } from '../primitives'

export function generateDividerGrid(
  params: DividerGridModifierParams,
  context: ModifierContext,
  _profile: GridfinityProfile,
): BufferGeometry {
  const { dividersX, dividersY, wallThickness } = params
  const { innerWidth, innerDepth, wallHeight, floorY, centerX, centerZ } = context

  if (dividersX === 0 && dividersY === 0) {
    return new BufferGeometry()
  }

  if (wallHeight <= 0) {
    return new BufferGeometry()
  }

  const geometries: BufferGeometry[] = []

  // Dividers along X axis (walls spanning depth)
  for (let i = 0; i < dividersX; i++) {
    const xPos = centerX - innerWidth / 2 + (innerWidth * (i + 1)) / (dividersX + 1)
    const shape = roundedRectShape(wallThickness, innerDepth, 0)
    const geo = extrudeShape(shape, wallHeight)
    geo.translate(xPos, floorY, centerZ)
    geometries.push(geo)
  }

  // Dividers along Y axis (walls spanning width)
  for (let i = 0; i < dividersY; i++) {
    const zPos = centerZ - innerDepth / 2 + (innerDepth * (i + 1)) / (dividersY + 1)
    const shape = roundedRectShape(innerWidth, wallThickness, 0)
    const geo = extrudeShape(shape, wallHeight)
    geo.translate(centerX, floorY, zPos)
    geometries.push(geo)
  }

  const result = mergeGeometries(geometries)
  for (const g of geometries) g.dispose()

  return result
}
