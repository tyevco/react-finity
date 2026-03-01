import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PropertiesPanel } from '../PropertiesPanel'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { useProfileStore } from '@/store/profileStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import { DEFAULT_PROFILES, PROFILE_OFFICIAL } from '@/engine/constants'
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

describe('PropertiesPanel', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
    useUIStore.setState({ selectedObjectIds: [] })
    useProfileStore.setState({
      activeProfileKey: 'official',
      profiles: { ...DEFAULT_PROFILES },
      activeProfile: PROFILE_OFFICIAL,
    })
  })

  it('shows "Properties" header', () => {
    render(<PropertiesPanel />)
    expect(screen.getByText('Properties')).toBeInTheDocument()
  })

  it('shows empty message when nothing selected', () => {
    render(<PropertiesPanel />)
    expect(screen.getByText(/Select an object/)).toBeInTheDocument()
  })

  it('shows multi-select count when multiple selected', () => {
    useProjectStore.setState({
      objects: [makeBin('b1', 'Bin 1'), makeBin('b2', 'Bin 2')],
      modifiers: [],
    })
    useUIStore.setState({ selectedObjectIds: ['b1', 'b2'] })
    render(<PropertiesPanel />)
    expect(screen.getByText('2 objects selected')).toBeInTheDocument()
  })

  it('shows object name and kind when single bin selected', () => {
    const bin = makeBin('b1', 'Bin 1')
    useProjectStore.setState({ objects: [bin], modifiers: [] })
    useUIStore.setState({ selectedObjectIds: ['b1'] })
    render(<PropertiesPanel />)
    expect(screen.getByText('Bin 1')).toBeInTheDocument()
    expect(screen.getByText('(bin)')).toBeInTheDocument()
  })

  it('renders bin-specific properties for a bin', () => {
    const bin = makeBin('b1', 'Bin 1')
    useProjectStore.setState({ objects: [bin], modifiers: [] })
    useUIStore.setState({ selectedObjectIds: ['b1'] })
    render(<PropertiesPanel />)
    // BinProperties has these controls
    expect(screen.getByText('Grid Width')).toBeInTheDocument()
    expect(screen.getByText('Stacking Lip')).toBeInTheDocument()
  })

  it('renders baseplate-specific properties for a baseplate', () => {
    const bp = makeBaseplate('bp1', 'Baseplate 1')
    useProjectStore.setState({ objects: [bp], modifiers: [] })
    useUIStore.setState({ selectedObjectIds: ['bp1'] })
    render(<PropertiesPanel />)
    expect(screen.getByText('Baseplate 1')).toBeInTheDocument()
    expect(screen.getByText('(baseplate)')).toBeInTheDocument()
    expect(screen.getByText('Slim')).toBeInTheDocument()
  })

  it('shows empty message when selected object ID does not match any object', () => {
    useProjectStore.setState({ objects: [], modifiers: [] })
    useUIStore.setState({ selectedObjectIds: ['nonexistent'] })
    render(<PropertiesPanel />)
    expect(screen.getByText(/Select an object/)).toBeInTheDocument()
  })
})
