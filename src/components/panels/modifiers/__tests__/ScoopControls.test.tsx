import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoopControls } from '../ScoopControls'
import { useProjectStore } from '@/store/projectStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import type { ScoopModifier } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const makeModifier = (overrides: Partial<ScoopModifier['params']> = {}): ScoopModifier => ({
  id: 'mod-1',
  parentId: 'obj-1',
  kind: 'scoop',
  params: { wall: 'front', radius: 0, ...overrides },
})

describe('ScoopControls', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
  })

  it('renders wall select and radius slider', () => {
    render(<ScoopControls modifier={makeModifier()} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('displays labels', () => {
    render(<ScoopControls modifier={makeModifier()} />)
    expect(screen.getByText('Wall')).toBeInTheDocument()
    expect(screen.getByText('Radius')).toBeInTheDocument()
  })

  it('shows "Auto" when radius is 0', () => {
    render(<ScoopControls modifier={makeModifier({ radius: 0 })} />)
    expect(screen.getByText('Auto')).toBeInTheDocument()
  })

  it('shows radius in mm when non-zero', () => {
    render(<ScoopControls modifier={makeModifier({ radius: 15 })} />)
    expect(screen.getByText('15mm')).toBeInTheDocument()
  })

  it('does not show "Auto" when radius is non-zero', () => {
    render(<ScoopControls modifier={makeModifier({ radius: 10 })} />)
    expect(screen.queryByText('Auto')).not.toBeInTheDocument()
  })
})
