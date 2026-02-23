import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ProfileSelector } from './ProfileSelector'
import type { BaseplateObject } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { getBaseplateDimensions } from '@/engine/geometry/baseplate'

interface BaseplatePropertiesProps {
  object: BaseplateObject
}

export function BaseplateProperties({ object }: BaseplatePropertiesProps) {
  const updateObjectParams = useProjectStore((s) => s.updateObjectParams)
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const dims = getBaseplateDimensions(object.params, activeProfile)

  return (
    <div className="space-y-4">
      <ProfileSelector />

      <Separator />

      {/* Grid Width */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Grid Width</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {object.params.gridWidth}u ({dims.width}mm)
          </span>
        </div>
        <Slider
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
          <Label className="text-xs">Grid Depth</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {object.params.gridDepth}u ({dims.depth}mm)
          </span>
        </div>
        <Slider
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

      {/* Slim */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Slim</Label>
        <Switch
          checked={object.params.slim}
          onCheckedChange={(checked) => {
            updateObjectParams(object.id, { slim: checked })
          }}
        />
      </div>

      {/* Magnet Holes */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Magnet Holes</Label>
        <Switch
          checked={object.params.magnetHoles}
          onCheckedChange={(checked) => {
            updateObjectParams(object.id, { magnetHoles: checked })
          }}
        />
      </div>

      {/* Screw Holes */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Screw Holes</Label>
        <Switch
          checked={object.params.screwHoles}
          onCheckedChange={(checked) => {
            updateObjectParams(object.id, { screwHoles: checked })
          }}
        />
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
