import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ScoopModifier, WallFace } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'

interface ScoopControlsProps {
  modifier: ScoopModifier
}

export function ScoopControls({ modifier }: ScoopControlsProps) {
  const updateModifierParams = useProjectStore((s) => s.updateModifierParams)

  return (
    <div className="space-y-3">
      {/* Wall selector */}
      <div className="space-y-1.5">
        <Label htmlFor="mod-scoop-wall" className="text-xs">
          Wall
        </Label>
        <Select
          value={modifier.params.wall}
          onValueChange={(v) => {
            updateModifierParams(modifier.id, { wall: v as WallFace })
          }}
        >
          <SelectTrigger id="mod-scoop-wall" className="h-8 text-xs">
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

      {/* Radius */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="mod-scoop-radius" className="text-xs">
            Radius
          </Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {modifier.params.radius === 0 ? 'Auto' : `${modifier.params.radius}mm`}
          </span>
        </div>
        <Slider
          id="mod-scoop-radius"
          value={[modifier.params.radius]}
          onValueChange={([v]) => {
            updateModifierParams(modifier.id, { radius: v })
          }}
          min={0}
          max={20}
          step={1}
        />
      </div>
    </div>
  )
}
