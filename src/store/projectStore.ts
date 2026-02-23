import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  GridfinityObject,
  BaseplateParams,
  BinParams,
  GridfinityObjectKind,
  Modifier,
  ModifierKind,
  ModifierContext,
  ProjectData,
} from '@/types/gridfinity'
import { PROFILE_OFFICIAL } from '@/engine/constants'
import { objectKindRegistry } from '@/engine/registry/objectKindRegistry'
import { modifierKindRegistry } from '@/engine/registry/modifierKindRegistry'

type AnyModifierParams = Record<string, unknown>

interface ProjectStore {
  objects: GridfinityObject[]
  modifiers: Modifier[]
  addObject: (kind: GridfinityObjectKind) => string
  updateObjectParams: (id: string, params: Partial<BaseplateParams | BinParams>) => void
  updateObjectPosition: (id: string, position: [number, number, number]) => void
  updateObjectName: (id: string, name: string) => void
  removeObject: (id: string) => void
  clearObjects: () => void
  addModifier: (parentId: string, kind: ModifierKind) => string
  updateModifierParams: (id: string, params: AnyModifierParams) => void
  removeModifier: (id: string) => void
  loadProjectData: (data: ProjectData) => void
  getModifiersForParent: (parentId: string) => Modifier[]
  getRootObjectId: (modifierId: string) => string | null
  getModifierContext: (parentId: string) => ModifierContext | null
  duplicateObjects: (ids: string[]) => string[]
  reorderObject: (fromIndex: number, toIndex: number) => void
  reorderModifier: (parentId: string, fromIndex: number, toIndex: number) => void
}

let objectCounter = 0

function getNextName(kind: GridfinityObjectKind): string {
  objectCounter++
  const reg = objectKindRegistry.getOrThrow(kind)
  return `${reg.label} ${objectCounter}`
}

function getDefaultModifierParams(kind: ModifierKind): Record<string, unknown> {
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

function collectDescendantModifierIds(modifiers: Modifier[], rootId: string): Set<string> {
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

  addObject: (kind: GridfinityObjectKind) => {
    const id = uuidv4()
    const name = getNextName(kind)
    const reg = objectKindRegistry.getOrThrow(kind)

    const newObject = {
      kind,
      id,
      name,
      position: [0, 0, 0] as [number, number, number],
      params: { ...reg.defaultParams },
    } as unknown as GridfinityObject

    set((state) => ({ objects: [...state.objects, newObject] }))
    return id
  },

  updateObjectParams: (id, params) => {
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, params: { ...obj.params, ...params } } : obj,
      ) as GridfinityObject[],
    }))
  },

  updateObjectPosition: (id, position) => {
    set((state) => ({
      objects: state.objects.map((obj) => (obj.id === id ? { ...obj, position } : obj)),
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

  clearObjects: () => {
    set({ objects: [], modifiers: [] })
  },

  loadProjectData: (data: ProjectData) => {
    resetObjectCounter(data.objects)
    set({ objects: data.objects, modifiers: data.modifiers })
  },

  addModifier: (parentId: string, kind: ModifierKind) => {
    const id = uuidv4()
    const params = getDefaultModifierParams(kind)

    const newModifier = { id, parentId, kind, params } as unknown as Modifier

    set((state) => ({ modifiers: [...state.modifiers, newModifier] }))
    return id
  },

  updateModifierParams: (id, params) => {
    set((state) => ({
      modifiers: state.modifiers.map((mod) =>
        mod.id === id ? { ...mod, params: { ...mod.params, ...params } } : mod,
      ) as Modifier[],
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

    for (let depth = 0; depth < 100; depth++) {
      const modifier = state.modifiers.find((mod) => mod.id === currentId)
      if (!modifier) {
        const obj = state.objects.find((o) => o.id === currentId)
        return obj ? obj.id : null
      }
      currentId = modifier.parentId
    }

    return null
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
      const objects = [...state.objects]
      const [moved] = objects.splice(fromIndex, 1)
      objects.splice(toIndex, 0, moved)
      return { objects }
    })
  },

  reorderModifier: (parentId: string, fromIndex: number, toIndex: number) => {
    set((state) => {
      const parentMods = state.modifiers.filter((m) => m.parentId === parentId)
      const otherMods = state.modifiers.filter((m) => m.parentId !== parentId)

      const [moved] = parentMods.splice(fromIndex, 1)
      parentMods.splice(toIndex, 0, moved)

      return { modifiers: [...otherMods, ...parentMods] }
    })
  },

  getModifierContext: (parentId: string) => {
    const state = get()

    const obj = state.objects.find((o) => o.id === parentId)
    if (obj) {
      const objReg = objectKindRegistry.get(obj.kind)
      if (objReg?.supportsModifiers && objReg.computeModifierContext) {
        return objReg.computeModifierContext(
          obj.params as unknown as Record<string, unknown>,
          PROFILE_OFFICIAL,
        )
      }
      return null
    }

    const parentModifier = state.modifiers.find((m) => m.id === parentId)
    if (parentModifier) {
      const parentContext = state.getModifierContext(parentModifier.parentId)
      if (!parentContext) return null

      const modReg = modifierKindRegistry.get(parentModifier.kind)
      if (modReg?.subdividesSpace && modReg.computeChildContext) {
        return modReg.computeChildContext(
          parentModifier.params as unknown as Record<string, unknown>,
          parentContext,
        )
      }

      return parentContext
    }

    return null
  },
}))
