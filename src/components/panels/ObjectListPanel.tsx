import { Grid3x3, Trash2, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import type { GridfinityObjectKind } from '@/types/gridfinity'

const kindIcons: Record<GridfinityObjectKind, typeof Grid3x3> = {
  baseplate: Grid3x3,
  bin: Box,
  lid: Box,
}

export function ObjectListPanel() {
  const objects = useProjectStore((s) => s.objects)
  const removeObject = useProjectStore((s) => s.removeObject)
  const selectedObjectId = useUIStore((s) => s.selectedObjectId)
  const selectObject = useUIStore((s) => s.selectObject)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Objects
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {objects.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No objects yet. Use "Add Object" to get started.
            </div>
          ) : (
            objects.map((obj) => {
              const Icon = kindIcons[obj.kind]
              const isSelected = selectedObjectId === obj.id
              return (
                <div
                  key={obj.id}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                    isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                  )}
                  onClick={() => selectObject(obj.id)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{obj.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (selectedObjectId === obj.id) {
                        selectObject(null)
                      }
                      removeObject(obj.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
