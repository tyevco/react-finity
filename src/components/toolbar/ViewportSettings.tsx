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
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useUIStore } from '@/store/uiStore'
import type { ViewportBackground, LightingPreset } from '@/types/gridfinity'

export function ViewportSettings() {
  const viewportBackground = useUIStore((s) => s.viewportBackground)
  const lightingPreset = useUIStore((s) => s.lightingPreset)
  const setViewportBackground = useUIStore((s) => s.setViewportBackground)
  const setLightingPreset = useUIStore((s) => s.setLightingPreset)
  const showWireframe = useUIStore((s) => s.showWireframe)
  const toggleWireframe = useUIStore((s) => s.toggleWireframe)
  const transparencyMode = useUIStore((s) => s.transparencyMode)
  const toggleTransparencyMode = useUIStore((s) => s.toggleTransparencyMode)
  const sectionView = useUIStore((s) => s.sectionView)
  const toggleSectionView = useUIStore((s) => s.toggleSectionView)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:h-7 md:w-7"
          aria-label="Viewport settings"
        >
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
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Display</DropdownMenuLabel>
        <DropdownMenuItem onClick={toggleWireframe} data-testid="toggle-wireframe">
          {showWireframe ? 'Disable' : 'Enable'} Wireframe
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleTransparencyMode} data-testid="toggle-transparency">
          {transparencyMode ? 'Disable' : 'Enable'} Transparency
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleSectionView} data-testid="toggle-section">
          {sectionView ? 'Disable' : 'Enable'} Section View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
