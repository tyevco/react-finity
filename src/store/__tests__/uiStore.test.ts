import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      selectedObjectIds: [],
      leftPanelOpen: true,
      rightPanelOpen: true,
      viewportBackground: 'dark',
      lightingPreset: 'studio',
      cameraPreset: null,
      snapToGrid: true,
      showMeasurements: true,
      activeView: 'edit',
      printBedPreset: '256x256',
      printBedSpacing: 10,
      exportScale: 1.0,
      curveQuality: 'medium',
      showWireframe: false,
      transparencyMode: false,
      sectionView: false,
      sectionPlaneY: 20,
    })
  })

  it('has correct default values', () => {
    const state = useUIStore.getState()
    expect(state.selectedObjectIds).toEqual([])
    expect(state.leftPanelOpen).toBe(true)
    expect(state.rightPanelOpen).toBe(true)
    expect(state.viewportBackground).toBe('dark')
    expect(state.lightingPreset).toBe('studio')
    expect(state.cameraPreset).toBeNull()
    expect(state.snapToGrid).toBe(true)
    expect(state.showMeasurements).toBe(true)
    expect(state.showWireframe).toBe(false)
    expect(state.transparencyMode).toBe(false)
    expect(state.sectionView).toBe(false)
    expect(state.sectionPlaneY).toBe(20)
  })

  it('selects an object', () => {
    useUIStore.getState().selectObject('test-id')
    expect(useUIStore.getState().selectedObjectIds).toEqual(['test-id'])
  })

  it('deselects all objects with null', () => {
    useUIStore.getState().selectObject('test-id')
    useUIStore.getState().selectObject(null)
    expect(useUIStore.getState().selectedObjectIds).toEqual([])
  })

  it('replaces selection without additive flag', () => {
    useUIStore.getState().selectObject('id-1')
    useUIStore.getState().selectObject('id-2')
    expect(useUIStore.getState().selectedObjectIds).toEqual(['id-2'])
  })

  it('adds to selection with additive flag', () => {
    useUIStore.getState().selectObject('id-1')
    useUIStore.getState().selectObject('id-2', true)
    expect(useUIStore.getState().selectedObjectIds).toEqual(['id-1', 'id-2'])
  })

  it('removes from selection with additive flag when already selected', () => {
    useUIStore.getState().selectObject('id-1')
    useUIStore.getState().selectObject('id-2', true)
    useUIStore.getState().selectObject('id-1', true)
    expect(useUIStore.getState().selectedObjectIds).toEqual(['id-2'])
  })

  it('toggles object selection', () => {
    useUIStore.getState().toggleObjectSelection('id-1')
    expect(useUIStore.getState().selectedObjectIds).toEqual(['id-1'])
    useUIStore.getState().toggleObjectSelection('id-2')
    expect(useUIStore.getState().selectedObjectIds).toEqual(['id-1', 'id-2'])
    useUIStore.getState().toggleObjectSelection('id-1')
    expect(useUIStore.getState().selectedObjectIds).toEqual(['id-2'])
  })

  it('clears selection', () => {
    useUIStore.getState().selectObject('id-1')
    useUIStore.getState().selectObject('id-2', true)
    useUIStore.getState().clearSelection()
    expect(useUIStore.getState().selectedObjectIds).toEqual([])
  })

  it('sets selected object ids directly', () => {
    useUIStore.getState().setSelectedObjectIds(['a', 'b', 'c'])
    expect(useUIStore.getState().selectedObjectIds).toEqual(['a', 'b', 'c'])
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

  it('sets active view', () => {
    expect(useUIStore.getState().activeView).toBe('edit')
    useUIStore.getState().setActiveView('printLayout')
    expect(useUIStore.getState().activeView).toBe('printLayout')
    useUIStore.getState().setActiveView('edit')
    expect(useUIStore.getState().activeView).toBe('edit')
  })

  it('sets print bed preset', () => {
    expect(useUIStore.getState().printBedPreset).toBe('256x256')
    useUIStore.getState().setPrintBedPreset('220x220')
    expect(useUIStore.getState().printBedPreset).toBe('220x220')
    useUIStore.getState().setPrintBedPreset('350x350')
    expect(useUIStore.getState().printBedPreset).toBe('350x350')
  })

  it('sets print bed spacing', () => {
    expect(useUIStore.getState().printBedSpacing).toBe(10)
    useUIStore.getState().setPrintBedSpacing(15)
    expect(useUIStore.getState().printBedSpacing).toBe(15)
    useUIStore.getState().setPrintBedSpacing(5)
    expect(useUIStore.getState().printBedSpacing).toBe(5)
  })

  it('has correct default export settings', () => {
    expect(useUIStore.getState().exportScale).toBe(1.0)
    expect(useUIStore.getState().curveQuality).toBe('medium')
  })

  it('sets export scale', () => {
    useUIStore.getState().setExportScale(2.0)
    expect(useUIStore.getState().exportScale).toBe(2.0)
    useUIStore.getState().setExportScale(0.5)
    expect(useUIStore.getState().exportScale).toBe(0.5)
  })

  it('sets curve quality', () => {
    useUIStore.getState().setCurveQuality('low')
    expect(useUIStore.getState().curveQuality).toBe('low')
    useUIStore.getState().setCurveQuality('high')
    expect(useUIStore.getState().curveQuality).toBe('high')
    useUIStore.getState().setCurveQuality('medium')
    expect(useUIStore.getState().curveQuality).toBe('medium')
  })

  it('toggles wireframe', () => {
    expect(useUIStore.getState().showWireframe).toBe(false)
    useUIStore.getState().toggleWireframe()
    expect(useUIStore.getState().showWireframe).toBe(true)
    useUIStore.getState().toggleWireframe()
    expect(useUIStore.getState().showWireframe).toBe(false)
  })

  it('toggles transparency mode', () => {
    expect(useUIStore.getState().transparencyMode).toBe(false)
    useUIStore.getState().toggleTransparencyMode()
    expect(useUIStore.getState().transparencyMode).toBe(true)
    useUIStore.getState().toggleTransparencyMode()
    expect(useUIStore.getState().transparencyMode).toBe(false)
  })

  it('toggles section view', () => {
    expect(useUIStore.getState().sectionView).toBe(false)
    useUIStore.getState().toggleSectionView()
    expect(useUIStore.getState().sectionView).toBe(true)
    useUIStore.getState().toggleSectionView()
    expect(useUIStore.getState().sectionView).toBe(false)
  })

  it('sets section plane Y', () => {
    useUIStore.getState().setSectionPlaneY(50)
    expect(useUIStore.getState().sectionPlaneY).toBe(50)
    useUIStore.getState().setSectionPlaneY(10)
    expect(useUIStore.getState().sectionPlaneY).toBe(10)
  })
})
