import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { ProjectMeta, ProjectData } from '@/types/gridfinity'
import { useProjectStore, resetObjectCounter } from './projectStore'
import { useUIStore } from './uiStore'

const PROJECT_DATA_KEY_PREFIX = 'react-finity-project-'
const AUTO_SAVE_DELAY = 2000

function projectDataKey(id: string): string {
  return `${PROJECT_DATA_KEY_PREFIX}${id}`
}

function isValidObject(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false
  const o = obj as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.kind === 'string' &&
    o.params !== null &&
    typeof o.params === 'object' &&
    Array.isArray(o.position) &&
    o.position.length === 3
  )
}

function isValidModifier(mod: unknown): boolean {
  if (typeof mod !== 'object' || mod === null) return false
  const m = mod as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.parentId === 'string' &&
    typeof m.kind === 'string' &&
    m.params !== null &&
    typeof m.params === 'object'
  )
}

function readProjectData(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(projectDataKey(id))
    if (!raw) return null
    const data = JSON.parse(raw) as ProjectData
    if (!Array.isArray(data.objects) || !Array.isArray(data.modifiers)) return null

    // Filter out malformed entries to be resilient against corrupted data
    const validObjects = data.objects.filter(isValidObject)
    const validModifiers = data.modifiers.filter(isValidModifier)

    if (
      validObjects.length < data.objects.length ||
      validModifiers.length < data.modifiers.length
    ) {
      console.warn(
        `Project ${id}: filtered out ${data.objects.length - validObjects.length} invalid objects and ${data.modifiers.length - validModifiers.length} invalid modifiers`,
      )
    }

    return { objects: validObjects, modifiers: validModifiers } as ProjectData
  } catch {
    return null
  }
}

function writeProjectData(id: string, data: ProjectData): boolean {
  try {
    localStorage.setItem(projectDataKey(id), JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Failed to write project data (localStorage quota exceeded?):', error)
    return false
  }
}

function deleteProjectData(id: string): void {
  localStorage.removeItem(projectDataKey(id))
}

interface ProjectManagerStore {
  currentProjectId: string | null
  currentProjectName: string
  isDirty: boolean
  projects: ProjectMeta[]
  newProject: () => void
  saveProject: () => void
  saveProjectAs: (name: string) => void
  loadProject: (id: string) => void
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void
  markDirty: () => void
  initializeProject: () => void
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

export const useProjectManagerStore = create<ProjectManagerStore>()(
  persist(
    (set, get) => ({
      currentProjectId: null,
      currentProjectName: 'Untitled Project',
      isDirty: false,
      projects: [],

      newProject: () => {
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer)
          autoSaveTimer = null
        }
        useUIStore.getState().clearSelection()
        useProjectStore.getState().clearObjects()
        resetObjectCounter([])
        set({
          currentProjectId: null,
          currentProjectName: 'Untitled Project',
          isDirty: false,
        })
      },

      saveProject: () => {
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer)
          autoSaveTimer = null
        }

        const state = get()
        const { objects, modifiers } = useProjectStore.getState()
        const now = new Date().toISOString()

        const isNewProject = !state.currentProjectId
        const projectId = state.currentProjectId ?? uuidv4()

        // Write data BEFORE updating state to prevent phantom project
        // metadata when localStorage write fails for new projects
        if (!writeProjectData(projectId, { objects, modifiers })) {
          console.warn('Project save failed for:', projectId)
          set({ isDirty: true })
          return
        }

        if (isNewProject) {
          const meta: ProjectMeta = {
            id: projectId,
            name: state.currentProjectName,
            createdAt: now,
            updatedAt: now,
          }
          set((s) => ({
            currentProjectId: projectId,
            isDirty: false,
            projects: [...s.projects, meta],
          }))
        } else {
          set((s) => ({
            isDirty: false,
            projects: s.projects.map((p) => (p.id === projectId ? { ...p, updatedAt: now } : p)),
          }))
        }
      },

      saveProjectAs: (name: string) => {
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer)
          autoSaveTimer = null
        }

        const { objects, modifiers } = useProjectStore.getState()
        const now = new Date().toISOString()
        const projectId = uuidv4()

        const meta: ProjectMeta = {
          id: projectId,
          name,
          createdAt: now,
          updatedAt: now,
        }

        if (!writeProjectData(projectId, { objects, modifiers })) {
          console.warn('Project saveAs failed for:', projectId)
          // Mark dirty so auto-save retries on next change (matches saveProject behavior)
          set({ isDirty: true })
          return
        }

        set((s) => ({
          currentProjectId: projectId,
          currentProjectName: name,
          isDirty: false,
          projects: [...s.projects, meta],
        }))
      },

      loadProject: (id: string) => {
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer)
          autoSaveTimer = null
        }

        const data = readProjectData(id)
        if (!data) return

        const meta = get().projects.find((p) => p.id === id)
        if (!meta) return

        useUIStore.getState().clearSelection()
        useProjectStore.getState().loadProjectData(data)

        set({
          currentProjectId: id,
          currentProjectName: meta.name,
          isDirty: false,
        })
      },

      renameProject: (id: string, name: string) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)),
          currentProjectName: s.currentProjectId === id ? name : s.currentProjectName,
        }))
      },

      deleteProject: (id: string) => {
        deleteProjectData(id)

        const state = get()
        const isCurrentProject = state.currentProjectId === id

        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
        }))

        if (isCurrentProject) {
          isLoadingProject = true
          try {
            get().newProject()
          } finally {
            isLoadingProject = false
          }
        }
      },

      markDirty: () => {
        set({ isDirty: true })

        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer)
        }

        // Capture project ID so the timer only auto-saves if we're still
        // on the same project (defense-in-depth; loadProject also clears the timer)
        const projectIdAtMark = get().currentProjectId
        autoSaveTimer = setTimeout(() => {
          autoSaveTimer = null
          if (get().currentProjectId === projectIdAtMark) {
            get().saveProject()
          }
        }, AUTO_SAVE_DELAY)
      },

      initializeProject: () => {
        if (projectInitialized) return
        projectInitialized = true
        const state = get()
        if (state.currentProjectId) {
          const data = readProjectData(state.currentProjectId)
          if (data) {
            useProjectStore.getState().loadProjectData(data)
          }
        }
      },
    }),
    {
      name: 'react-finity-project-manager',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
        currentProjectName: state.currentProjectName,
        projects: state.projects,
      }),
    },
  ),
)

