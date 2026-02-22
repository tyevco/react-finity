import { Toolbar } from '@/components/toolbar/Toolbar'
import { ObjectListPanel } from '@/components/panels/ObjectListPanel'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'
import { PrintSettingsPanel } from '@/components/panels/PrintSettingsPanel'
import { Viewport } from '@/components/viewport/Viewport'
import { PrintLayoutViewport } from '@/components/viewport/PrintLayoutViewport'
import { useUIStore } from '@/store/uiStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'

export function Layout() {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen)
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen)
  const activeView = useUIStore((s) => s.activeView)

  useKeyboardShortcuts()

  const isEditView = activeView === 'edit'

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Object list (edit view only) */}
        {isEditView && (
          <div
            className={cn(
              'border-r border-border bg-background transition-all duration-200',
              leftPanelOpen ? 'w-60' : 'w-0',
            )}
          >
            {leftPanelOpen && <ObjectListPanel />}
          </div>
        )}

        {/* Center - 3D Viewport */}
        <div className="flex-1">
          {isEditView ? <Viewport /> : <PrintLayoutViewport />}
        </div>

        {/* Right panel - Properties (edit) or Print Settings (print layout) */}
        <div
          className={cn(
            'border-l border-border bg-background transition-all duration-200',
            rightPanelOpen ? 'w-72' : 'w-0',
          )}
        >
          {rightPanelOpen && (isEditView ? <PropertiesPanel /> : <PrintSettingsPanel />)}
        </div>
      </div>
    </div>
  )
}
