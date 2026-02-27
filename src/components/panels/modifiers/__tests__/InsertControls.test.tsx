import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InsertControls } from '../InsertControls'
import { useProjectStore } from '@/store/projectStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import type { InsertModifier } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const makeModifier = (overrides: Partial<InsertModifier['params']> = {}): InsertModifier => ({
  id: 'mod-1',
  parentId: 'obj-1',
  kind: 'insert',
  params: { compartmentsX: 2, compartmentsY: 2, wallThickness: 1.2, ...overrides },
})

describe('InsertControls', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
  })

  it('renders three sliders', () => {
    render(<InsertControls modifier={makeModifier()} />)
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(3)
  })

  it('displays labels for all controls', () => {
    render(<InsertControls modifier={makeModifier()} />)
    expect(screen.getByText('Compartments (Width)')).toBeInTheDocument()
    expect(screen.getByText('Compartments (Depth)')).toBeInTheDocument()
    expect(screen.getByText('Wall Thickness')).toBeInTheDocument()
  })

  it('displays current compartmentsX value', () => {
    render(<InsertControls modifier={makeModifier({ compartmentsX: 4 })} />)
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('displays current compartmentsY value', () => {
    render(<InsertControls modifier={makeModifier({ compartmentsY: 6 })} />)
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('displays wall thickness with mm suffix', () => {
    render(<InsertControls modifier={makeModifier({ wallThickness: 1.5 })} />)
    expect(screen.getByText('1.5mm')).toBeInTheDocument()
  })
})
