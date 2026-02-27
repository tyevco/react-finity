import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BaseplateProperties } from '../BaseplateProperties'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import { DEFAULT_PROFILES, PROFILE_OFFICIAL } from '@/engine/constants'
import type { BaseplateObject } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const makeBaseplate = (overrides: Partial<BaseplateObject['params']> = {}): BaseplateObject => ({
  id: 'bp-1',
  kind: 'baseplate',
  name: 'Baseplate 1',
  position: [0, 0, 0],
  params: {
    gridWidth: 3,
    gridDepth: 3,
    slim: false,
    magnetHoles: true,
    screwHoles: false,
    ...overrides,
  },
})

describe('BaseplateProperties', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
    useProfileStore.setState({
      activeProfileKey: 'official',
      profiles: { ...DEFAULT_PROFILES },
      activeProfile: PROFILE_OFFICIAL,
    })
  })

  it('renders profile selector', () => {
    render(<BaseplateProperties object={makeBaseplate()} />)
    expect(screen.getByText('Dimension Profile')).toBeInTheDocument()
  })

  it('renders grid width and depth sliders', () => {
    render(<BaseplateProperties object={makeBaseplate()} />)
    expect(screen.getByText('Grid Width')).toBeInTheDocument()
    expect(screen.getByText('Grid Depth')).toBeInTheDocument()
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(2)
  })

  it('displays grid values with unit and mm', () => {
    render(<BaseplateProperties object={makeBaseplate({ gridWidth: 3, gridDepth: 3 })} />)
    // Both sliders show "3u (126mm)"
    const valueDisplays = screen.getAllByText(/3u \(126mm\)/)
    expect(valueDisplays).toHaveLength(2)
  })

  it('renders slim, magnet, and screw switches', () => {
    render(<BaseplateProperties object={makeBaseplate()} />)
    expect(screen.getByText('Slim')).toBeInTheDocument()
    expect(screen.getByText('Magnet Holes')).toBeInTheDocument()
    expect(screen.getByText('Screw Holes')).toBeInTheDocument()
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(3)
  })

  it('reflects switch states from params', () => {
    render(
      <BaseplateProperties
        object={makeBaseplate({ slim: false, magnetHoles: true, screwHoles: false })}
      />,
    )
    const switches = screen.getAllByRole('switch')
    // slim=false, magnetHoles=true, screwHoles=false
    expect(switches[0]).toHaveAttribute('aria-checked', 'false') // slim
    expect(switches[1]).toHaveAttribute('aria-checked', 'true') // magnet
    expect(switches[2]).toHaveAttribute('aria-checked', 'false') // screw
  })

  it('renders dimensions readout', () => {
    render(<BaseplateProperties object={makeBaseplate()} />)
    expect(screen.getByText('Dimensions')).toBeInTheDocument()
    const readout = screen.getByTestId('dimensions-readout')
    expect(readout).toBeInTheDocument()
    // Should contain mm dimensions
    expect(readout.textContent).toMatch(/\d+ x \d+ x .+ mm/)
  })

  it('calls updateObjectParams when toggling slim switch', async () => {
    const user = userEvent.setup()
    const bp = makeBaseplate({ slim: false })
    useProjectStore.setState({ objects: [bp], modifiers: [] })
    render(<BaseplateProperties object={bp} />)
    const switches = screen.getAllByRole('switch')
    await user.click(switches[0]) // slim switch
    const updated = useProjectStore.getState().objects.find((o) => o.id === 'bp-1')
    expect(updated?.params).toEqual(expect.objectContaining({ slim: true }))
  })
})
