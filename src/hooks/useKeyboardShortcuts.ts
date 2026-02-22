import { useEffect } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { mergeObjectWithModifiers } from '@/engine/export/mergeObjectGeometry'
import { getPrintRotation, applyPrintOrientation } from '@/engine/export/printOrientation'
import { exportObjectAsSTL } from '@/engine/export/stlExporter'

export function useKeyboardShortcuts() {
  const removeObject = useProjectStore((s) => s.removeObject)
  const selectedObjectId = useUIStore((s) => s.selectedObjectId)
  const selectObject = useUIStore((s) => s.selectObject)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          e.preventDefault()
          removeObject(selectedObjectId)
          selectObject(null)
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        // Undo is a stub for Phase 6
      }

      if (e.key === 'Escape') {
        selectObject(null)
      }

      // Ctrl+Shift+E: Export selected object as STL
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        if (selectedObjectId) {
          const objects = useProjectStore.getState().objects
          const modifiers = useProjectStore.getState().modifiers
          const profile = useProfileStore.getState().activeProfile
          const obj = objects.find((o) => o.id === selectedObjectId)
          if (obj) {
            const merged = mergeObjectWithModifiers(obj, modifiers, profile)
            const rotation = getPrintRotation(obj)
            const oriented = applyPrintOrientation(merged, rotation)
            exportObjectAsSTL(oriented, obj.name)
            merged.dispose()
            oriented.dispose()
          }
        }
      }

      // Ctrl+P: Toggle print layout view
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        const { activeView, setActiveView } = useUIStore.getState()
        setActiveView(activeView === 'edit' ? 'printLayout' : 'edit')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedObjectId, removeObject, selectObject])
}
