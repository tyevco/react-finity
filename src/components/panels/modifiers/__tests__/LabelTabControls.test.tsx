import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LabelTabControls } from '../LabelTabControls'
import { useProjectStore } from '@/store/projectStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import type { LabelTabModifier } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const makeModifier = (overrides: Partial<LabelTabModifier['params']> = {}): LabelTabModifier => ({
  id: 'mod-1',
  parentId: 'obj-1',
  kind: 'labelTab',
  params: { wall: 'front', angle: 45, height: 10, ...overrides },
})

describe('LabelTabControls', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
  })

  it('renders wall select and two sliders', () => {
    render(<LabelTabControls modifier={makeModifier()} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(2)
  })

  it('displays labels for all controls', () => {
    render(<LabelTabControls modifier={makeModifier()} />)
    expect(screen.getByText('Wall')).toBeInTheDocument()
    expect(screen.getByText('Angle')).toBeInTheDocument()
    expect(screen.getByText('Height')).toBeInTheDocument()
  })

  it('displays angle with deg suffix', () => {
    render(<LabelTabControls modifier={makeModifier({ angle: 45 })} />)
    expect(screen.getByText('45deg')).toBeInTheDocument()
  })

  it('displays height with mm suffix', () => {
    render(<LabelTabControls modifier={makeModifier({ height: 12 })} />)
    expect(screen.getByText('12mm')).toBeInTheDocument()
  })

  it('displays different angle values', () => {
    render(<LabelTabControls modifier={makeModifier({ angle: 30 })} />)
    expect(screen.getByText('30deg')).toBeInTheDocument()
  })
})
