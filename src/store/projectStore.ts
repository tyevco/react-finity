import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { GridfinityObject, Modifier, ModifierContext, ProjectData } from '@/types/gridfinity'
import { objectKindRegistry } from '@/engine/registry/objectKindRegistry'
import { modifierKindRegistry } from '@/engine/registry/modifierKindRegistry'
import { useProfileStore } from './profileStore'

interface ProjectStore {
  objects: GridfinityObject[]
  modifiers: Modifier[]
  addObject: (kind: string) => string
  updateObjectParams: (id: string, params: Record<string, unknown>) => void
  updateObjectPosition: (id: string, position: [number, number, number]) => void
  updateObjectRotation: (id: string, rotation: [number, number, number]) => void
  updateObjectName: (id: string, name: string) => void
  removeObject: (id: string) => void
  removeObjects: (ids: string[]) => void
  clearObjects: () => void
  addModifier: (parentId: string, kind: string) => string
  updateModifierParams: (id: string, params: Record<string, unknown>) => void
  removeModifier: (id: string) => void
  loadProjectData: (data: ProjectData) => void
  getModifiersForParent: (parentId: string) => Modifier[]
  getRootObjectId: (modifierId: string) => string | null
  getModifierContext: (parentId: string, visited?: Set<string>) => ModifierContext | null
  duplicateObjects: (ids: string[]) => string[]
  reorderObject: (fromIndex: number, toIndex: number) => void
  reorderModifier: (parentId: string, fromIndex: number, toIndex: number) => void
}

// Module-level counter for auto-naming objects (e.g., "Bin 3"). Stored outside
// Zustand to avoid triggering store subscriptions on every name generation.
// Reset by resetObjectCounter() when loading project data.
let objectCounter = 0

function getNextName(kind: string): string {
  objectCounter++
  const reg = objectKindRegistry.getOrThrow(kind)
  return `${reg.label} ${objectCounter}`
}

function getDefaultModifierParams(kind: string): Record<string, unknown> {
  const reg = modifierKindRegistry.getOrThrow(kind)
  return { ...reg.defaultParams }
}

export function resetObjectCounter(objects: GridfinityObject[]): void {
  let maxCounter = 0
  for (const obj of objects) {
    const match = /\s(\d+)$/.exec(obj.name)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxCounter) maxCounter = n
    }
  }
  objectCounter = maxCounter
}

