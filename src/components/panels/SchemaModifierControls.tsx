import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ParamSchema, ParamField } from '@/engine/registry/types'
import type { Modifier } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'

interface SchemaModifierControlsProps {
  schema: ParamSchema
  modifier: Modifier
}

export function SchemaModifierControls({ schema, modifier }: SchemaModifierControlsProps) {
  const updateModifierParams = useProjectStore((s) => s.updateModifierParams)

  return (
    <div className="space-y-3">
      {schema.fields.map((field) => (
        <SchemaField
          key={field.key}
          field={field}
          value={(modifier.params as Record<string, unknown>)[field.key]}
          onChange={(value) => {
            updateModifierParams(modifier.id, { [field.key]: value })
          }}
        />
      ))}
    </div>
  )
}

interface SchemaFieldProps {
  field: ParamField
  value: unknown
  onChange: (value: unknown) => void
}

function SchemaField({ field, value, onChange }: SchemaFieldProps) {
  switch (field.type) {
    case 'slider': {
      const numValue = typeof value === 'number' ? value : field.min
      const displayValue =
        field.precision !== undefined ? numValue.toFixed(field.precision) : String(numValue)
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{field.label}</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {displayValue}
              {field.unit ?? ''}
            </span>
          </div>
          <Slider
            value={[numValue]}
            onValueChange={([v]) => {
              onChange(v)
            }}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        </div>
      )
    }
    case 'switch': {
      const boolValue = typeof value === 'boolean' ? value : false
      return (
        <div className="flex items-center justify-between">
          <Label className="text-xs">{field.label}</Label>
          <Switch
            checked={boolValue}
            onCheckedChange={(checked) => {
              onChange(checked)
            }}
          />
        </div>
      )
    }
    case 'select': {
      const strValue = typeof value === 'string' ? value : ''
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{field.label}</Label>
          <Select
            value={strValue}
            onValueChange={(v) => {
              onChange(v)
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }
    case 'number': {
      const numValue = typeof value === 'number' ? value : 0
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{field.label}</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {numValue}
              {field.unit ?? ''}
            </span>
          </div>
          <input
            type="number"
            value={numValue}
            onChange={(e) => {
              onChange(Number(e.target.value))
            }}
            min={field.min}
            max={field.max}
            step={field.step}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )
    }
  }
}
