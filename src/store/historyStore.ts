import { create } from 'zustand'
import type { GridfinityObject, Modifier } from '@/types/gridfinity'
import { useProjectStore } from './projectStore'
import {
  getIsLoadingProject,
  setIsLoadingProject,
  useProjectManagerStore,
} from './projectManagerStore'

const MAX_HISTORY = 50
const DEBOUNCE_MS = 300

interface HistorySnapshot {
  objects: GridfinityObject[]
  modifiers: Modifier[]
}

interface HistoryStore {
  past: HistorySnapshot[]
  future: HistorySnapshot[]
  canUndo: boolean
  canRedo: boolean
  pushSnapshot: (snapshot: HistorySnapshot) => void
  undo: () => void
  redo: () => void
  clear: () => void
}

let isUndoRedoInProgress = false

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushSnapshot: (snapshot: HistorySnapshot) => {
    set((state) => {
      const newPast = [...state.past, snapshot]
      if (newPast.length > MAX_HISTORY) {
        newPast.shift()
      }
      return {
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false,
      }
    })
  },

  undo: () => {
    const { past, canUndo } = get()
    if (!canUndo || past.length === 0) return

    const { objects, modifiers } = useProjectStore.getState()
    const currentSnapshot: HistorySnapshot = { objects, modifiers }

    const previousSnapshot = past[past.length - 1]
    const newPast = past.slice(0, -1)

    isUndoRedoInProgress = true
    setIsLoadingProject(true)
    useProjectStore.setState({
      objects: previousSnapshot.objects,
      modifiers: previousSnapshot.modifiers,
    })
    setIsLoadingProject(false)
    isUndoRedoInProgress = false

    set({
      past: newPast,
      future: [currentSnapshot, ...get().future],
      canUndo: newPast.length > 0,
      canRedo: true,
    })

    useProjectManagerStore.getState().markDirty()
  },

  redo: () => {
    const { future, canRedo } = get()
    if (!canRedo || future.length === 0) return

    const { objects, modifiers } = useProjectStore.getState()
    const currentSnapshot: HistorySnapshot = { objects, modifiers }

    const nextSnapshot = future[0]
    const newFuture = future.slice(1)

    isUndoRedoInProgress = true
    setIsLoadingProject(true)
    useProjectStore.setState({
      objects: nextSnapshot.objects,
      modifiers: nextSnapshot.modifiers,
    })
    setIsLoadingProject(false)
    isUndoRedoInProgress = false

    set({
      past: [...get().past, currentSnapshot],
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    })

    useProjectManagerStore.getState().markDirty()
  },

  clear: () => {
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    })
  },
}))

// Debounced subscription to projectStore changes for history tracking
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingSnapshot: HistorySnapshot | null = null

useProjectStore.subscribe((state, prevState) => {
  if (isUndoRedoInProgress) return
  if (getIsLoadingProject()) return
  if (state.objects === prevState.objects && state.modifiers === prevState.modifiers) return

  // Capture the pre-change state as the snapshot (first in a burst)
  pendingSnapshot ??= {
    objects: prevState.objects,
    modifiers: prevState.modifiers,
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    if (pendingSnapshot) {
      useHistoryStore.getState().pushSnapshot(pendingSnapshot)
      pendingSnapshot = null
    }
    debounceTimer = null
  }, DEBOUNCE_MS)
})

// Clear history when switching projects (new project or load project).
// Skip when currentProjectId changes from null (initial auto-save assigns an ID
// but that should not wipe the user's undo history).
useProjectManagerStore.subscribe((state, prevState) => {
  if (
    state.currentProjectId !== prevState.currentProjectId &&
    prevState.currentProjectId !== null
  ) {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    pendingSnapshot = null
    useHistoryStore.getState().clear()
  }
})
