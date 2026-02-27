import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ObjectListPanel } from '../ObjectListPanel'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import type { BinObject, BaseplateObject } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const makeBin = (id: string, name: string): BinObject => ({
  id,
  kind: 'bin',
  name,
  position: [0, 0, 0],
  params: {
    gridWidth: 1,
    gridDepth: 1,
    heightUnits: 3,
    stackingLip: true,
    wallThickness: 1.2,
    innerFillet: 0,
    magnetHoles: false,
    weightHoles: false,
    honeycombBase: false,
  },
})

const makeBaseplate = (id: string, name: string): BaseplateObject => ({
  id,
  kind: 'baseplate',
  name,
  position: [0, 0, 0],
  params: {
    gridWidth: 3,
    gridDepth: 3,
    slim: false,
    magnetHoles: true,
    screwHoles: false,
  },
})

describe('ObjectListPanel', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
    useUIStore.setState({ selectedObjectIds: [] })
  })

  it('shows "Objects" header', () => {
    render(<ObjectListPanel />)
    expect(screen.getByText('Objects')).toBeInTheDocument()
  })

  it('shows empty state message when no objects', () => {
    render(<ObjectListPanel />)
    expect(screen.getByText(/No objects yet/)).toBeInTheDocument()
  })

  it('renders object names', () => {
    useProjectStore.setState({
      objects: [makeBin('b1', 'Bin 1'), makeBaseplate('bp1', 'Baseplate 1')],
      modifiers: [],
    })
    render(<ObjectListPanel />)
    expect(screen.getByText('Bin 1')).toBeInTheDocument()
    expect(screen.getByText('Baseplate 1')).toBeInTheDocument()
  })

  it('does not show empty message when objects exist', () => {
    useProjectStore.setState({
      objects: [makeBin('b1', 'Bin 1')],
      modifiers: [],
    })
    render(<ObjectListPanel />)
    expect(screen.queryByText(/No objects yet/)).not.toBeInTheDocument()
  })

  it('selects object on click', async () => {
    const user = userEvent.setup()
    useProjectStore.setState({
      objects: [makeBin('b1', 'Bin 1'), makeBin('b2', 'Bin 2')],
      modifiers: [],
    })
    render(<ObjectListPanel />)
    await user.click(screen.getByText('Bin 1'))
    expect(useUIStore.getState().selectedObjectIds).toEqual(['b1'])
  })

  it('removes object when delete button clicked', async () => {
    const user = userEvent.setup()
    useProjectStore.setState({
      objects: [makeBin('b1', 'Bin 1')],
      modifiers: [],
    })
    render(<ObjectListPanel />)
    // The trash button is inside the object row
    const deleteButtons = screen.getAllByRole('button')
    // Click the delete button (last button in the row)
    await user.click(deleteButtons[deleteButtons.length - 1])
    expect(useProjectStore.getState().objects).toHaveLength(0)
  })

  it('renders multiple objects in order', () => {
    useProjectStore.setState({
      objects: [makeBin('b1', 'Alpha'), makeBin('b2', 'Beta'), makeBaseplate('bp1', 'Gamma')],
      modifiers: [],
    })
    render(<ObjectListPanel />)
    const items = screen.getAllByText(/Alpha|Beta|Gamma/)
    expect(items[0].textContent).toBe('Alpha')
    expect(items[1].textContent).toBe('Beta')
    expect(items[2].textContent).toBe('Gamma')
  })
})
