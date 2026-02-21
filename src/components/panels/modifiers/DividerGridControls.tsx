import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { DividerGridModifier } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'

interface DividerGridControlsProps {
  modifier: DividerGridModifier
}

export function DividerGridControls({ modifier }: DividerGridControlsProps) {
  const updateModifierParams = useProjectStore((s) => s.updateModifierParams)

  return (
    <div className="space-y-3">
      {/* Dividers X */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Dividers (Width)</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {modifier.params.dividersX}
          </span>
        </div>
        <Slider
          value={[modifier.params.dividersX]}
          onValueChange={([v]) => {
            updateModifierParams(modifier.id, { dividersX: v })
          }}
          min={0}
          max={9}
          step={1}
        />
      </div>

      {/* Dividers Y */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Dividers (Depth)</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {modifier.params.dividersY}
          </span>
        </div>
        <Slider
          value={[modifier.params.dividersY]}
          onValueChange={([v]) => {
            updateModifierParams(modifier.id, { dividersY: v })
          }}
          min={0}
          max={9}
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
