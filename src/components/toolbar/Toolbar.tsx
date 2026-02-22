import { useState } from 'react'
import {
  Plus, PanelLeft, PanelRight, Grid3x3, Download, Pencil, Printer,
  FolderOpen, Save, FilePlus, FolderCog,
} from 'lucide-react'
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
import { ProjectDialog } from './ProjectDialog'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { useProjectManagerStore } from '@/store/projectManagerStore'
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
  const exportScale = useUIStore((s) => s.exportScale)
  const activeProfile = useProfileStore((s) => s.activeProfile)

  const currentProjectName = useProjectManagerStore((s) => s.currentProjectName)
  const isDirty = useProjectManagerStore((s) => s.isDirty)
  const newProject = useProjectManagerStore((s) => s.newProject)
  const saveProject = useProjectManagerStore((s) => s.saveProject)
  const saveProjectAs = useProjectManagerStore((s) => s.saveProjectAs)

  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [saveAsPrompt, setSaveAsPrompt] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')

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
    exportObjectAsSTL(oriented, obj.name, exportScale)
    merged.dispose()
    oriented.dispose()
  }

  const handleSaveAs = () => {
    setSaveAsName(currentProjectName)
    setSaveAsPrompt(true)
  }

  const handleConfirmSaveAs = () => {
    if (saveAsName.trim()) {
      saveProjectAs(saveAsName.trim())
    }
    setSaveAsPrompt(false)
    setSaveAsName('')
  }

  const isEditView = activeView === 'edit'

  return (
    <>
      <div className="flex h-10 items-center gap-2 border-b border-border bg-background px-3">
        {/* Left panel toggle */}
        <Button variant="ghost" size="icon" onClick={toggleLeftPanel} className="h-7 w-7">
          <PanelLeft className="h-4 w-4" />
        </Button>

        <div className="h-5 w-px bg-border" />

        {/* Project dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1">
              <FolderOpen className="h-4 w-4" />
              Project
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={newProject}>
              <FilePlus className="mr-2 h-4 w-4" />
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={saveProject}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSaveAs}>
              <Save className="mr-2 h-4 w-4" />
              Save As...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setProjectDialogOpen(true) }}>
              <FolderCog className="mr-2 h-4 w-4" />
              Manage Projects...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

        {/* Project name */}
        <span className="text-xs font-medium text-muted-foreground" data-testid="project-name">
          {currentProjectName}{isDirty ? ' *' : ''}
        </span>

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

      {/* Project management dialog */}
      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />

      {/* Save As prompt - simple inline dialog */}
      {saveAsPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="mb-4 text-sm font-semibold">Save Project As</h3>
            <input
              type="text"
              value={saveAsName}
              onChange={(e) => { setSaveAsName(e.target.value) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmSaveAs()
                if (e.key === 'Escape') setSaveAsPrompt(false)
              }}
              className="mb-4 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
              placeholder="Project name"
              aria-label="Project name"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSaveAsPrompt(false) }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmSaveAs} disabled={!saveAsName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
