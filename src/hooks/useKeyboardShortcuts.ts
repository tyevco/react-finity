import { useEffect } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { useProjectManagerStore } from '@/store/projectManagerStore'
import { useHistoryStore } from '@/store/historyStore'
import { mergeObjectWithModifiers } from '@/engine/export/mergeObjectGeometry'
import { getPrintRotation, applyPrintOrientation } from '@/engine/export/printOrientation'
import { exportObjectAsSTL } from '@/engine/export/stlExporter'

let clipboard: string[] = []

export function useKeyboardShortcuts() {
  const removeObject = useProjectStore((s) => s.removeObject)
  const selectedObjectIds = useUIStore((s) => s.selectedObjectIds)
  const clearSelection = useUIStore((s) => s.clearSelection)
  const setSelectedObjectIds = useUIStore((s) => s.setSelectedObjectIds)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Delete/Backspace: Remove selected objects
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectIds.length > 0) {
          e.preventDefault()
          for (const id of selectedObjectIds) {
            removeObject(id)
          }
          clearSelection()
        }
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useHistoryStore.getState().undo()
      }

      // Ctrl+Shift+Z / Ctrl+Y: Redo
      if (
        (e.ctrlKey || e.metaKey) &&
        ((e.shiftKey && (e.key === 'Z' || e.key === 'z')) || e.key === 'y')
      ) {
        e.preventDefault()
        useHistoryStore.getState().redo()
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        clearSelection()
      }

      // Ctrl+S: Save project
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        useProjectManagerStore.getState().saveProject()
      }

      // Ctrl+C: Copy selected objects to internal clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        if (selectedObjectIds.length > 0) {
          e.preventDefault()
          clipboard = [...selectedObjectIds]
        }
      }

      // Ctrl+V: Paste from internal clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
        if (clipboard.length > 0) {
          e.preventDefault()
          const existingIds = useProjectStore.getState().objects.map((o) => o.id)
          const validIds = clipboard.filter((id) => existingIds.includes(id))
          if (validIds.length > 0) {
            const newIds = useProjectStore.getState().duplicateObjects(validIds)
            setSelectedObjectIds(newIds)
          }
        }
      }

      // Ctrl+D: Duplicate selected objects
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedObjectIds.length > 0) {
          e.preventDefault()
          const newIds = useProjectStore.getState().duplicateObjects(selectedObjectIds)
          setSelectedObjectIds(newIds)
        }
      }

      // Ctrl+Shift+E: Export selected object as STL (single selection only)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        if (selectedObjectIds.length === 1) {
          const objects = useProjectStore.getState().objects
          const modifiers = useProjectStore.getState().modifiers
          const profile = useProfileStore.getState().activeProfile
          const obj = objects.find((o) => o.id === selectedObjectIds[0])
          if (obj) {
            const scale = useUIStore.getState().exportScale
            const merged = mergeObjectWithModifiers(obj, modifiers, profile)
            const rotation = getPrintRotation(obj)
            const oriented = applyPrintOrientation(merged, rotation)
            exportObjectAsSTL(oriented, obj.name, scale)
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
  }, [selectedObjectIds, removeObject, clearSelection, setSelectedObjectIds])
}