export function collectDescendantModifierIds(modifiers: Modifier[], rootId: string): Set<string> {
  const idsToRemove = new Set<string>()
  const queue = [rootId]

  while (queue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const currentId = queue.pop()!
    for (const mod of modifiers) {
      if (mod.parentId === currentId && !idsToRemove.has(mod.id)) {
        idsToRemove.add(mod.id)
        queue.push(mod.id)
      }
    }
  }

  return idsToRemove
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  objects: [],
  modifiers: [],

  addObject: (kind: string) => {
    const id = uuidv4()
    const name = getNextName(kind)
    const reg = objectKindRegistry.getOrThrow(kind)
    const profile = useProfileStore.getState().activeProfile
    const position = reg.getDefaultPosition?.(profile) ?? ([0, 0, 0] as [number, number, number])

    const newObject = {
      kind,
      id,
      name,
      position,
      params: { ...reg.defaultParams },
    } as unknown as GridfinityObject // Safe: registry defaultParams match the registered kind

    set((state) => ({ objects: [...state.objects, newObject] }))
    return id
  },

  updateObjectParams: (id, params) => {
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, params: { ...obj.params, ...params } } : obj,
      ),
    }))
  },

  updateObjectPosition: (id, position) => {
    set((state) => ({
      objects: state.objects.map((obj) => (obj.id === id ? { ...obj, position } : obj)),
    }))
  },

  updateObjectRotation: (id, rotation) => {
    set((state) => ({
      objects: state.objects.map((obj) => (obj.id === id ? { ...obj, rotation } : obj)),
    }))
  },

  updateObjectName: (id, name) => {
    set((state) => ({
      objects: state.objects.map((obj) => (obj.id === id ? { ...obj, name } : obj)),
    }))
  },

  removeObject: (id) => {
    set((state) => {
      const descendantIds = collectDescendantModifierIds(state.modifiers, id)
      return {
        objects: state.objects.filter((obj) => obj.id !== id),
        modifiers: state.modifiers.filter(
          (mod) => mod.parentId !== id && !descendantIds.has(mod.id),
        ),
      }
    })
  },

  removeObjects: (ids) => {
    if (ids.length === 0) return
    set((state) => {
      const idSet = new Set(ids)
      // Collect all descendant modifier IDs for all removed objects
      const allDescendantIds = new Set<string>()
      for (const id of ids) {
        for (const descId of collectDescendantModifierIds(state.modifiers, id)) {
          allDescendantIds.add(descId)
        }
      }
      return {
        objects: state.objects.filter((obj) => !idSet.has(obj.id)),
        modifiers: state.modifiers.filter(
          (mod) => !idSet.has(mod.parentId) && !allDescendantIds.has(mod.id),
        ),
      }
    })
  },

  clearObjects: () => {
    set({ objects: [], modifiers: [] })
  },

  loadProjectData: (data: ProjectData) => {
    resetObjectCounter(data.objects)
    set({ objects: data.objects, modifiers: data.modifiers })
  },

  addModifier: (parentId: string, kind: string) => {
    const state = get()
    const parentExists =
      state.objects.some((o) => o.id === parentId) || state.modifiers.some((m) => m.id === parentId)
    if (!parentExists) {
      console.warn(`addModifier: parent "${parentId}" not found, skipping`)
      return ''
    }

    const id = uuidv4()
    const params = getDefaultModifierParams(kind)

    // Safe: params come from the registry's defaultParams for this kind
    const newModifier = { id, parentId, kind, params } as unknown as Modifier

    set((s) => ({ modifiers: [...s.modifiers, newModifier] }))
    return id
  },

  updateModifierParams: (id, params) => {
    set((state) => ({
      modifiers: state.modifiers.map((mod) =>
        mod.id === id ? { ...mod, params: { ...mod.params, ...params } } : mod,
      ),
    }))
  },

  removeModifier: (id) => {
    set((state) => {
      const descendantIds = collectDescendantModifierIds(state.modifiers, id)
      descendantIds.add(id)
      return {
        modifiers: state.modifiers.filter((mod) => !descendantIds.has(mod.id)),
      }
    })
  },

  getModifiersForParent: (parentId: string) => {
    return get().modifiers.filter((mod) => mod.parentId === parentId)
  },

  getRootObjectId: (modifierId: string) => {
    const state = get()
    let currentId = modifierId
    const visited = new Set<string>()

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- loop exits via return statements; condition is always true by design
    while (true) {
      if (visited.has(currentId)) {
        console.warn('Circular reference detected in modifier chain at:', currentId)
        return null
      }
      visited.add(currentId)

      const modifier = state.modifiers.find((mod) => mod.id === currentId)
      if (!modifier) {
        const obj = state.objects.find((o) => o.id === currentId)
        return obj ? obj.id : null
      }
      currentId = modifier.parentId
    }
  },

  duplicateObjects: (ids: string[]) => {
    const state = get()
    const newObjectIds: string[] = []
    const newObjects: GridfinityObject[] = []
    const newModifiers: Modifier[] = []

    for (const objectId of ids) {
      const obj = state.objects.find((o) => o.id === objectId)
      if (!obj) continue

      const newId = uuidv4()
      const name = getNextName(obj.kind)
      const newObj = {
        ...obj,
        id: newId,
        name,
        position: [obj.position[0] + 42, obj.position[1], obj.position[2]] as [
          number,
          number,
          number,
        ],
        params: { ...obj.params },
      } as GridfinityObject

      newObjectIds.push(newId)
      newObjects.push(newObj)

      // Deep-copy modifiers recursively
      const idMap = new Map<string, string>()
      idMap.set(objectId, newId)

      const queue = [objectId]
      while (queue.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const parentId = queue.pop()!
        const childModifiers = state.modifiers.filter((m) => m.parentId === parentId)
        for (const mod of childModifiers) {
          const newModId = uuidv4()
          idMap.set(mod.id, newModId)
          const newMod = {
            ...mod,
            id: newModId,
            parentId: idMap.get(mod.parentId) ?? mod.parentId,
            params: { ...mod.params },
          } as Modifier
          newModifiers.push(newMod)
          queue.push(mod.id)
        }
      }
    }

    set((s) => ({
      objects: [...s.objects, ...newObjects],
      modifiers: [...s.modifiers, ...newModifiers],
    }))

    return newObjectIds
  },

  reorderObject: (fromIndex: number, toIndex: number) => {
    set((state) => {
      if (fromIndex < 0 || fromIndex >= state.objects.length) return state
      if (toIndex < 0 || toIndex >= state.objects.length) return state
      if (fromIndex === toIndex) return state
      const objects = [...state.objects]
      const [moved] = objects.splice(fromIndex, 1)
      objects.splice(toIndex, 0, moved)
      return { objects }
    })
  },

  reorderModifier: (parentId: string, fromIndex: number, toIndex: number) => {
    set((state) => {
      const modifiers = [...state.modifiers]

      // Find flat-array indices for this parent's modifiers
      const parentIndices: number[] = []
      for (let i = 0; i < modifiers.length; i++) {
        if (modifiers[i].parentId === parentId) {
          parentIndices.push(i)
        }
      }

      if (fromIndex < 0 || fromIndex >= parentIndices.length) return state
      if (toIndex < 0 || toIndex >= parentIndices.length) return state
      if (fromIndex === toIndex) return state

      // Remove the modifier at fromIndex (in the parent's local ordering)
      const removeAt = parentIndices[fromIndex]
      const [moved] = modifiers.splice(removeAt, 1)

      // After removal, recalculate parent indices
      const newParentIndices: number[] = []
      for (let i = 0; i < modifiers.length; i++) {
        if (modifiers[i].parentId === parentId) {
          newParentIndices.push(i)
        }
      }

      // Guard: if no siblings remain, re-insert at original position
      if (newParentIndices.length === 0) {
        modifiers.splice(removeAt, 0, moved)
        return state
      }

      // Insert at the target position among siblings
      const insertAt =
        toIndex >= newParentIndices.length
          ? newParentIndices[newParentIndices.length - 1] + 1
          : newParentIndices[toIndex]
      modifiers.splice(insertAt, 0, moved)

      return { modifiers }
    })
  },

  getModifierContext: (parentId: string, visited?: Set<string>) => {
    const state = get()
    const seen = visited ?? new Set<string>()

    if (seen.has(parentId)) {
      console.warn('Circular reference detected in modifier context chain at:', parentId)
      return null
    }
    seen.add(parentId)

    const obj = state.objects.find((o) => o.id === parentId)
    if (obj) {
      const objReg = objectKindRegistry.get(obj.kind)
      if (objReg?.supportsModifiers && objReg.computeModifierContext) {
        return objReg.computeModifierContext(
          obj.params as unknown as Record<string, unknown>,
          useProfileStore.getState().activeProfile,
        )
      }
      return null
    }

    const parentModifier = state.modifiers.find((m) => m.id === parentId)
    if (parentModifier) {
      const parentContext = state.getModifierContext(parentModifier.parentId, seen)
      if (!parentContext) return null

      const modReg = modifierKindRegistry.get(parentModifier.kind)
      if (modReg?.subdividesSpace && modReg.computeChildContext) {
        const result = modReg.computeChildContext(
          parentModifier.params as unknown as Record<string, unknown>,
          parentContext,
        )
        return Array.isArray(result) ? (result[0] ?? parentContext) : result
      }

      return parentContext
    }

    return null
  },
}))
