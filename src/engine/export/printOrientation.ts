import { Matrix4 } from 'three'
import type { BufferGeometry, Euler } from 'three'
import type { GridfinityObject } from '@/types/gridfinity'
import { objectKindRegistry } from '@/engine/registry/objectKindRegistry'

/**
 * Get the optimal print rotation for an object kind.
 * Delegates to the registered object kind's getPrintRotation function.
 */
export function getPrintRotation(object: GridfinityObject): Euler {
  const reg = objectKindRegistry.getOrThrow(object.kind)
  return reg.getPrintRotation(object.params as unknown as Record<string, unknown>)
}

/**
 * Compute the bounding box of a geometry after applying a rotation,
 * then translate so the minimum Y sits at 0 (on the print bed).
 *
 * Returns { box, yOffset } where yOffset is the translation needed.
 */
export function getOrientedBounds(
  geometry: BufferGeometry,
  rotation: Euler,
): { width: number; depth: number; height: number; yOffset: number } {
  const clone = geometry.clone()
  const matrix = new Matrix4().makeRotationFromEuler(rotation)
  clone.applyMatrix4(matrix)
  clone.computeBoundingBox()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const box = clone.boundingBox!

  const width = box.max.x - box.min.x
  const depth = box.max.z - box.min.z
  const height = box.max.y - box.min.y
  const yOffset = -box.min.y

  clone.dispose()

  return { width, depth, height, yOffset }
}

/**
 * Compute bounding dimensions from a geometry that has already been oriented
 * (i.e., already rotated and translated to sit on the print bed at Y=0).
 */
export function getBoundsFromOriented(oriented: BufferGeometry): {
  width: number
  depth: number
  height: number
} {
  oriented.computeBoundingBox()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const box = oriented.boundingBox!
  return {
    width: box.max.x - box.min.x,
    depth: box.max.z - box.min.z,
    height: box.max.y - box.min.y,
  }
}

/**
 * Apply print orientation to a geometry: rotate and translate so it
 * sits flat on the print bed (min Y = 0).
 *
 * Returns a new geometry; the original is not modified.
 */
export function applyPrintOrientation(geometry: BufferGeometry, rotation: Euler): BufferGeometry {
  const oriented = geometry.clone()
  const rotMatrix = new Matrix4().makeRotationFromEuler(rotation)
  oriented.applyMatrix4(rotMatrix)
  oriented.computeBoundingBox()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const minY = oriented.boundingBox!.min.y
  if (Math.abs(minY) > 0.001) {
    const translateMatrix = new Matrix4().makeTranslation(0, -minY, 0)
    oriented.applyMatrix4(translateMatrix)
  }
  return oriented
}
