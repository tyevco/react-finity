import { create } from 'zustand'
import type { ViewportBackground, LightingPreset, CameraPreset } from '@/types/gridfinity'

interface UIStore {
  selectedObjectId: string | null
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  viewportBackground: ViewportBackground
  lightingPreset: LightingPreset
  cameraPreset: CameraPreset | null
  snapToGrid: boolean
  showMeasurements: boolean
  selectObject: (id: string | null) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setLeftPanelOpen: (open: boolean) => void
  setRightPanelOpen: (open: boolean) => void
  setViewportBackground: (bg: ViewportBackground) => void
  setLightingPreset: (preset: LightingPreset) => void
  setCameraPreset: (preset: CameraPreset | null) => void
  toggleSnapToGrid: () => void
  toggleShowMeasurements: () => void
}

export const useUIStore = create<UIStore>()((set) => ({
  selectedObjectId: null,
  leftPanelOpen: true,
  rightPanelOpen: true,
  viewportBackground: 'dark',
  lightingPreset: 'studio',
  cameraPreset: null,
  snapToGrid: true,
  showMeasurements: true,

  selectObject: (id) => {
    set({ selectedObjectId: id })
  },

  toggleLeftPanel: () => {
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen }))
  },

  toggleRightPanel: () => {
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen }))
  },

  setLeftPanelOpen: (open) => {
    set({ leftPanelOpen: open })
  },

  setRightPanelOpen: (open) => {
    set({ rightPanelOpen: open })
  },

  setViewportBackground: (bg) => {
    set({ viewportBackground: bg })
  },

  setLightingPreset: (preset) => {
    set({ lightingPreset: preset })
  },

  setCameraPreset: (preset) => {
    set({ cameraPreset: preset })
  },

  toggleSnapToGrid: () => {
    set((state) => ({ snapToGrid: !state.snapToGrid }))
  },

  toggleShowMeasurements: () => {
    set((state) => ({ showMeasurements: !state.showMeasurements }))
  },
}))
