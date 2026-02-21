import { Plus, PanelLeft, PanelRight, Grid3x3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CameraPresets } from './CameraPresets'
import { ViewportSettings } from './ViewportSettings'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

export function Toolbar() {
  const addObject = useProjectStore((s) => s.addObject)
  const selectObject = useUIStore((s) => s.selectObject)
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel)
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel)
  const snapToGrid = useUIStore((s) => s.snapToGrid)
  const toggleSnapToGrid = useUIStore((s) => s.toggleSnapToGrid)

  const handleAddBaseplate = () => {
    const id = addObject('baseplate')
    selectObject(id)
  }

  const handleAddBin = () => {
    const id = addObject('bin')
    selectObject(id)
  }

  return (
    <div className="flex h-10 items-center gap-2 border-b border-border bg-background px-3">
      {/* Left panel toggle */}
      <Button variant="ghost" size="icon" onClick={toggleLeftPanel} className="h-7 w-7">
        <PanelLeft className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-border" />

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

      {/* Spacer */}
      <div className="flex-1" />

      {/* App title */}
      <span className="text-xs font-medium text-muted-foreground">React-Finity</span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Viewport settings */}
      <ViewportSettings />

      <div className="h-5 w-px bg-border" />

      {/* Right panel toggle */}
      <Button variant="ghost" size="icon" onClick={toggleRightPanel} className="h-7 w-7">
        <PanelRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
