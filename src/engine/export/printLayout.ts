import { Euler } from 'three'
import type { BufferGeometry } from 'three'
import type { GridfinityObject, GridfinityProfile, Modifier } from '@/types/gridfinity'
import { mergeObjectWithModifiers, collectSeparatePartModifiers } from './mergeObjectGeometry'
import {
  getPrintRotation,
  getOrientedBounds,
  getBoundsFromOriented,
  applyPrintOrientation,
} from './printOrientation'
import { modifierKindRegistry } from '@/engine/registry/modifierKindRegistry'

export interface PrintLayoutItem {
  id: string
  label: string
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
    id: string
    label: string
    object: GridfinityObject
    geometry: BufferGeometry
    bounds: { width: number; depth: number; height: number }
  }[] = []

  try {
    for (const obj of objects) {
      const merged = mergeObjectWithModifiers(obj, modifiers, profile)
      const rotation = getPrintRotation(obj)
      const oriented = applyPrintOrientation(merged, rotation)
      const bounds = getBoundsFromOriented(oriented)
      merged.dispose()
      items.push({ id: obj.id, label: obj.name, object: obj, geometry: oriented, bounds })

      // Collect separate print parts (e.g. lids)
      const separateParts = collectSeparatePartModifiers(obj.id, modifiers, profile, obj)
      for (const { modifier, geometry } of separateParts) {
        const kindReg = modifierKindRegistry.get(modifier.kind)
        const kindLabel = kindReg?.label ?? modifier.kind
        // Lids print upside-down (flat top on bed)
        const partRotation = new Euler(Math.PI, 0, 0)
        const partOriented = applyPrintOrientation(geometry, partRotation)
        const partBounds = getOrientedBounds(geometry, partRotation)
        geometry.dispose()
        items.push({
          id: modifier.id,
          label: `${obj.name} - ${kindLabel}`,
          object: obj,
          geometry: partOriented,
          bounds: partBounds,
        })
      }
    }
  } catch (error) {
    // Dispose any geometries already collected before re-throwing
    for (const item of items) {
      item.geometry.dispose()
    }
    throw error
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

    const fitsOnBed = currentX + bounds.width <= bedWidth && currentZ + bounds.depth <= bedDepth

    result.push({
      id: item.id,
      label: item.label,
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
