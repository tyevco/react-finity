import { create } from 'zustand'

interface UIStore {
  selectedObjectId: string | null
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  selectObject: (id: string | null) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setLeftPanelOpen: (open: boolean) => void
  setRightPanelOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  selectedObjectId: null,
  leftPanelOpen: true,
  rightPanelOpen: true,

  selectObject: (id) => set({ selectedObjectId: id }),

  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),

  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
}))
