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
  selectedObjectIds: string[]
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
  showWireframe: boolean
  transparencyMode: boolean
  sectionView: boolean
  sectionPlaneY: number
  selectObject: (id: string | null, additive?: boolean) => void
  toggleObjectSelection: (id: string) => void
  clearSelection: () => void
  setSelectedObjectIds: (ids: string[]) => void
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
  toggleWireframe: () => void
  toggleTransparencyMode: () => void
  toggleSectionView: () => void
  setSectionPlaneY: (y: number) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  selectedObjectIds: [],
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
  showWireframe: false,
  transparencyMode: false,
  sectionView: false,
  sectionPlaneY: 20,

  selectObject: (id, additive = false) => {
    if (id === null) {
      set({ selectedObjectIds: [] })
    } else if (additive) {
      set((state) => {
        if (state.selectedObjectIds.includes(id)) {
          return { selectedObjectIds: state.selectedObjectIds.filter((oid) => oid !== id) }
        }
        return { selectedObjectIds: [...state.selectedObjectIds, id] }
      })
    } else {
      set({ selectedObjectIds: [id] })
    }
  },

  toggleObjectSelection: (id) => {
    set((state) => {
      if (state.selectedObjectIds.includes(id)) {
        return { selectedObjectIds: state.selectedObjectIds.filter((oid) => oid !== id) }
      }
      return { selectedObjectIds: [...state.selectedObjectIds, id] }
    })
  },

  clearSelection: () => {
    set({ selectedObjectIds: [] })
  },

  setSelectedObjectIds: (ids) => {
    set({ selectedObjectIds: ids })
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

  toggleWireframe: () => {
    set((state) => ({ showWireframe: !state.showWireframe }))
  },

  toggleTransparencyMode: () => {
    set((state) => ({ transparencyMode: !state.transparencyMode }))
  },

  toggleSectionView: () => {
    set((state) => ({ sectionView: !state.sectionView }))
  },

  setSectionPlaneY: (y) => {
    set({ sectionPlaneY: y })
  },
}))
