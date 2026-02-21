import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      selectedObjectId: null,
      leftPanelOpen: true,
      rightPanelOpen: true,
      viewportBackground: 'dark',
      lightingPreset: 'studio',
      cameraPreset: null,
      snapToGrid: true,
      showMeasurements: true,
    })
  })

  it('has correct default values', () => {
    const state = useUIStore.getState()
    expect(state.selectedObjectId).toBeNull()
    expect(state.leftPanelOpen).toBe(true)
    expect(state.rightPanelOpen).toBe(true)
    expect(state.viewportBackground).toBe('dark')
    expect(state.lightingPreset).toBe('studio')
    expect(state.cameraPreset).toBeNull()
    expect(state.snapToGrid).toBe(true)
    expect(state.showMeasurements).toBe(true)
  })

  it('selects an object', () => {
    useUIStore.getState().selectObject('test-id')
    expect(useUIStore.getState().selectedObjectId).toBe('test-id')
  })

  it('deselects an object', () => {
    useUIStore.getState().selectObject('test-id')
    useUIStore.getState().selectObject(null)
    expect(useUIStore.getState().selectedObjectId).toBeNull()
  })

  it('toggles left panel', () => {
    expect(useUIStore.getState().leftPanelOpen).toBe(true)
    useUIStore.getState().toggleLeftPanel()
    expect(useUIStore.getState().leftPanelOpen).toBe(false)
    useUIStore.getState().toggleLeftPanel()
    expect(useUIStore.getState().leftPanelOpen).toBe(true)
  })

  it('toggles right panel', () => {
    expect(useUIStore.getState().rightPanelOpen).toBe(true)
    useUIStore.getState().toggleRightPanel()
    expect(useUIStore.getState().rightPanelOpen).toBe(false)
  })

  it('sets left panel open state', () => {
    useUIStore.getState().setLeftPanelOpen(false)
    expect(useUIStore.getState().leftPanelOpen).toBe(false)
    useUIStore.getState().setLeftPanelOpen(true)
    expect(useUIStore.getState().leftPanelOpen).toBe(true)
  })

  it('sets right panel open state', () => {
    useUIStore.getState().setRightPanelOpen(false)
    expect(useUIStore.getState().rightPanelOpen).toBe(false)
  })

  it('sets viewport background', () => {
    useUIStore.getState().setViewportBackground('light')
    expect(useUIStore.getState().viewportBackground).toBe('light')
    useUIStore.getState().setViewportBackground('neutral')
    expect(useUIStore.getState().viewportBackground).toBe('neutral')
    useUIStore.getState().setViewportBackground('dark')
    expect(useUIStore.getState().viewportBackground).toBe('dark')
  })

  it('sets lighting preset', () => {
    useUIStore.getState().setLightingPreset('outdoor')
    expect(useUIStore.getState().lightingPreset).toBe('outdoor')
    useUIStore.getState().setLightingPreset('soft')
    expect(useUIStore.getState().lightingPreset).toBe('soft')
    useUIStore.getState().setLightingPreset('studio')
    expect(useUIStore.getState().lightingPreset).toBe('studio')
  })

  it('sets camera preset', () => {
    useUIStore.getState().setCameraPreset('top')
    expect(useUIStore.getState().cameraPreset).toBe('top')
    useUIStore.getState().setCameraPreset('front')
    expect(useUIStore.getState().cameraPreset).toBe('front')
    useUIStore.getState().setCameraPreset(null)
    expect(useUIStore.getState().cameraPreset).toBeNull()
  })

  it('toggles snap to grid', () => {
    expect(useUIStore.getState().snapToGrid).toBe(true)
    useUIStore.getState().toggleSnapToGrid()
    expect(useUIStore.getState().snapToGrid).toBe(false)
    useUIStore.getState().toggleSnapToGrid()
    expect(useUIStore.getState().snapToGrid).toBe(true)
  })

  it('toggles show measurements', () => {
    expect(useUIStore.getState().showMeasurements).toBe(true)
    useUIStore.getState().toggleShowMeasurements()
    expect(useUIStore.getState().showMeasurements).toBe(false)
    useUIStore.getState().toggleShowMeasurements()
    expect(useUIStore.getState().showMeasurements).toBe(true)
  })
})