// Module-level flag to prevent auto-save and history tracking during project
// load/undo operations. Stored outside Zustand because it must be synchronously
// readable by the projectStore subscription callback and the historyStore
// subscription callback, both of which run outside of React's lifecycle.
let isLoadingProject = false

export function getIsLoadingProject(): boolean {
  return isLoadingProject
}

export function setIsLoadingProject(value: boolean): void {
  isLoadingProject = value
}

// Tracks whether onFinishHydration already loaded the project, so
// initializeProject() in App.tsx can skip the redundant second load.
let projectInitialized = false

// Wrap loadProjectData to set the isLoadingProject flag, preventing
// auto-save and history tracking during project loads.
// Guard against double-wrapping on HMR module re-execution.
const _loadProjectData = useProjectStore.getState().loadProjectData
if (!(_loadProjectData as unknown as Record<string, unknown>).__isWrapped) {
  const wrappedLoad = Object.assign(
    (data: ProjectData) => {
      isLoadingProject = true
      try {
        _loadProjectData(data)
      } finally {
        isLoadingProject = false
      }
    },
    { __isWrapped: true as const },
  )
  useProjectStore.setState({ loadProjectData: wrappedLoad })
}

const unsubProjectChanges = useProjectStore.subscribe((state, prevState) => {
  if (isLoadingProject) return
  if (state.objects !== prevState.objects || state.modifiers !== prevState.modifiers) {
    useProjectManagerStore.getState().markDirty()
  }
})

// Clean up subscription and pending timers on HMR to prevent duplicate
// listeners and stale callbacks referencing old module state.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubProjectChanges()
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
      autoSaveTimer = null
    }
  })
}

// Auto-load project data after persist middleware rehydrates.
if (typeof window !== 'undefined') {
  const unsubFinishHydration = useProjectManagerStore.persist.onFinishHydration((state) => {
    if (state.currentProjectId) {
      const data = readProjectData(state.currentProjectId)
      if (data) {
        // loadProjectData is already wrapped with isLoadingProject guards
        useProjectStore.getState().loadProjectData(data)
      }
    }
    projectInitialized = true
    unsubFinishHydration()
  })
}
