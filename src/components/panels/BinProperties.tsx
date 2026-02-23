import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ProfileSelector } from './ProfileSelector'
import { ModifierSection } from './ModifierSection'
import type { BinObject } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { getBinDimensions } from '@/engine/geometry/bin'

interface BinPropertiesProps {
  object: BinObject
}

export function BinProperties({ object }: BinPropertiesProps) {
  const updateObjectParams = useProjectStore((s) => s.updateObjectParams)
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const dims = getBinDimensions(object.params, activeProfile)

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

      {/* Height Units */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Height</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {object.params.heightUnits}u ({dims.height}mm)
          </span>
        </div>
        <Slider
          value={[object.params.heightUnits]}
          onValueChange={([v]) => {
            updateObjectParams(object.id, { heightUnits: v })
          }}
          min={1}
          max={10}
          step={1}
        />
      </div>

      <Separator />

      {/* Stacking Lip */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Stacking Lip</Label>
        <Switch
          checked={object.params.stackingLip}
          onCheckedChange={(checked) => {
            updateObjectParams(object.id, { stackingLip: checked })
          }}
        />
      </div>

      {/* Wall Thickness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Wall Thickness</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {object.params.wallThickness.toFixed(1)}mm
          </span>
        </div>
        <Slider
          value={[object.params.wallThickness]}
          onValueChange={([v]) => {
            updateObjectParams(object.id, { wallThickness: Math.round(v * 10) / 10 })
          }}
          min={0.4}
          max={3.0}
          step={0.1}
        />
      </div>

      {/* Inner Fillet */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Inner Fillet</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {object.params.innerFillet === 0 ? 'None' : `${object.params.innerFillet.toFixed(1)}mm`}
          </span>
        </div>
        <Slider
          value={[object.params.innerFillet]}
          onValueChange={([v]) => {
            updateObjectParams(object.id, { innerFillet: Math.round(v * 10) / 10 })
          }}
          min={0}
          max={3.0}
          step={0.5}
        />
      </div>

      <Separator />

      {/* Base Options */}
      <Label className="text-xs text-muted-foreground">Base Options</Label>

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

      {/* Weight Holes */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Weight Holes</Label>
        <Switch
          checked={object.params.weightHoles}
          onCheckedChange={(checked) => {
            updateObjectParams(object.id, { weightHoles: checked })
          }}
        />
      </div>

      {/* Honeycomb Base */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Honeycomb Base</Label>
        <Switch
          checked={object.params.honeycombBase}
          onCheckedChange={(checked) => {
            updateObjectParams(object.id, { honeycombBase: checked })
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

      {/* Modifiers */}
      <ModifierSection parentId={object.id} />
    </div>
  )
}
