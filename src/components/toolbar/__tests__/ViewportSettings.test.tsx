import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewportSettings } from '../ViewportSettings'
import { useUIStore } from '@/store/uiStore'

describe('ViewportSettings', () => {
  beforeEach(() => {
    useUIStore.setState({
      viewportBackground: 'dark',
      lightingPreset: 'studio',
      showWireframe: false,
      transparencyMode: false,
      sectionView: false,
    })
  })

  it('renders settings button', () => {
    render(<ViewportSettings />)
    expect(screen.getByLabelText('Viewport settings')).toBeInTheDocument()
  })

  it('opens dropdown and shows background options', async () => {
    const user = userEvent.setup()
    render(<ViewportSettings />)
    await user.click(screen.getByLabelText('Viewport settings'))
    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })

  it('opens dropdown and shows lighting options', async () => {
    const user = userEvent.setup()
    render(<ViewportSettings />)
    await user.click(screen.getByLabelText('Viewport settings'))
    expect(screen.getByText('Lighting')).toBeInTheDocument()
    expect(screen.getByText('Studio')).toBeInTheDocument()
    expect(screen.getByText('Outdoor')).toBeInTheDocument()
    expect(screen.getByText('Soft')).toBeInTheDocument()
  })

  it('shows display toggle items', async () => {
    const user = userEvent.setup()
    render(<ViewportSettings />)
    await user.click(screen.getByLabelText('Viewport settings'))
    expect(screen.getByText('Display')).toBeInTheDocument()
    expect(screen.getByText('Enable Wireframe')).toBeInTheDocument()
    expect(screen.getByText('Enable Transparency')).toBeInTheDocument()
    expect(screen.getByText('Enable Section View')).toBeInTheDocument()
  })

  it('toggles wireframe on click', async () => {
    const user = userEvent.setup()
    render(<ViewportSettings />)
    await user.click(screen.getByLabelText('Viewport settings'))
    await user.click(screen.getByTestId('toggle-wireframe'))
    expect(useUIStore.getState().showWireframe).toBe(true)
  })

  it('toggles transparency on click', async () => {
    const user = userEvent.setup()
    render(<ViewportSettings />)
    await user.click(screen.getByLabelText('Viewport settings'))
    await user.click(screen.getByTestId('toggle-transparency'))
    expect(useUIStore.getState().transparencyMode).toBe(true)
  })

  it('toggles section view on click', async () => {
    const user = userEvent.setup()
    render(<ViewportSettings />)
    await user.click(screen.getByLabelText('Viewport settings'))
    await user.click(screen.getByTestId('toggle-section'))
    expect(useUIStore.getState().sectionView).toBe(true)
  })

  it('shows "Disable" labels when features are enabled', async () => {
    useUIStore.setState({
      showWireframe: true,
      transparencyMode: true,
      sectionView: true,
    })
    const user = userEvent.setup()
    render(<ViewportSettings />)
    await user.click(screen.getByLabelText('Viewport settings'))
    expect(screen.getByText('Disable Wireframe')).toBeInTheDocument()
    expect(screen.getByText('Disable Transparency')).toBeInTheDocument()
    expect(screen.getByText('Disable Section View')).toBeInTheDocument()
  })
})
