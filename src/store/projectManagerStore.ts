import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { ProjectMeta, ProjectData } from '@/types/gridfinity'
import { useProjectStore, resetObjectCounter } from './projectStore'

const PROJECT_DATA_KEY_PREFIX = 'react-finity-project-'
const AUTO_SAVE_DELAY = 2000

function projectDataKey(id: string): string {
  return `${PROJECT_DATA_KEY_PREFIX}${id}`
}

function readProjectData(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(projectDataKey(id))
    if (!raw) return null
    const data = JSON.parse(raw) as ProjectData
    if (!Array.isArray(data.objects) || !Array.isArray(data.modifiers)) return null
    return data
  } catch {
    return null
  }
}

function writeProjectData(id: string, data: ProjectData): void {
  localStorage.setItem(projectDataKey(id), JSON.stringify(data))
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

        let projectId = state.currentProjectId
        if (!projectId) {
          projectId = uuidv4()
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
            projects: s.projects.map((p) =>
              p.id === projectId ? { ...p, updatedAt: now } : p,
            ),
          }))
        }

        writeProjectData(projectId, { objects, modifiers })
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

        writeProjectData(projectId, { objects, modifiers })

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

        useProjectStore.getState().loadProjectData(data)

        set({
          currentProjectId: id,
          currentProjectName: meta.name,
          isDirty: false,
        })
      },

      renameProject: (id: string, name: string) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, name } : p,
          ),
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
          get().newProject()
        }
      },

      markDirty: () => {
        set({ isDirty: true })

        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer)
        }

        autoSaveTimer = setTimeout(() => {
          autoSaveTimer = null
          get().saveProject()
        }, AUTO_SAVE_DELAY)
      },

      initializeProject: () => {
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

// Flag to prevent auto-save triggering during project load operations.
let isLoadingProject = false

// Subscribe to projectStore changes and trigger auto-save.
const originalLoadProjectData = useProjectStore.getState().loadProjectData
useProjectStore.setState({
  loadProjectData: (data) => {
    isLoadingProject = true
    originalLoadProjectData(data)
    isLoadingProject = false
  },
})

useProjectStore.subscribe((state, prevState) => {
  if (isLoadingProject) return
  if (state.objects !== prevState.objects || state.modifiers !== prevState.modifiers) {
    useProjectManagerStore.getState().markDirty()
  }
})

// Auto-load project data after persist middleware rehydrates.
if (typeof window !== 'undefined') {
  const unsubFinishHydration = useProjectManagerStore.persist.onFinishHydration((state) => {
    if (state.currentProjectId) {
      const data = readProjectData(state.currentProjectId)
      if (data) {
        isLoadingProject = true
        useProjectStore.getState().loadProjectData(data)
        isLoadingProject = false
      }
    }
    unsubFinishHydration()
  })
}
