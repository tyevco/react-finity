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
import type { ParamField } from '@/engine/registry/types'

export interface SchemaFieldProps {
  field: ParamField
  value: unknown
  onChange: (value: unknown) => void
}

export function SchemaField({ field, value, onChange }: SchemaFieldProps) {
  const fieldId = `schema-field-${field.key}`

  switch (field.type) {
    case 'slider': {
      const numValue = typeof value === 'number' ? value : field.min
      const displayValue =
        field.precision !== undefined ? numValue.toFixed(field.precision) : String(numValue)
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={fieldId} className="text-xs">
              {field.label}
            </Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {displayValue}
              {field.unit ?? ''}
            </span>
          </div>
          <Slider
            id={fieldId}
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
          <Label htmlFor={fieldId} className="text-xs">
            {field.label}
          </Label>
          <Switch
            id={fieldId}
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
          <Label htmlFor={fieldId} className="text-xs">
            {field.label}
          </Label>
          <Select
            value={strValue}
            onValueChange={(v) => {
              onChange(v)
            }}
          >
            <SelectTrigger id={fieldId} className="h-8 text-xs">
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
            <Label htmlFor={fieldId} className="text-xs">
              {field.label}
            </Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {numValue}
              {field.unit ?? ''}
            </span>
          </div>
          <input
            id={fieldId}
            type="number"
            value={numValue}
            onChange={(e) => {
              const parsed = Number(e.target.value)
              if (e.target.value === '' || Number.isNaN(parsed)) return
              let clamped = parsed
              if (field.min !== undefined) clamped = Math.max(field.min, clamped)
              if (field.max !== undefined) clamped = Math.min(field.max, clamped)
              onChange(clamped)
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
