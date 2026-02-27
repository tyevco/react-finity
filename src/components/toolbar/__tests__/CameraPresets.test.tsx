import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CameraPresets } from '../CameraPresets'
import { useUIStore } from '@/store/uiStore'

describe('CameraPresets', () => {
  beforeEach(() => {
    useUIStore.setState({ cameraPreset: null })
  })

  it('renders four preset buttons', () => {
    render(<CameraPresets />)
    expect(screen.getByLabelText('Top View')).toBeInTheDocument()
    expect(screen.getByLabelText('Front View')).toBeInTheDocument()
    expect(screen.getByLabelText('Side View')).toBeInTheDocument()
    expect(screen.getByLabelText('Isometric View')).toBeInTheDocument()
  })

  it('sets camera preset to "top" on click', async () => {
    const user = userEvent.setup()
    render(<CameraPresets />)
    await user.click(screen.getByLabelText('Top View'))
    expect(useUIStore.getState().cameraPreset).toBe('top')
  })

  it('sets camera preset to "front" on click', async () => {
    const user = userEvent.setup()
    render(<CameraPresets />)
    await user.click(screen.getByLabelText('Front View'))
    expect(useUIStore.getState().cameraPreset).toBe('front')
  })

  it('sets camera preset to "side" on click', async () => {
    const user = userEvent.setup()
    render(<CameraPresets />)
    await user.click(screen.getByLabelText('Side View'))
    expect(useUIStore.getState().cameraPreset).toBe('side')
  })

  it('sets camera preset to "isometric" on click', async () => {
    const user = userEvent.setup()
    render(<CameraPresets />)
    await user.click(screen.getByLabelText('Isometric View'))
    expect(useUIStore.getState().cameraPreset).toBe('isometric')
  })
})
