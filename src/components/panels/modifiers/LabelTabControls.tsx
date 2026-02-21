import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LabelTabModifier, WallFace } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'

interface LabelTabControlsProps {
  modifier: LabelTabModifier
}

export function LabelTabControls({ modifier }: LabelTabControlsProps) {
  const updateModifierParams = useProjectStore((s) => s.updateModifierParams)

  return (
    <div className="space-y-3">
      {/* Wall selector */}
      <div className="space-y-1.5">
        <Label className="text-xs">Wall</Label>
        <Select
          value={modifier.params.wall}
          onValueChange={(v) => {
            updateModifierParams(modifier.id, { wall: v as WallFace })
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="front" className="text-xs">
              Front
            </SelectItem>
            <SelectItem value="back" className="text-xs">
              Back
            </SelectItem>
            <SelectItem value="left" className="text-xs">
              Left
            </SelectItem>
            <SelectItem value="right" className="text-xs">
              Right
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Angle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Angle</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {modifier.params.angle}deg
          </span>
        </div>
        <Slider
          value={[modifier.params.angle]}
          onValueChange={([v]) => {
            updateModifierParams(modifier.id, { angle: v })
          }}
          min={30}
          max={60}
          step={5}
        />
      </div>

      {/* Height */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Height</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {modifier.params.height}mm
          </span>
        </div>
        <Slider
          value={[modifier.params.height]}
          onValueChange={([v]) => {
            updateModifierParams(modifier.id, { height: v })
          }}
          min={5}
          max={14}
          step={1}
        />
      </div>
    </div>
  )
}
