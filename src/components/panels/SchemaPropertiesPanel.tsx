import type { ParamSchema } from '@/engine/registry/types'
import type { GridfinityObject } from '@/types/gridfinity'
import { useProjectStore } from '@/store/projectStore'
import { SchemaField } from './SchemaField'

interface SchemaPropertiesPanelProps {
  schema: ParamSchema
  object: GridfinityObject
}

export function SchemaPropertiesPanel({ schema, object }: SchemaPropertiesPanelProps) {
  const updateObjectParams = useProjectStore((s) => s.updateObjectParams)

  return (
    <div className="space-y-3">
      {schema.fields.map((field) => (
        <SchemaField
          key={field.key}
          field={field}
          value={(object.params as Record<string, unknown>)[field.key]}
          onChange={(value) => {
            updateObjectParams(object.id, { [field.key]: value })
          }}
        />
      ))}
    </div>
  )
}
