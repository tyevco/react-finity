import { ScrollArea } from '@/components/ui/scroll-area'
import { BaseplateProperties } from './BaseplateProperties'
import { BinProperties } from './BinProperties'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'

export function PropertiesPanel() {
  const objects = useProjectStore((s) => s.objects)
  const selectedObjectId = useUIStore((s) => s.selectedObjectId)

  const selectedObject = selectedObjectId
    ? objects.find((o) => o.id === selectedObjectId)
    : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Properties
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {!selectedObject ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Select an object to view its properties.
            </div>
          ) : (
            <>
              {/* Object name */}
              <div className="mb-4">
                <span className="text-sm font-medium">{selectedObject.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({selectedObject.kind})
                </span>
              </div>

              {/* Kind-specific properties */}
              {selectedObject.kind === 'baseplate' && (
                <BaseplateProperties object={selectedObject} />
              )}

              {selectedObject.kind === 'bin' && (
                <BinProperties object={selectedObject} />
              )}

              {selectedObject.kind === 'lid' && (
                <div className="text-xs text-muted-foreground">
                  Lid properties coming in Phase 4.
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
