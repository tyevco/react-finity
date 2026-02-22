import { useState } from 'react'
import {
  Plus,
  PanelLeft,
  PanelRight,
  Grid3x3,
  Download,
  Pencil,
  Printer,
  FolderOpen,
  Save,
  FilePlus,
  FolderCog,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CameraPresets } from './CameraPresets'
import { ViewportSettings } from './ViewportSettings'
import { ProjectDialog } from './ProjectDialog'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { useProjectManagerStore } from '@/store/projectManagerStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'
import { mergeObjectWithModifiers } from '@/engine/export/mergeObjectGeometry'
import { getPrintRotation, applyPrintOrientation } from '@/engine/export/printOrientation'
import { exportObjectAsSTL } from '@/engine/export/stlExporter'
import { exportObjectAs3MF } from '@/engine/export/threeMfExporter'
import type { ViewportBackground, LightingPreset, CameraPreset } from '@/types/gridfinity'

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
  const setCameraPreset = useUIStore((s) => s.setCameraPreset)
  const viewportBackground = useUIStore((s) => s.viewportBackground)
  const setViewportBackground = useUIStore((s) => s.setViewportBackground)
  const lightingPreset = useUIStore((s) => s.lightingPreset)
  const setLightingPreset = useUIStore((s) => s.setLightingPreset)
  const activeProfile = useProfileStore((s) => s.activeProfile)

  const currentProjectName = useProjectManagerStore((s) => s.currentProjectName)
  const isDirty = useProjectManagerStore((s) => s.isDirty)
  const newProject = useProjectManagerStore((s) => s.newProject)
  const saveProject = useProjectManagerStore((s) => s.saveProject)
  const saveProjectAs = useProjectManagerStore((s) => s.saveProjectAs)

  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [saveAsPrompt, setSaveAsPrompt] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')

  const isMobile = useIsMobile()

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

  const handleExportSelected3MF = () => {
    if (!selectedObjectId) return
    const obj = objects.find((o) => o.id === selectedObjectId)
    if (!obj) return

    const merged = mergeObjectWithModifiers(obj, modifiers, activeProfile)
    const rotation = getPrintRotation(obj)
    const oriented = applyPrintOrientation(merged, rotation)
    void exportObjectAs3MF(oriented, obj.name, exportScale)
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
      <div
        className="flex h-12 items-center gap-2 border-b border-border bg-background px-3 md:h-10"
        data-testid="toolbar"
      >
        {/* Left panel toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLeftPanel}
          className="h-9 w-9 md:h-7 md:w-7"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {!isMobile && <div className="h-5 w-px bg-border" />}

        {/* Project dropdown - desktop only */}
        {!isMobile && (
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
              <DropdownMenuItem
                onClick={() => {
                  setProjectDialogOpen(true)
                }}
              >
                <FolderCog className="mr-2 h-4 w-4" />
                Manage Projects...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isMobile && <div className="h-5 w-px bg-border" />}

        {/* View mode toggle */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 gap-1 px-2 text-xs md:h-6',
                    isEditView && 'bg-accent text-accent-foreground',
                  )}
                  onClick={() => {
                    setActiveView('edit')
                  }}
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
                    'h-8 gap-1 px-2 text-xs md:h-6',
                    !isEditView && 'bg-accent text-accent-foreground',
                  )}
                  onClick={() => {
                    setActiveView('printLayout')
                  }}
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

        {!isMobile && <div className="h-5 w-px bg-border" />}

        {/* Edit view controls - desktop */}
        {!isMobile && isEditView && (
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

        {/* Add object dropdown - mobile */}
        {isMobile && isEditView && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleAddBaseplate}>Baseplate</DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddBin}>Bin</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Project name - desktop only */}
        <span
          className="hidden text-xs font-medium text-muted-foreground md:inline"
          data-testid="project-name"
        >
          {currentProjectName}
          {isDirty ? ' *' : ''}
        </span>

        {/* Spacer - desktop only */}
        <div className="hidden flex-1 md:block" />

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-1 md:h-7">
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleExportSelected}
              disabled={!selectedObjectId || !isEditView}
            >
              Export Selected (STL)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportSelected3MF}
              disabled={!selectedObjectId || !isEditView}
            >
              Export Selected (3MF)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setActiveView('printLayout')
              }}
              disabled={!isEditView}
            >
              Open Print Layout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Viewport settings - desktop only */}
        {!isMobile && isEditView && (
          <>
            <div className="h-5 w-px bg-border" />
            <ViewportSettings />
          </>
        )}

        {/* Overflow menu - mobile only */}
        {isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isEditView && (
                <>
                  <DropdownMenuLabel>Camera</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => {
                      setCameraPreset('top' as CameraPreset)
                    }}
                  >
                    Top View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCameraPreset('front' as CameraPreset)
                    }}
                  >
                    Front View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCameraPreset('side' as CameraPreset)
                    }}
                  >
                    Side View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCameraPreset('isometric' as CameraPreset)
                    }}
                  >
                    Isometric View
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleSnapToGrid}>
                    {snapToGrid ? 'Disable' : 'Enable'} Snap to Grid
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Background</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={viewportBackground}
                        onValueChange={(v) => {
                          setViewportBackground(v as ViewportBackground)
                        }}
                      >
                        <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="neutral">Neutral</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Lighting</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={lightingPreset}
                        onValueChange={(v) => {
                          setLightingPreset(v as LightingPreset)
                        }}
                      >
                        <DropdownMenuRadioItem value="studio">Studio</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="outdoor">Outdoor</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="soft">Soft</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel>Project</DropdownMenuLabel>
              <DropdownMenuItem onClick={newProject}>New Project</DropdownMenuItem>
              <DropdownMenuItem onClick={saveProject}>Save Project</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveAs}>Save As...</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setProjectDialogOpen(true)
                }}
              >
                Manage Projects...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isMobile && <div className="h-5 w-px bg-border" />}

        {/* Right panel toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRightPanel}
          className="h-9 w-9 md:h-7 md:w-7"
        >
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
              onChange={(e) => {
                setSaveAsName(e.target.value)
              }}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSaveAsPrompt(false)
                }}
              >
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
