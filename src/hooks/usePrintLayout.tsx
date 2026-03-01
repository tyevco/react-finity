import { createContext, useContext, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { PRINT_BED_PRESETS } from '@/engine/constants'
import { computePrintLayout, disposePrintLayout } from '@/engine/export/printLayout'
import type { PrintLayoutItem } from '@/engine/export/printLayout'

export interface PrintLayoutContextValue {
  layoutItems: PrintLayoutItem[]
  bed: { width: number; depth: number; name: string }
}

// eslint-disable-next-line react-refresh/only-export-components
export const PrintLayoutContext = createContext<PrintLayoutContextValue | null>(null)

export function PrintLayoutProvider({ children }: { children: ReactNode }) {
  const objects = useProjectStore((s) => s.objects)
  const modifiers = useProjectStore((s) => s.modifiers)
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const printBedPreset = useUIStore((s) => s.printBedPreset)
  const printBedSpacing = useUIStore((s) => s.printBedSpacing)
  const curveQuality = useUIStore((s) => s.curveQuality)

  const bed = PRINT_BED_PRESETS[printBedPreset] ?? PRINT_BED_PRESETS['256x256']

  const layoutItems = useMemo(() => {
    if (objects.length === 0) return []
    return computePrintLayout(
      objects,
      modifiers,
      activeProfile,
      bed.width,
      bed.depth,
      printBedSpacing,
    )
    // curveQuality affects geometry via module-level getCurveSegments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, modifiers, activeProfile, bed.width, bed.depth, printBedSpacing, curveQuality])

  useEffect(() => {
    return () => {
      disposePrintLayout(layoutItems)
    }
  }, [layoutItems])

  const value = useMemo(() => ({ layoutItems, bed }), [layoutItems, bed])

  return <PrintLayoutContext value={value}>{children}</PrintLayoutContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrintLayout(): PrintLayoutContextValue {
  const ctx = useContext(PrintLayoutContext)
  if (!ctx) throw new Error('usePrintLayout must be used within PrintLayoutProvider')
  return ctx
}
