import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { LidModifier } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'

interface LidControlsProps {
  modifier: LidModifier
}

export function LidControls({ modifier }: LidControlsProps) {
  const updateModifierParams = useProjectStore((s) => s.updateModifierParams)

  return (
    <div className="space-y-3">
      {/* Stacking toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Stacking</Label>
        <Switch
          checked={modifier.params.stacking}
          onCheckedChange={(checked) => {
            updateModifierParams(modifier.id, { stacking: checked })
          }}
        />
      </div>
    </div>
  )
}
