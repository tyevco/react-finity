import { useEffect, useRef } from 'react'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { ObjectListPanel } from '@/components/panels/ObjectListPanel'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'
import { PrintSettingsPanel } from '@/components/panels/PrintSettingsPanel'
import { Viewport } from '@/components/viewport/Viewport'
import { PrintLayoutViewport } from '@/components/viewport/PrintLayoutViewport'
import { ViewportErrorBoundary } from '@/components/viewport/ViewportErrorBoundary'
import { PrintLayoutProvider } from '@/hooks/usePrintLayout'
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
      {isEditView ? (
        <>
          <div className="flex flex-1 overflow-hidden">
            {/* Desktop: Left panel - Object list */}
            {!isMobile && (
              <div
                className={cn(
                  'border-r border-border bg-background transition-all duration-200 motion-reduce:transition-none',
                  leftPanelOpen ? 'w-60' : 'w-0',
                )}
              >
                {leftPanelOpen && <ObjectListPanel />}
              </div>
            )}

            {/* Center - 3D Viewport */}
            <div className="flex-1">
              <ViewportErrorBoundary key={activeView}>
                <Viewport />
              </ViewportErrorBoundary>
            </div>

            {/* Desktop: Right panel - Properties */}
            {!isMobile && (
              <div
                className={cn(
                  'border-l border-border bg-background transition-all duration-200 motion-reduce:transition-none',
                  rightPanelOpen ? 'w-72' : 'w-0',
                )}
              >
                {rightPanelOpen && <PropertiesPanel />}
              </div>
            )}
          </div>

          {/* Mobile: Left panel as sheet overlay */}
          {isMobile && (
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
                  <SheetTitle>Properties</SheetTitle>
                </SheetHeader>
                <PropertiesPanel />
              </SheetContent>
            </Sheet>
          )}
        </>
      ) : (
        <PrintLayoutProvider>
          <div className="flex flex-1 overflow-hidden">
            {/* Center - Print Layout Viewport */}
            <div className="flex-1">
              <ViewportErrorBoundary key={activeView}>
                <PrintLayoutViewport />
              </ViewportErrorBoundary>
            </div>

            {/* Desktop: Right panel - Print Settings */}
            {!isMobile && (
              <div
                className={cn(
                  'border-l border-border bg-background transition-all duration-200 motion-reduce:transition-none',
                  rightPanelOpen ? 'w-72' : 'w-0',
                )}
              >
                {rightPanelOpen && <PrintSettingsPanel />}
              </div>
            )}
          </div>

          {/* Mobile: Right panel as sheet overlay */}
          {isMobile && (
            <Sheet
              open={rightPanelOpen}
              onOpenChange={(open) => {
                setRightPanelOpen(open)
              }}
            >
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Print Settings</SheetTitle>
                </SheetHeader>
                <PrintSettingsPanel />
              </SheetContent>
            </Sheet>
          )}
        </PrintLayoutProvider>
      )}
    </div>
  )
}
