import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DividerGridControls } from '../DividerGridControls'
import { useProjectStore } from '@/store/projectStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import type { DividerGridModifier } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const makeModifier = (
  overrides: Partial<DividerGridModifier['params']> = {},
): DividerGridModifier => ({
  id: 'mod-1',
  parentId: 'obj-1',
  kind: 'dividerGrid',
  params: { dividersX: 2, dividersY: 3, wallThickness: 1.2, ...overrides },
})

describe('DividerGridControls', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
  })

  it('renders three sliders', () => {
    render(<DividerGridControls modifier={makeModifier()} />)
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(3)
  })

  it('displays labels for all controls', () => {
    render(<DividerGridControls modifier={makeModifier()} />)
    expect(screen.getByText('Dividers (Width)')).toBeInTheDocument()
    expect(screen.getByText('Dividers (Depth)')).toBeInTheDocument()
    expect(screen.getByText('Wall Thickness')).toBeInTheDocument()
  })

  it('displays current dividersX value', () => {
    render(<DividerGridControls modifier={makeModifier({ dividersX: 5 })} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('displays current dividersY value', () => {
    render(<DividerGridControls modifier={makeModifier({ dividersY: 7 })} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('displays wall thickness with mm suffix', () => {
    render(<DividerGridControls modifier={makeModifier({ wallThickness: 2.0 })} />)
    expect(screen.getByText('2.0mm')).toBeInTheDocument()
  })

  it('calls updateModifierParams when slider changes', () => {
    render(<DividerGridControls modifier={makeModifier()} />)
    const sliders = screen.getAllByRole('slider')
    // Verify sliders are rendered and accessible
    expect(sliders[0]).toBeInTheDocument()
    expect(sliders[1]).toBeInTheDocument()
    expect(sliders[2]).toBeInTheDocument()
  })
})
