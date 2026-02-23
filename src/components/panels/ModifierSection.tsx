import { useMemo, useState } from 'react'
import { X, Plus, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Modifier, ModifierKind } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'
import { cn } from '@/lib/utils'
import { modifierKindRegistry } from '@/engine/registry/modifierKindRegistry'
import type { ModifierControlsComponentProps } from '@/engine/registry/types'

interface ModifierSectionProps {
  parentId: string
  depth?: number
}

export function ModifierSection({ parentId, depth = 0 }: ModifierSectionProps) {
  const allModifiers = useProjectStore((s) => s.modifiers)
  const modifiers = useMemo(
    () => allModifiers.filter((m) => m.parentId === parentId),
    [allModifiers, parentId],
  )
  const addModifier = useProjectStore((s) => s.addModifier)
  const removeModifier = useProjectStore((s) => s.removeModifier)
  const reorderModifier = useProjectStore((s) => s.reorderModifier)

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
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragIndex !== null && dragIndex !== toIndex) {
      reorderModifier(parentId, dragIndex, toIndex)
    }
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <div className={depth > 0 ? 'ml-2 border-l border-border pl-2' : ''}>
      <Separator className="my-3" />

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {depth === 0 ? 'Modifiers' : 'Sub-modifiers'}
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-6 md:w-6"
              data-testid="add-modifier-btn"
            >
              <Plus className="h-4 w-4 md:h-3 md:w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {modifierKindRegistry.getAll().map((reg) => (
              <DropdownMenuItem
                key={reg.kind}
                onClick={() => addModifier(parentId, reg.kind as ModifierKind)}
              >
                {reg.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {modifiers.length === 0 && (
        <div className="py-2 text-center text-xs text-muted-foreground">No modifiers added.</div>
      )}

      {modifiers.map((modifier, index) => (
        <ModifierCard
          key={modifier.id}
          modifier={modifier}
          index={index}
          depth={depth}
          isDragging={dragIndex === index}
          isDropTarget={dropIndex === index && dragIndex !== index}
          onRemove={() => {
            removeModifier(modifier.id)
          }}
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
        />
      ))}
    </div>
  )
}

interface ModifierCardProps {
  modifier: Modifier
  index: number
  depth: number
  isDragging: boolean
  isDropTarget: boolean
  onRemove: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function ModifierCard({
  modifier,
  depth,
  isDragging,
  isDropTarget,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ModifierCardProps) {
  const wallLabel = 'wall' in modifier.params ? ` (${modifier.params.wall})` : ''

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'mt-2 rounded-md border border-border p-2',
        isDragging && 'opacity-40',
        isDropTarget && 'border-t-2 border-t-primary',
      )}
      data-testid={`modifier-${modifier.kind}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground opacity-50" />
          <span className="text-xs font-medium">
            {modifierKindRegistry.get(modifier.kind)?.label ?? modifier.kind}
            {wallLabel}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:h-5 md:w-5"
          onClick={onRemove}
          data-testid="remove-modifier-btn"
        >
          <X className="h-4 w-4 md:h-3 md:w-3" />
        </Button>
      </div>

      <ModifierControls modifier={modifier} />

      {/* Recursive: sub-modifiers on this modifier */}
      <ModifierSection parentId={modifier.id} depth={depth + 1} />
    </div>
  )
}

function ModifierControls({ modifier }: { modifier: Modifier }) {
  const reg = modifierKindRegistry.get(modifier.kind)
  if (!reg) return null
  if (reg.ControlsComponent) {
    const props = { modifier } as unknown as ModifierControlsComponentProps
    return <reg.ControlsComponent {...props} />
  }
  return null
}
