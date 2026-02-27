import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SchemaPropertiesPanel } from '../SchemaPropertiesPanel'
import { useProjectStore } from '@/store/projectStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import type { ParamSchema } from '@/engine/registry/types'
import type { GenericGridfinityObject } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const testSchema: ParamSchema = {
  fields: [
    { type: 'slider', key: 'width', label: 'Width', min: 1, max: 10, step: 1, unit: 'mm' },
    { type: 'switch', key: 'active', label: 'Active' },
    {
      type: 'select',
      key: 'color',
      label: 'Color',
      options: [
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
      ],
    },
    { type: 'number', key: 'count', label: 'Count', min: 0, max: 50, step: 1 },
  ],
}

const makeObject = (params: Record<string, unknown>): GenericGridfinityObject => ({
  id: 'obj-1',
  kind: 'testKind',
  name: 'Test Object',
  position: [0, 0, 0],
  params,
})

describe('SchemaPropertiesPanel', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
  })

  it('renders all field types', () => {
    const obj = makeObject({ width: 5, active: true, color: 'red', count: 10 })
    render(<SchemaPropertiesPanel schema={testSchema} object={obj} />)
    expect(screen.getByText('Width')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByText('Count')).toBeInTheDocument()
  })

  it('displays slider value with unit', () => {
    const obj = makeObject({ width: 7, active: false, color: 'blue', count: 0 })
    render(<SchemaPropertiesPanel schema={testSchema} object={obj} />)
    expect(screen.getByText('7mm')).toBeInTheDocument()
  })

  it('renders switch with correct checked state', () => {
    const obj = makeObject({ width: 1, active: true, color: 'red', count: 0 })
    render(<SchemaPropertiesPanel schema={testSchema} object={obj} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls updateObjectParams when switch toggled', async () => {
    const user = userEvent.setup()
    const obj = makeObject({ width: 1, active: false, color: 'red', count: 0 })
    useProjectStore.setState({ objects: [obj], modifiers: [] })
    render(<SchemaPropertiesPanel schema={testSchema} object={obj} />)
    await user.click(screen.getByRole('switch'))
    const updated = useProjectStore.getState().objects.find((o) => o.id === 'obj-1')
    expect(updated?.params).toEqual(expect.objectContaining({ active: true }))
  })

  it('renders number field with spinbutton', () => {
    const obj = makeObject({ width: 1, active: false, color: 'red', count: 25 })
    render(<SchemaPropertiesPanel schema={testSchema} object={obj} />)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })
})
