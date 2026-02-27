import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BinProperties } from '../BinProperties'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import { DEFAULT_PROFILES, PROFILE_OFFICIAL } from '@/engine/constants'
import type { BinObject } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const makeBin = (overrides: Partial<BinObject['params']> = {}): BinObject => ({
  id: 'bin-1',
  kind: 'bin',
  name: 'Bin 1',
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
    ...overrides,
  },
})

describe('BinProperties', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
    useProfileStore.setState({
      activeProfileKey: 'official',
      profiles: { ...DEFAULT_PROFILES },
      activeProfile: PROFILE_OFFICIAL,
    })
  })

  it('renders profile selector', () => {
    render(<BinProperties object={makeBin()} />)
    expect(screen.getByText('Dimension Profile')).toBeInTheDocument()
  })

  it('renders grid width, depth, and height sliders', () => {
    render(<BinProperties object={makeBin()} />)
    expect(screen.getByText('Grid Width')).toBeInTheDocument()
    expect(screen.getByText('Grid Depth')).toBeInTheDocument()
    expect(screen.getByText('Height')).toBeInTheDocument()
  })

  it('displays height with unit and mm', () => {
    render(<BinProperties object={makeBin({ heightUnits: 3 })} />)
    expect(screen.getByText(/3u/)).toBeInTheDocument()
  })

  it('renders stacking lip switch', () => {
    render(<BinProperties object={makeBin()} />)
    expect(screen.getByText('Stacking Lip')).toBeInTheDocument()
  })

  it('renders wall thickness slider with mm display', () => {
    render(<BinProperties object={makeBin({ wallThickness: 1.2 })} />)
    expect(screen.getByText('Wall Thickness')).toBeInTheDocument()
    expect(screen.getByText('1.2mm')).toBeInTheDocument()
  })

  it('renders inner fillet slider', () => {
    render(<BinProperties object={makeBin()} />)
    expect(screen.getByText('Inner Fillet')).toBeInTheDocument()
  })

  it('shows "None" when inner fillet is 0', () => {
    render(<BinProperties object={makeBin({ innerFillet: 0 })} />)
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('shows inner fillet value when non-zero', () => {
    render(<BinProperties object={makeBin({ innerFillet: 1.5 })} />)
    expect(screen.getByText('1.5mm')).toBeInTheDocument()
  })

  it('renders base option switches', () => {
    render(<BinProperties object={makeBin()} />)
    expect(screen.getByText('Base Options')).toBeInTheDocument()
    expect(screen.getByText('Magnet Holes')).toBeInTheDocument()
    expect(screen.getByText('Weight Holes')).toBeInTheDocument()
    expect(screen.getByText('Honeycomb Base')).toBeInTheDocument()
  })

  it('renders dimensions readout', () => {
    render(<BinProperties object={makeBin()} />)
    const readout = screen.getByTestId('dimensions-readout')
    expect(readout).toBeInTheDocument()
    expect(readout.textContent).toMatch(/\d+.* x \d+.* x \d+.* mm/)
  })

  it('renders modifier section', () => {
    render(<BinProperties object={makeBin()} />)
    expect(screen.getByText('Modifiers')).toBeInTheDocument()
  })

  it('toggles stacking lip', async () => {
    const user = userEvent.setup()
    const bin = makeBin({ stackingLip: true })
    useProjectStore.setState({ objects: [bin], modifiers: [] })
    render(<BinProperties object={bin} />)
    // Find the stacking lip switch (first switch in order)
    const switches = screen.getAllByRole('switch')
    const stackingLipSwitch = switches[0]
    expect(stackingLipSwitch).toHaveAttribute('aria-checked', 'true')
    await user.click(stackingLipSwitch)
    const updated = useProjectStore.getState().objects.find((o) => o.id === 'bin-1')
    expect(updated?.params).toEqual(expect.objectContaining({ stackingLip: false }))
  })
})
