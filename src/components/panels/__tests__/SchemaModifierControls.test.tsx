import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SchemaModifierControls } from '../SchemaModifierControls'
import { useProjectStore } from '@/store/projectStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import type { ParamSchema } from '@/engine/registry/types'
import type { GenericModifier } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const sliderSchema: ParamSchema = {
  fields: [{ type: 'slider', key: 'width', label: 'Width', min: 1, max: 10, step: 1, unit: 'mm' }],
}

const switchSchema: ParamSchema = {
  fields: [{ type: 'switch', key: 'enabled', label: 'Enabled' }],
}

const selectSchema: ParamSchema = {
  fields: [
    {
      type: 'select',
      key: 'mode',
      label: 'Mode',
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
    },
  ],
}

const numberSchema: ParamSchema = {
  fields: [{ type: 'number', key: 'count', label: 'Count', min: 0, max: 100, step: 1, unit: 'x' }],
}

const multiSchema: ParamSchema = {
  fields: [
    { type: 'slider', key: 'size', label: 'Size', min: 0, max: 20, step: 1, precision: 1 },
    { type: 'switch', key: 'active', label: 'Active' },
  ],
}

const makeModifier = (params: Record<string, unknown>): GenericModifier => ({
  id: 'mod-1',
  parentId: 'obj-1',
  kind: 'test',
  params,
})

describe('SchemaModifierControls', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
  })

  describe('slider field', () => {
    it('renders a slider with label and value', () => {
      render(<SchemaModifierControls schema={sliderSchema} modifier={makeModifier({ width: 5 })} />)
      expect(screen.getByText('Width')).toBeInTheDocument()
      expect(screen.getByText('5mm')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    it('formats value with precision when specified', () => {
      const schema: ParamSchema = {
        fields: [
          { type: 'slider', key: 'val', label: 'Val', min: 0, max: 10, step: 0.1, precision: 2 },
        ],
      }
      render(<SchemaModifierControls schema={schema} modifier={makeModifier({ val: 3.5 })} />)
      expect(screen.getByText('3.50')).toBeInTheDocument()
    })
  })

  describe('switch field', () => {
    it('renders a switch with label', () => {
      render(
        <SchemaModifierControls schema={switchSchema} modifier={makeModifier({ enabled: true })} />,
      )
      expect(screen.getByText('Enabled')).toBeInTheDocument()
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    it('reflects checked state', () => {
      render(
        <SchemaModifierControls schema={switchSchema} modifier={makeModifier({ enabled: true })} />,
      )
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    })

    it('calls updateModifierParams on toggle', async () => {
      const user = userEvent.setup()
      const mod = makeModifier({ enabled: false })
      useProjectStore.setState({ objects: [], modifiers: [mod] })
      render(<SchemaModifierControls schema={switchSchema} modifier={mod} />)
      await user.click(screen.getByRole('switch'))
      const updated = useProjectStore.getState().modifiers.find((m) => m.id === 'mod-1')
      expect(updated?.params).toEqual({ enabled: true })
    })
  })

  describe('select field', () => {
    it('renders a combobox with label', () => {
      render(
        <SchemaModifierControls schema={selectSchema} modifier={makeModifier({ mode: 'a' })} />,
      )
      expect(screen.getByText('Mode')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('number field', () => {
    it('renders a number input with label and value', () => {
      render(
        <SchemaModifierControls schema={numberSchema} modifier={makeModifier({ count: 42 })} />,
      )
      expect(screen.getByText('Count')).toBeInTheDocument()
      expect(screen.getByText('42x')).toBeInTheDocument()
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })
  })

  describe('multiple fields', () => {
    it('renders all fields from schema', () => {
      render(
        <SchemaModifierControls
          schema={multiSchema}
          modifier={makeModifier({ size: 10.0, active: false })}
        />,
      )
      expect(screen.getByText('Size')).toBeInTheDocument()
      expect(screen.getByText('10.0')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })
  })
})
