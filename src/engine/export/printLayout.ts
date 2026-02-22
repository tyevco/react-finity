import type { BufferGeometry } from 'three'
import type { GridfinityObject, GridfinityProfile, Modifier } from '@/types/gridfinity'
import { mergeObjectWithModifiers } from './mergeObjectGeometry'
import { getPrintRotation, getOrientedBounds, applyPrintOrientation } from './printOrientation'

export interface PrintLayoutItem {
  object: GridfinityObject
  geometry: BufferGeometry
  position: [number, number, number]
  boundingBox: { width: number; depth: number; height: number }
  fitsOnBed: boolean
}

/**
 * Compute a print layout: merge each object with its modifiers, orient for
 * FDM printing, and arrange on a virtual print bed using row-based packing.
 *
 * Objects are sorted by depth (largest first) and placed in rows from
 * the front-left corner. Objects that exceed bed bounds in either axis
 * are still included but flagged with fitsOnBed = false.
 */
export function computePrintLayout(
  objects: GridfinityObject[],
  modifiers: Modifier[],
  profile: GridfinityProfile,
  bedWidth: number,
  bedDepth: number,
  spacing: number,
): PrintLayoutItem[] {
  if (objects.length === 0) return []

  // Generate merged + oriented geometries and measure bounding boxes
  const items: {
    object: GridfinityObject
    geometry: BufferGeometry
    bounds: { width: number; depth: number; height: number }
  }[] = []

  for (const obj of objects) {
    const merged = mergeObjectWithModifiers(obj, modifiers, profile)
    const rotation = getPrintRotation(obj)
    const oriented = applyPrintOrientation(merged, rotation)
    const bounds = getOrientedBounds(merged, rotation)
    merged.dispose()
    items.push({ object: obj, geometry: oriented, bounds })
  }

  // Sort by depth descending for better row packing
  items.sort((a, b) => b.bounds.depth - a.bounds.depth)

  // Row-based packing
  const result: PrintLayoutItem[] = []
  let currentX = 0
  let currentZ = 0
  let rowMaxDepth = 0

  for (const item of items) {
    const { bounds } = item

    // Check if the item fits in the current row
    if (currentX + bounds.width > bedWidth && currentX > 0) {
      // Move to next row
      currentZ += rowMaxDepth + spacing
      currentX = 0
      rowMaxDepth = 0
    }

    // Center the object within its bounding box position:
    // position is the center-bottom of the object on the bed
    const posX = currentX + bounds.width / 2
    const posZ = currentZ + bounds.depth / 2

    const fitsOnBed =
      currentX + bounds.width <= bedWidth && currentZ + bounds.depth <= bedDepth

    result.push({
      object: item.object,
      geometry: item.geometry,
      position: [posX, 0, posZ],
      boundingBox: bounds,
      fitsOnBed,
    })

    currentX += bounds.width + spacing
    rowMaxDepth = Math.max(rowMaxDepth, bounds.depth)
  }

  return result
}

/**
 * Dispose all geometries in a print layout result.
 */
export function disposePrintLayout(items: PrintLayoutItem[]): void {
  for (const item of items) {
    item.geometry.dispose()
  }
}
