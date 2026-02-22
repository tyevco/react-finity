import { Plus, PanelLeft, PanelRight, Grid3x3, Download, Pencil, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CameraPresets } from './CameraPresets'
import { ViewportSettings } from './ViewportSettings'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { mergeObjectWithModifiers } from '@/engine/export/mergeObjectGeometry'
import { getPrintRotation, applyPrintOrientation } from '@/engine/export/printOrientation'
import { exportObjectAsSTL } from '@/engine/export/stlExporter'

export function Toolbar() {
  const addObject = useProjectStore((s) => s.addObject)
  const objects = useProjectStore((s) => s.objects)
  const modifiers = useProjectStore((s) => s.modifiers)
  const selectObject = useUIStore((s) => s.selectObject)
  const selectedObjectId = useUIStore((s) => s.selectedObjectId)
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel)
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel)
  const snapToGrid = useUIStore((s) => s.snapToGrid)
  const toggleSnapToGrid = useUIStore((s) => s.toggleSnapToGrid)
  const activeView = useUIStore((s) => s.activeView)
  const setActiveView = useUIStore((s) => s.setActiveView)
  const activeProfile = useProfileStore((s) => s.activeProfile)

  const handleAddBaseplate = () => {
    const id = addObject('baseplate')
    selectObject(id)
  }

  const handleAddBin = () => {
    const id = addObject('bin')
    selectObject(id)
  }

  const handleExportSelected = () => {
    if (!selectedObjectId) return
    const obj = objects.find((o) => o.id === selectedObjectId)
    if (!obj) return

    const merged = mergeObjectWithModifiers(obj, modifiers, activeProfile)
    const rotation = getPrintRotation(obj)
    const oriented = applyPrintOrientation(merged, rotation)
    exportObjectAsSTL(oriented, obj.name)
    merged.dispose()
    oriented.dispose()
  }

  const isEditView = activeView === 'edit'

  return (
    <div className="flex h-10 items-center gap-2 border-b border-border bg-background px-3">
      {/* Left panel toggle */}
      <Button variant="ghost" size="icon" onClick={toggleLeftPanel} className="h-7 w-7">
        <PanelLeft className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-border" />

      {/* View mode toggle */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 gap-1 px-2 text-xs',
                  isEditView && 'bg-accent text-accent-foreground',
                )}
                onClick={() => { setActiveView('edit') }}
                aria-label="Edit view"
                aria-pressed={isEditView}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 gap-1 px-2 text-xs',
                  !isEditView && 'bg-accent text-accent-foreground',
                )}
                onClick={() => { setActiveView('printLayout') }}
                aria-label="Print layout view"
                aria-pressed={!isEditView}
              >
                <Printer className="h-3 w-3" />
                Print
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print layout view</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <div className="h-5 w-px bg-border" />

      {/* Edit view controls */}
      {isEditView && (
        <>
          {/* Add object dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1">
                <Plus className="h-4 w-4" />
                Add Object
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleAddBaseplate}>Baseplate</DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddBin}>Bin</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-border" />

          {/* Camera presets */}
          <CameraPresets />

          <div className="h-5 w-px bg-border" />

          {/* Snap to grid toggle */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-7 w-7', snapToGrid && 'bg-accent text-accent-foreground')}
                  onClick={toggleSnapToGrid}
                  aria-label="Snap to grid"
                  aria-pressed={snapToGrid}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Snap to grid</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* App title */}
      <span className="text-xs font-medium text-muted-foreground">React-Finity</span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleExportSelected}
            disabled={!selectedObjectId || !isEditView}
          >
            Export Selected (STL)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { setActiveView('printLayout') }}
            disabled={!isEditView}
          >
            Open Print Layout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Viewport settings (edit view only) */}
      {isEditView && (
        <>
          <div className="h-5 w-px bg-border" />
          <ViewportSettings />
        </>
      )}

      <div className="h-5 w-px bg-border" />

      {/* Right panel toggle */}
      <Button variant="ghost" size="icon" onClick={toggleRightPanel} className="h-7 w-7">
        <PanelRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
