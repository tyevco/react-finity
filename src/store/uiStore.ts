import { create } from 'zustand'
import type {
  ViewportBackground,
  LightingPreset,
  CameraPreset,
  AppView,
  CurveQuality,
} from '@/types/gridfinity'
import { setCurveQuality as setPrimitivesCurveQuality } from '@/engine/geometry/primitives'

interface UIStore {
  selectedObjectId: string | null
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  viewportBackground: ViewportBackground
  lightingPreset: LightingPreset
  cameraPreset: CameraPreset | null
  snapToGrid: boolean
  showMeasurements: boolean
  activeView: AppView
  printBedPreset: string
  printBedSpacing: number
  exportScale: number
  curveQuality: CurveQuality
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
  setActiveView: (view: AppView) => void
  setPrintBedPreset: (key: string) => void
  setPrintBedSpacing: (spacing: number) => void
  setExportScale: (scale: number) => void
  setCurveQuality: (quality: CurveQuality) => void
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
  activeView: 'edit',
  printBedPreset: '256x256',
  printBedSpacing: 10,
  exportScale: 1.0,
  curveQuality: 'medium',

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

  setActiveView: (view) => {
    set({ activeView: view })
  },

  setPrintBedPreset: (key) => {
    set({ printBedPreset: key })
  },

  setPrintBedSpacing: (spacing) => {
    set({ printBedSpacing: spacing })
  },

  setExportScale: (scale) => {
    set({ exportScale: scale })
  },

  setCurveQuality: (quality) => {
    setPrimitivesCurveQuality(quality)
    set({ curveQuality: quality })
  },
}))
