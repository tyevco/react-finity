import { toast } from 'sonner'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUIStore } from '@/store/uiStore'
import { PRINT_BED_PRESETS } from '@/engine/constants'
import { usePrintLayout } from '@/hooks/usePrintLayout'
import {
  exportObjectAsSTL,
  exportAllAsZip,
  exportAllAsSingleSTL,
} from '@/engine/export/stlExporter'
import { exportObjectAs3MF, exportAllAs3MF } from '@/engine/export/threeMfExporter'
import type { CurveQuality } from '@/types/gridfinity'

export function PrintSettingsPanel() {
  const { layoutItems } = usePrintLayout()
  const printBedPreset = useUIStore((s) => s.printBedPreset)
  const printBedSpacing = useUIStore((s) => s.printBedSpacing)
  const setPrintBedPreset = useUIStore((s) => s.setPrintBedPreset)
  const setPrintBedSpacing = useUIStore((s) => s.setPrintBedSpacing)
  const exportScale = useUIStore((s) => s.exportScale)
  const setExportScale = useUIStore((s) => s.setExportScale)
  const curveQuality = useUIStore((s) => s.curveQuality)
  const setCurveQuality = useUIStore((s) => s.setCurveQuality)

  const allFit = layoutItems.every((item) => item.fitsOnBed)

  const handleExportAll = () => {
    if (layoutItems.length === 0) return
    toast.promise(exportAllAsZip(layoutItems, exportScale), {
      loading: 'Preparing ZIP export...',
      success: 'ZIP export complete',
      error: 'ZIP export failed',
    })
  }

  const handleExportSingleSTL = () => {
    if (layoutItems.length === 0) return
    try {
      exportAllAsSingleSTL(layoutItems, exportScale)
      toast.success('Exported plate as single STL')
    } catch (error) {
      console.error('Failed to export single STL:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleExportOne = (item: (typeof layoutItems)[number]) => {
    const oriented = item.geometry.clone()
    try {
      exportObjectAsSTL(oriented, item.label, exportScale)
      toast.success(`Exported ${item.label}.stl`)
    } catch (error) {
      console.error('Failed to export STL:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      oriented.dispose()
    }
  }

  const handleExportAll3MF = () => {
    if (layoutItems.length === 0) return
    try {
      exportAllAs3MF(layoutItems, exportScale)
      toast.success('Exported all as 3MF')
    } catch (error) {
      console.error('Failed to export 3MF:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleExportOne3MF = (item: (typeof layoutItems)[number]) => {
    const oriented = item.geometry.clone()
    try {
      exportObjectAs3MF(oriented, item.label, exportScale)
      toast.success(`Exported ${item.label}.3mf`)
    } catch (error) {
      console.error('Failed to export 3MF:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      oriented.dispose()
    }
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
                    key={item.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
                  >
                    {item.fitsOnBed ? (
                      <Check className="h-3 w-3 shrink-0 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-yellow-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.boundingBox.width.toFixed(1)} x {item.boundingBox.depth.toFixed(1)} x{' '}
                        {item.boundingBox.height.toFixed(1)} mm
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 md:h-6 md:w-6"
                          aria-label={`Export ${item.label}`}
                        >
                          <Download className="h-4 w-4 md:h-3 md:w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            handleExportOne(item)
                          }}
                        >
                          Export as STL
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            handleExportOne3MF(item)
                          }}
                        >
                          Export as 3MF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            <Button
              className="w-full gap-2"
              variant="outline"
              size="sm"
              onClick={handleExportAll3MF}
              disabled={layoutItems.length === 0}
            >
              <Download className="h-4 w-4" />
              Export All (3MF)
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
