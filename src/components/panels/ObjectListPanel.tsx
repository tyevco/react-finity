import { useState } from 'react'
import { Trash2, GripVertical, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { objectKindRegistry } from '@/engine/registry/objectKindRegistry'

export function ObjectListPanel() {
  const objects = useProjectStore((s) => s.objects)
  const removeObject = useProjectStore((s) => s.removeObject)
  const reorderObject = useProjectStore((s) => s.reorderObject)
  const selectedObjectIds = useUIStore((s) => s.selectedObjectIds)
  const selectObject = useUIStore((s) => s.selectObject)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation()
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== toIndex) {
      reorderObject(dragIndex, toIndex)
    }
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

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
            objects.map((obj, index) => {
              const Icon = objectKindRegistry.get(obj.kind)?.icon ?? HelpCircle
              const isSelected = selectedObjectIds.includes(obj.id)
              const isDragging = dragIndex === index
              const isDropTarget = dropIndex === index && dragIndex !== index
              return (
                <div
                  key={obj.id}
                  draggable
                  onDragStart={(e) => {
                    handleDragStart(e, index)
                  }}
                  onDragOver={(e) => {
                    handleDragOver(e, index)
                  }}
                  onDrop={(e) => {
                    handleDrop(e, index)
                  }}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group flex cursor-pointer items-center gap-1 rounded-md px-1 py-2.5 text-sm md:py-1.5',
                    isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                    isDragging && 'opacity-40',
                    isDropTarget && 'border-t-2 border-primary',
                  )}
                  onClick={(e) => {
                    selectObject(obj.id, e.shiftKey || e.ctrlKey || e.metaKey)
                  }}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-50" />
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate pl-1">{obj.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-100 md:h-5 md:w-5 md:opacity-0 md:group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isSelected) {
                        selectObject(null)
                      }
                      removeObject(obj.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 md:h-3 md:w-3" />
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
