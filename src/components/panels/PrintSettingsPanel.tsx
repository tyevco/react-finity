import { useMemo } from 'react'
import { Download, Check, AlertTriangle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { PRINT_BED_PRESETS } from '@/engine/constants'
import { computePrintLayout, disposePrintLayout } from '@/engine/export/printLayout'
import { mergeObjectWithModifiers } from '@/engine/export/mergeObjectGeometry'
import { getPrintRotation, applyPrintOrientation } from '@/engine/export/printOrientation'
import {
  exportObjectAsSTL,
  exportAllAsZip,
  exportAllAsSingleSTL,
} from '@/engine/export/stlExporter'
import type { CurveQuality } from '@/types/gridfinity'

export function PrintSettingsPanel() {
  const objects = useProjectStore((s) => s.objects)
  const modifiers = useProjectStore((s) => s.modifiers)
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const printBedPreset = useUIStore((s) => s.printBedPreset)
  const printBedSpacing = useUIStore((s) => s.printBedSpacing)
  const setPrintBedPreset = useUIStore((s) => s.setPrintBedPreset)
  const setPrintBedSpacing = useUIStore((s) => s.setPrintBedSpacing)
  const exportScale = useUIStore((s) => s.exportScale)
  const setExportScale = useUIStore((s) => s.setExportScale)
  const curveQuality = useUIStore((s) => s.curveQuality)
  const setCurveQuality = useUIStore((s) => s.setCurveQuality)

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
  }, [objects, modifiers, activeProfile, bed.width, bed.depth, printBedSpacing])

  // Dispose on recompute
  useMemo(() => {
    return () => {
      disposePrintLayout(layoutItems)
    }
  }, [layoutItems])

  const allFit = layoutItems.every((item) => item.fitsOnBed)

  const handleExportAll = () => {
    if (layoutItems.length === 0) return
    void exportAllAsZip(layoutItems, exportScale)
  }

  const handleExportSingleSTL = () => {
    if (layoutItems.length === 0) return
    exportAllAsSingleSTL(layoutItems, exportScale)
  }

  const handleExportOne = (objectId: string) => {
    const obj = objects.find((o) => o.id === objectId)
    if (!obj) return
    const merged = mergeObjectWithModifiers(obj, modifiers, activeProfile)
    const rotation = getPrintRotation(obj)
    const oriented = applyPrintOrientation(merged, rotation)
    exportObjectAsSTL(oriented, obj.name, exportScale)
    merged.dispose()
    oriented.dispose()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Print Settings
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* Bed Size */}
          <div className="space-y-2">
            <Label className="text-xs">Bed Size</Label>
            <Select value={printBedPreset} onValueChange={setPrintBedPreset}>
              <SelectTrigger className="h-8 text-xs" aria-label="Bed size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRINT_BED_PRESETS).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Spacing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Object Spacing</Label>
              <span className="text-xs text-muted-foreground">{printBedSpacing} mm</span>
            </div>
            <Slider
              min={5}
              max={30}
              step={1}
              value={[printBedSpacing]}
              onValueChange={([v]) => {
                setPrintBedSpacing(v)
              }}
              aria-label="Object spacing"
            />
          </div>

          <Separator />

          {/* Export Settings */}
          <div className="space-y-2">
            <Label className="text-xs">Export Scale</Label>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {Math.round(exportScale * 100)}%
              </span>
            </div>
            <Slider
              min={0.1}
              max={10}
              step={0.1}
              value={[exportScale]}
              onValueChange={([v]) => {
                setExportScale(Math.round(v * 10) / 10)
              }}
              aria-label="Export scale"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Polygon Quality</Label>
            <Select
              value={curveQuality}
              onValueChange={(v) => {
                setCurveQuality(v as CurveQuality)
              }}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Polygon quality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Object List */}
          <div className="space-y-2">
            <Label className="text-xs">Objects ({layoutItems.length})</Label>
            {layoutItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No objects to export. Add objects in Edit view.
              </div>
            ) : (
              <div className="space-y-1">
                {layoutItems.map((item) => (
                  <div
                    key={item.object.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
                  >
                    {item.fitsOnBed ? (
                      <Check className="h-3 w-3 shrink-0 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-yellow-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{item.object.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.boundingBox.width.toFixed(1)} x {item.boundingBox.depth.toFixed(1)} x{' '}
                        {item.boundingBox.height.toFixed(1)} mm
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 md:h-6 md:w-6"
                      onClick={() => {
                        handleExportOne(item.object.id)
                      }}
                      aria-label={`Export ${item.object.name}`}
                    >
                      <Download className="h-4 w-4 md:h-3 md:w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!allFit && layoutItems.length > 0 && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-[10px] text-yellow-400">
              Some objects extend beyond the print bed boundary.
            </div>
          )}

          <Separator />

          {/* Export Buttons */}
          <div className="space-y-2">
            <Button
              className="w-full gap-2"
              size="sm"
              onClick={handleExportAll}
              disabled={layoutItems.length === 0}
            >
              <Download className="h-4 w-4" />
              Export All (ZIP)
            </Button>
            <Button
              className="w-full gap-2"
              variant="outline"
              size="sm"
              onClick={handleExportSingleSTL}
              disabled={layoutItems.length === 0}
            >
              <Download className="h-4 w-4" />
              Export Plate (Single STL)
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
