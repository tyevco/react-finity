import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUIStore } from '@/store/uiStore'
import type { ViewportBackground, LightingPreset } from '@/types/gridfinity'

export function ViewportSettings() {
  const viewportBackground = useUIStore((s) => s.viewportBackground)
  const lightingPreset = useUIStore((s) => s.lightingPreset)
  const setViewportBackground = useUIStore((s) => s.setViewportBackground)
  const setLightingPreset = useUIStore((s) => s.setLightingPreset)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Viewport settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Background</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={viewportBackground}
          onValueChange={(v) => {
            setViewportBackground(v as ViewportBackground)
          }}
        >
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="neutral">Neutral</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Lighting</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={lightingPreset}
          onValueChange={(v) => {
            setLightingPreset(v as LightingPreset)
          }}
        >
          <DropdownMenuRadioItem value="studio">Studio</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="outdoor">Outdoor</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="soft">Soft</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
