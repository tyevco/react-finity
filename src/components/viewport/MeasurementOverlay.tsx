import { Html } from '@react-three/drei'
import type { GridfinityObject, GridfinityProfile } from '@/types/gridfinity'
import { useProfileStore } from '@/store/profileStore'
import { getBaseplateDimensions } from '@/engine/geometry/baseplate'
import { getBinDimensions } from '@/engine/geometry/bin'

interface MeasurementOverlayProps {
  object: GridfinityObject
}

function getDimensions(
  object: GridfinityObject,
  profile: GridfinityProfile,
): { width: number; depth: number; height: number } | null {
  switch (object.kind) {
    case 'baseplate':
      return getBaseplateDimensions(object.params, profile)
    case 'bin':
      return getBinDimensions(object.params, profile)
    case 'lid':
      return null
  }
}

export function MeasurementOverlay({ object }: MeasurementOverlayProps) {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const dims = getDimensions(object, activeProfile)

  if (!dims) return null

  const labelY = dims.height + 10

  return (
    <group position={object.position}>
      <Html position={[0, labelY, 0]} center distanceFactor={200} style={{ pointerEvents: 'none' }}>
        <div
          className="rounded bg-black/80 px-2 py-1 text-xs text-white whitespace-nowrap"
          data-testid="measurement-overlay"
        >
          {dims.width} x {dims.depth} x {dims.height} mm
        </div>
      </Html>
    </group>
  )
}
