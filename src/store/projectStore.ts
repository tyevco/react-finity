import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  GridfinityObject,
  BaseplateParams,
  BinParams,
  GridfinityObjectKind,
} from '@/types/gridfinity'
import { DEFAULT_BASEPLATE_PARAMS, DEFAULT_BIN_PARAMS } from '@/engine/constants'

interface ProjectStore {
  objects: GridfinityObject[]
  addObject: (kind: GridfinityObjectKind) => string
  updateObjectParams: (id: string, params: Partial<BaseplateParams | BinParams>) => void
  updateObjectPosition: (id: string, position: [number, number, number]) => void
  updateObjectName: (id: string, name: string) => void
  removeObject: (id: string) => void
  clearObjects: () => void
}

let objectCounter = 0

function getNextName(kind: GridfinityObjectKind): string {
  objectCounter++
  const kindNames: Record<GridfinityObjectKind, string> = {
    baseplate: 'Baseplate',
    bin: 'Bin',
    lid: 'Lid',
  }
  return `${kindNames[kind]} ${objectCounter}`
}

export const useProjectStore = create<ProjectStore>()((set) => ({
  objects: [],

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
      case 'lid':
        newObject = {
          kind: 'lid',
          id,
          name,
          position: [0, 0, 0],
          params: { gridWidth: 1, gridDepth: 1, stacking: false },
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
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
    }))
  },

  clearObjects: () => {
    set({ objects: [] })
  },
}))
