import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LidControls } from '../LidControls'
import { useProjectStore } from '@/store/projectStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import type { LidModifier } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const makeModifier = (stacking = true): LidModifier => ({
  id: 'mod-1',
  parentId: 'obj-1',
  kind: 'lid',
  params: { stacking },
})

describe('LidControls', () => {
  beforeEach(() => {
    useProjectStore.setState({
      objects: [],
      modifiers: [makeModifier(true)],
    })
  })

  it('renders a single switch', () => {
    render(<LidControls modifier={makeModifier()} />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('displays "Stacking" label', () => {
    render(<LidControls modifier={makeModifier()} />)
    expect(screen.getByText('Stacking')).toBeInTheDocument()
  })

  it('switch reflects stacking=true', () => {
    render(<LidControls modifier={makeModifier(true)} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('switch reflects stacking=false', () => {
    render(<LidControls modifier={makeModifier(false)} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('calls updateModifierParams on toggle', async () => {
    const user = userEvent.setup()
    const mod = makeModifier(false)
    useProjectStore.setState({
      objects: [],
      modifiers: [mod],
    })
    render(<LidControls modifier={mod} />)
    await user.click(screen.getByRole('switch'))
    const state = useProjectStore.getState()
    const updated = state.modifiers.find((m) => m.id === 'mod-1')
    expect(updated?.params).toEqual({ stacking: true })
  })
})
