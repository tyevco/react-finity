import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { InsertModifier } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'

interface InsertControlsProps {
  modifier: InsertModifier
}

export function InsertControls({ modifier }: InsertControlsProps) {
  const updateModifierParams = useProjectStore((s) => s.updateModifierParams)

  return (
    <div className="space-y-3">
      {/* Compartments X */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Compartments (Width)</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {modifier.params.compartmentsX}
          </span>
        </div>
        <Slider
          value={[modifier.params.compartmentsX]}
          onValueChange={([v]) => {
            updateModifierParams(modifier.id, { compartmentsX: v })
          }}
          min={1}
          max={10}
          step={1}
        />
      </div>

      {/* Compartments Y */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Compartments (Depth)</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {modifier.params.compartmentsY}
          </span>
        </div>
        <Slider
          value={[modifier.params.compartmentsY]}
          onValueChange={([v]) => {
            updateModifierParams(modifier.id, { compartmentsY: v })
          }}
          min={1}
          max={10}
          step={1}
        />
      </div>

      {/* Wall Thickness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Wall Thickness</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {modifier.params.wallThickness.toFixed(1)}mm
          </span>
        </div>
        <Slider
          value={[modifier.params.wallThickness]}
          onValueChange={([v]) => {
            updateModifierParams(modifier.id, { wallThickness: Math.round(v * 10) / 10 })
          }}
          min={0.4}
          max={3.0}
          step={0.1}
        />
      </div>
    </div>
  )
}
