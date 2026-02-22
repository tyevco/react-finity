import { useEffect, useRef } from 'react'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { ObjectListPanel } from '@/components/panels/ObjectListPanel'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'
import { PrintSettingsPanel } from '@/components/panels/PrintSettingsPanel'
import { Viewport } from '@/components/viewport/Viewport'
import { PrintLayoutViewport } from '@/components/viewport/PrintLayoutViewport'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUIStore } from '@/store/uiStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

export function Layout() {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen)
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen)
  const setLeftPanelOpen = useUIStore((s) => s.setLeftPanelOpen)
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen)
  const activeView = useUIStore((s) => s.activeView)
  const isMobile = useIsMobile()
  const prevIsMobile = useRef<boolean | null>(null)

  useKeyboardShortcuts()

  const isEditView = activeView === 'edit'

  // Auto-collapse panels when on mobile, re-open when switching to desktop
  useEffect(() => {
    if (prevIsMobile.current === null || isMobile !== prevIsMobile.current) {
      if (isMobile) {
        setLeftPanelOpen(false)
        setRightPanelOpen(false)
      } else if (prevIsMobile.current !== null) {
        // Only re-open panels on transition from mobile to desktop, not on initial desktop mount
        setLeftPanelOpen(true)
        setRightPanelOpen(true)
      }
      prevIsMobile.current = isMobile
    }
  }, [isMobile, setLeftPanelOpen, setRightPanelOpen])

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: Left panel - Object list (edit view only) */}
        {!isMobile && isEditView && (
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
        <div className="flex-1">{isEditView ? <Viewport /> : <PrintLayoutViewport />}</div>

        {/* Desktop: Right panel - Properties (edit) or Print Settings (print layout) */}
        {!isMobile && (
          <div
            className={cn(
              'border-l border-border bg-background transition-all duration-200',
              rightPanelOpen ? 'w-72' : 'w-0',
            )}
          >
            {rightPanelOpen && (isEditView ? <PropertiesPanel /> : <PrintSettingsPanel />)}
          </div>
        )}
      </div>

      {/* Mobile: Left panel as sheet overlay */}
      {isMobile && isEditView && (
        <Sheet
          open={leftPanelOpen}
          onOpenChange={(open) => {
            setLeftPanelOpen(open)
            if (open) setRightPanelOpen(false)
          }}
        >
          <SheetContent side="left" className="w-60 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Objects</SheetTitle>
            </SheetHeader>
            <ObjectListPanel />
          </SheetContent>
        </Sheet>
      )}

      {/* Mobile: Right panel as sheet overlay */}
      {isMobile && (
        <Sheet
          open={rightPanelOpen}
          onOpenChange={(open) => {
            setRightPanelOpen(open)
            if (open) setLeftPanelOpen(false)
          }}
        >
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{isEditView ? 'Properties' : 'Print Settings'}</SheetTitle>
            </SheetHeader>
            {isEditView ? <PropertiesPanel /> : <PrintSettingsPanel />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
