import { ScrollArea } from '@/components/ui/scroll-area'
import { BaseplateProperties } from './BaseplateProperties'
import { BinProperties } from './BinProperties'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'

export function PropertiesPanel() {
  const objects = useProjectStore((s) => s.objects)
  const selectedObjectIds = useUIStore((s) => s.selectedObjectIds)

  const selectedObjects = selectedObjectIds
    .map((id) => objects.find((o) => o.id === id))
    .filter(Boolean)

  const singleSelected = selectedObjects.length === 1 ? selectedObjects[0] : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Properties
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {selectedObjects.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Select an object to view its properties.
            </div>
          ) : selectedObjects.length > 1 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {selectedObjects.length} objects selected
            </div>
          ) : (
            singleSelected && (
              <>
                {/* Object name */}
                <div className="mb-4">
                  <span className="text-sm font-medium">{singleSelected.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({singleSelected.kind})
                  </span>
                </div>

                {/* Kind-specific properties */}
                {singleSelected.kind === 'baseplate' && (
                  <BaseplateProperties object={singleSelected} />
                )}

                {singleSelected.kind === 'bin' && <BinProperties object={singleSelected} />}
              </>
            )
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
