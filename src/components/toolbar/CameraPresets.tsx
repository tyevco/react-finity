import { ArrowUp, Square, PanelRight, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useUIStore } from '@/store/uiStore'
import type { CameraPreset } from '@/types/gridfinity'

const presets: { preset: CameraPreset; label: string; Icon: typeof ArrowUp }[] = [
  { preset: 'top', label: 'Top View', Icon: ArrowUp },
  { preset: 'front', label: 'Front View', Icon: Square },
  { preset: 'side', label: 'Side View', Icon: PanelRight },
  { preset: 'isometric', label: 'Isometric View', Icon: Box },
]

export function CameraPresets() {
  const setCameraPreset = useUIStore((s) => s.setCameraPreset)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5">
        {presets.map(({ preset, label, Icon }) => (
          <Tooltip key={preset}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setCameraPreset(preset)
                }}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
