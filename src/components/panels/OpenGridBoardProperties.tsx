import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OpenGridBoardObject } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'
import { getOpenGridBoardDimensions } from '@/engine/geometry/opengridBoard'
import { useProfileStore } from '@/store/profileStore'
import { OPENGRID_GRID_SIZE } from '@/engine/constants'

interface OpenGridBoardPropertiesProps {
  object: OpenGridBoardObject
}

export function OpenGridBoardProperties({ object }: OpenGridBoardPropertiesProps) {
  const updateObjectParams = useProjectStore((s) => s.updateObjectParams)
  const updateObjectRotation = useProjectStore((s) => s.updateObjectRotation)
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const dims = getOpenGridBoardDimensions(object.params, activeProfile)

  const handleOrientationChange = (value: string) => {
    const orientation = value as 'flat' | 'wall'
    updateObjectParams(object.id, { orientation })
    if (orientation === 'wall') {
      updateObjectRotation(object.id, [-Math.PI / 2, 0, 0])
    } else {
      updateObjectRotation(object.id, [0, 0, 0])
    }
  }

  return (
    <div className="space-y-4">
      {/* Grid Width */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="og-grid-width" className="text-xs">
            Grid Width
          </Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {object.params.gridWidth}u ({object.params.gridWidth * OPENGRID_GRID_SIZE}mm)
          </span>
        </div>
        <Slider
          id="og-grid-width"
          value={[object.params.gridWidth]}
          onValueChange={([v]) => {
            updateObjectParams(object.id, { gridWidth: v })
          }}
          min={1}
          max={10}
          step={1}
        />
      </div>

      {/* Grid Depth */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="og-grid-depth" className="text-xs">
            Grid Depth
          </Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {object.params.gridDepth}u ({object.params.gridDepth * OPENGRID_GRID_SIZE}mm)
          </span>
        </div>
        <Slider
          id="og-grid-depth"
          value={[object.params.gridDepth]}
          onValueChange={([v]) => {
            updateObjectParams(object.id, { gridDepth: v })
          }}
          min={1}
          max={10}
          step={1}
        />
      </div>

      <Separator />

      {/* Variant */}
      <div className="space-y-1.5">
        <Label htmlFor="og-variant" className="text-xs">
          Variant
        </Label>
        <Select
          value={object.params.variant}
          onValueChange={(v) => {
            updateObjectParams(object.id, { variant: v })
          }}
        >
          <SelectTrigger id="og-variant" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full" className="text-xs">
              Full (6.8mm)
            </SelectItem>
            <SelectItem value="lite" className="text-xs">
              Lite (4.0mm)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orientation */}
      <div className="space-y-1.5">
        <Label htmlFor="og-orientation" className="text-xs">
          Orientation
        </Label>
        <Select value={object.params.orientation} onValueChange={handleOrientationChange}>
          <SelectTrigger id="og-orientation" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flat" className="text-xs">
              Flat
            </SelectItem>
            <SelectItem value="wall" className="text-xs">
              Wall
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Dimensions readout */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Dimensions</Label>
        <div
          className="rounded-md bg-muted px-3 py-2 text-xs tabular-nums"
          data-testid="dimensions-readout"
        >
          {dims.width} x {dims.depth} x {dims.height} mm
        </div>
      </div>
    </div>
  )
}
