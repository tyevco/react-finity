import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  GridfinityObject,
  BaseplateParams,
  BinParams,
  GridfinityObjectKind,
  Modifier,
  ModifierKind,
  DividerGridModifierParams,
  LabelTabModifierParams,
  ScoopModifierParams,
  InsertModifierParams,
  LidModifierParams,
  ModifierContext,
  ProjectData,
} from '@/types/gridfinity'
import {
  DEFAULT_BASEPLATE_PARAMS,
  DEFAULT_BIN_PARAMS,
  DEFAULT_DIVIDER_GRID_PARAMS,
  DEFAULT_LABEL_TAB_PARAMS,
  DEFAULT_SCOOP_PARAMS,
  DEFAULT_INSERT_PARAMS,
  DEFAULT_LID_PARAMS,
  PROFILE_OFFICIAL,
} from '@/engine/constants'

type AnyModifierParams =
  | Partial<DividerGridModifierParams>
  | Partial<LabelTabModifierParams>
  | Partial<ScoopModifierParams>
  | Partial<InsertModifierParams>
  | Partial<LidModifierParams>

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
}

let objectCounter = 0

function getNextName(kind: GridfinityObjectKind): string {
  objectCounter++
  const kindNames: Record<GridfinityObjectKind, string> = {
    baseplate: 'Baseplate',
    bin: 'Bin',
  }
  return `${kindNames[kind]} ${objectCounter}`
}

function getDefaultModifierParams(kind: ModifierKind): Modifier['params'] {
  switch (kind) {
    case 'dividerGrid':
      return { ...DEFAULT_DIVIDER_GRID_PARAMS }
    case 'labelTab':
      return { ...DEFAULT_LABEL_TAB_PARAMS }
    case 'scoop':
      return { ...DEFAULT_SCOOP_PARAMS }
    case 'insert':
      return { ...DEFAULT_INSERT_PARAMS }
    case 'lid':
      return { ...DEFAULT_LID_PARAMS }
  }
}

export function resetObjectCounter(objects: GridfinityObject[]): void {
  let maxCounter = 0
  for (const obj of objects) {
    const match = obj.name.match(/\s(\d+)$/)
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

    let newObject: GridfinityObject

    switch (kind) {
      case 'baseplate':
        newObject = {
          kind: 'baseplate',
          id,
          name,
          position: [0, 0, 0],
          params: { ...DEFAULT_BASEPLATE_PARAMS },
        }
        break
      case 'bin':
        newObject = {
          kind: 'bin',
          id,
          name,
          position: [0, 0, 0],
          params: { ...DEFAULT_BIN_PARAMS },
        }
        break
    }

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

    const newModifier = { id, parentId, kind, params } as Modifier

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

  getModifierContext: (parentId: string) => {
    const state = get()

    const obj = state.objects.find((o) => o.id === parentId)
    if (obj?.kind === 'bin') {
      const { gridWidth, gridDepth, heightUnits, wallThickness } = obj.params
      const profile = PROFILE_OFFICIAL
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

    const parentModifier = state.modifiers.find((m) => m.id === parentId)
    if (parentModifier) {
      const parentContext = state.getModifierContext(parentModifier.parentId)
      if (!parentContext) return null

      if (parentModifier.kind === 'insert') {
        const insertParams = parentModifier.params
        const compartmentWidth =
          (parentContext.innerWidth -
            insertParams.wallThickness * (insertParams.compartmentsX + 1)) /
          insertParams.compartmentsX
        const compartmentDepth =
          (parentContext.innerDepth -
            insertParams.wallThickness * (insertParams.compartmentsY + 1)) /
          insertParams.compartmentsY

        return {
          innerWidth: compartmentWidth,
          innerDepth: compartmentDepth,
          wallHeight: parentContext.wallHeight,
          floorY: parentContext.floorY,
          centerX: parentContext.centerX,
          centerZ: parentContext.centerZ,
        }
      }

      if (parentModifier.kind === 'dividerGrid') {
        const divParams = parentModifier.params
        const compartmentWidth =
          (parentContext.innerWidth - divParams.wallThickness * divParams.dividersX) /
          (divParams.dividersX + 1)
        const compartmentDepth =
          (parentContext.innerDepth - divParams.wallThickness * divParams.dividersY) /
          (divParams.dividersY + 1)

        return {
          innerWidth: compartmentWidth,
          innerDepth: compartmentDepth,
          wallHeight: parentContext.wallHeight,
          floorY: parentContext.floorY,
          centerX: parentContext.centerX,
          centerZ: parentContext.centerZ,
        }
      }

      return parentContext
    }

    return null
  },
}))
