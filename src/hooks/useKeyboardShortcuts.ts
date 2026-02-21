import { useEffect } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'

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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedObjectId, removeObject, selectObject])
}
