import type { BufferGeometry } from 'three'
import type {
  GridfinityObject,
  GridfinityProfile,
  Modifier,
  ModifierContext,
  BinParams,
} from '@/types/gridfinity'
import { objectKindRegistry } from '@/engine/registry/objectKindRegistry'
import { modifierKindRegistry } from '@/engine/registry/modifierKindRegistry'
import { mergeGeometries } from '@/engine/geometry/primitives'

// Bridge typed params interfaces to the registry's Record<string, unknown>.
// Safe because the registry ensures params match the registered kind.
function asParams(p: object): Record<string, unknown> {
  return p as Record<string, unknown>
}

export function generateModifierGeometry(
  modifier: Modifier,
  context: ModifierContext,
  profile: GridfinityProfile,
): BufferGeometry | null {
  const reg = modifierKindRegistry.getOrThrow(modifier.kind)
  return reg.generateGeometry(asParams(modifier.params), context, profile)
}

export function computeBinContext(params: BinParams, profile: GridfinityProfile): ModifierContext {
  const { gridWidth, gridDepth, heightUnits, wallThickness } = params
  const { gridSize, heightUnit, tolerance, socketWallHeight } = profile

  const outerWidth = gridWidth * gridSize - tolerance * 2
  const outerDepth = gridDepth * gridSize - tolerance * 2
  const innerWidth = outerWidth - wallThickness * 2
  const innerDepth = outerDepth - wallThickness * 2
  const wallHeight = heightUnits * heightUnit

  return {
    innerWidth,
    innerDepth,
    wallHeight,
    floorY: socketWallHeight + wallThickness,
    centerX: 0,
    centerZ: 0,
  }
}

function computeChildContext(modifier: Modifier, parentContext: ModifierContext): ModifierContext {
  const reg = modifierKindRegistry.get(modifier.kind)
  if (reg?.subdividesSpace && reg.computeChildContext) {
    return reg.computeChildContext(asParams(modifier.params), parentContext)
  }
  return parentContext
}

function collectModifierGeometries(
  parentId: string,
  context: ModifierContext,
  allModifiers: Modifier[],
  profile: GridfinityProfile,
): BufferGeometry[] {
  const children = allModifiers.filter((m) => m.parentId === parentId)
  const geometries: BufferGeometry[] = []

  for (const modifier of children) {
    const geo = generateModifierGeometry(modifier, context, profile)
    if (geo && 'position' in geo.attributes) {
      geometries.push(geo)
    }

    const childContext = computeChildContext(modifier, context)
    const childGeos = collectModifierGeometries(modifier.id, childContext, allModifiers, profile)
    geometries.push(...childGeos)
  }

  return geometries
}

function generateObjectGeometry(
  object: GridfinityObject,
  profile: GridfinityProfile,
): BufferGeometry {
  const reg = objectKindRegistry.getOrThrow(object.kind)
  return reg.generateGeometry(asParams(object.params), profile)
}

/**
 * Merge an object with all its modifiers into a single BufferGeometry.
 * The result includes the base object geometry plus all modifier geometries
 * recursively collected and merged.
 */
export function mergeObjectWithModifiers(
  object: GridfinityObject,
  modifiers: Modifier[],
  profile: GridfinityProfile,
): BufferGeometry {
  const baseGeometry = generateObjectGeometry(object, profile)

  const reg = objectKindRegistry.getOrThrow(object.kind)
  if (!reg.supportsModifiers || !reg.computeModifierContext) {
    return baseGeometry
  }

  const context = reg.computeModifierContext(asParams(object.params), profile)
  const modifierGeometries = collectModifierGeometries(object.id, context, modifiers, profile)

  if (modifierGeometries.length === 0) {
    return baseGeometry
  }

  const allGeometries = [baseGeometry, ...modifierGeometries]
  const merged = mergeGeometries(allGeometries)

  baseGeometry.dispose()
  for (const geo of modifierGeometries) {
    geo.dispose()
  }

  return merged
}
