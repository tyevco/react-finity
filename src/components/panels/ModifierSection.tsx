import { useMemo } from 'react'
import { X, Plus } from 'lucide-react'
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
import { DividerGridControls } from './modifiers/DividerGridControls'
import { LabelTabControls } from './modifiers/LabelTabControls'
import { ScoopControls } from './modifiers/ScoopControls'
import { InsertControls } from './modifiers/InsertControls'
import { LidControls } from './modifiers/LidControls'

const MODIFIER_LABELS: Record<ModifierKind, string> = {
  dividerGrid: 'Divider Grid',
  labelTab: 'Label Tab',
  scoop: 'Scoop',
  insert: 'Insert',
  lid: 'Lid',
}

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

  return (
    <div className={depth > 0 ? 'ml-2 border-l border-border pl-2' : ''}>
      <Separator className="my-3" />

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {depth === 0 ? 'Modifiers' : 'Sub-modifiers'}
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="add-modifier-btn">
              <Plus className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => addModifier(parentId, 'dividerGrid')}>
              Divider Grid
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addModifier(parentId, 'labelTab')}>
              Label Tab
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addModifier(parentId, 'scoop')}>
              Scoop
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addModifier(parentId, 'insert')}>
              Insert
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addModifier(parentId, 'lid')}>Lid</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {modifiers.length === 0 && (
        <div className="py-2 text-center text-xs text-muted-foreground">No modifiers added.</div>
      )}

      {modifiers.map((modifier) => (
        <ModifierCard
          key={modifier.id}
          modifier={modifier}
          depth={depth}
          onRemove={() => {
            removeModifier(modifier.id)
          }}
        />
      ))}
    </div>
  )
}

interface ModifierCardProps {
  modifier: Modifier
  depth: number
  onRemove: () => void
}

function ModifierCard({ modifier, depth, onRemove }: ModifierCardProps) {
  const wallLabel = 'wall' in modifier.params ? ` (${modifier.params.wall})` : ''

  return (
    <div
      className="mt-2 rounded-md border border-border p-2"
      data-testid={`modifier-${modifier.kind}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium">
          {MODIFIER_LABELS[modifier.kind]}
          {wallLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onRemove}
          data-testid="remove-modifier-btn"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <ModifierControls modifier={modifier} />

      {/* Recursive: sub-modifiers on this modifier */}
      <ModifierSection parentId={modifier.id} depth={depth + 1} />
    </div>
  )
}

function ModifierControls({ modifier }: { modifier: Modifier }) {
  switch (modifier.kind) {
    case 'dividerGrid':
      return <DividerGridControls modifier={modifier} />
    case 'labelTab':
      return <LabelTabControls modifier={modifier} />
    case 'scoop':
      return <ScoopControls modifier={modifier} />
    case 'insert':
      return <InsertControls modifier={modifier} />
    case 'lid':
      return <LidControls modifier={modifier} />
  }
}
