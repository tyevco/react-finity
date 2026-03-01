import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from '../Toolbar'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { useProfileStore } from '@/store/profileStore'
import { useProjectManagerStore } from '@/store/projectManagerStore'
import { useHistoryStore } from '@/store/historyStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import { DEFAULT_PROFILES, PROFILE_OFFICIAL } from '@/engine/constants'

// Mock useIsMobile to control desktop/mobile rendering
vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}))

// Mock export functions to avoid Three.js in jsdom (partial mocks preserve other exports)
vi.mock('@/engine/export/mergeObjectGeometry', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as object), mergeObjectWithModifiers: vi.fn() }
})
vi.mock('@/engine/export/printOrientation', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as object), getPrintRotation: vi.fn(), applyPrintOrientation: vi.fn() }
})
vi.mock('@/engine/export/stlExporter', () => ({
  exportObjectAsSTL: vi.fn(),
}))
vi.mock('@/engine/export/threeMfExporter', () => ({
  exportObjectAs3MF: vi.fn(),
}))

beforeAll(() => {
  registerBuiltinKinds()
})

describe('Toolbar', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
    useUIStore.setState({
      selectedObjectIds: [],
      leftPanelOpen: true,
      rightPanelOpen: true,
      activeView: 'edit',
      snapToGrid: true,
      showWireframe: false,
      transparencyMode: false,
      sectionView: false,
      viewportBackground: 'dark',
      lightingPreset: 'studio',
      cameraPreset: null,
      exportScale: 1.0,
    })
    useProfileStore.setState({
      activeProfileKey: 'official',
      profiles: { ...DEFAULT_PROFILES },
      activeProfile: PROFILE_OFFICIAL,
    })
    useProjectManagerStore.setState({
      currentProjectName: 'My Project',
      isDirty: false,
      projects: [],
      currentProjectId: 'proj-1',
    })
    useHistoryStore.setState({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    })
  })

  it('renders the toolbar', () => {
    render(<Toolbar />)
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
  })

  it('shows project name', () => {
    render(<Toolbar />)
    expect(screen.getByTestId('project-name')).toHaveTextContent('My Project')
  })

  it('shows dirty indicator when project is dirty', () => {
    useProjectManagerStore.setState({ isDirty: true })
    render(<Toolbar />)
    expect(screen.getByTestId('project-name')).toHaveTextContent('My Project *')
  })

  it('shows edit/print view toggle buttons', () => {
    render(<Toolbar />)
    expect(screen.getByLabelText('Edit view')).toBeInTheDocument()
    expect(screen.getByLabelText('Print layout view')).toBeInTheDocument()
  })

  it('marks edit view as pressed when in edit mode', () => {
    render(<Toolbar />)
    expect(screen.getByLabelText('Edit view')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Print layout view')).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches to print view on click', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByLabelText('Print layout view'))
    expect(useUIStore.getState().activeView).toBe('printLayout')
  })

  it('shows undo/redo buttons on desktop', () => {
    render(<Toolbar />)
    expect(screen.getByTestId('undo-btn')).toBeInTheDocument()
    expect(screen.getByTestId('redo-btn')).toBeInTheDocument()
  })

  it('disables undo button when canUndo is false', () => {
    render(<Toolbar />)
    expect(screen.getByTestId('undo-btn')).toBeDisabled()
  })

  it('disables redo button when canRedo is false', () => {
    render(<Toolbar />)
    expect(screen.getByTestId('redo-btn')).toBeDisabled()
  })

  it('enables undo button when canUndo is true', () => {
    useHistoryStore.setState({ canUndo: true })
    render(<Toolbar />)
    expect(screen.getByTestId('undo-btn')).not.toBeDisabled()
  })

  it('shows "Add Object" dropdown in edit view', () => {
    render(<Toolbar />)
    expect(screen.getByText('Add Object')).toBeInTheDocument()
  })

  it('shows snap to grid button in edit view', () => {
    render(<Toolbar />)
    expect(screen.getByLabelText('Snap to grid')).toBeInTheDocument()
  })

  it('toggles snap to grid on click', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByLabelText('Snap to grid'))
    expect(useUIStore.getState().snapToGrid).toBe(false)
  })

  it('shows export dropdown', () => {
    render(<Toolbar />)
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('shows Project dropdown on desktop', () => {
    render(<Toolbar />)
    expect(screen.getByText('Project')).toBeInTheDocument()
  })

  it('opens add object dropdown and shows registered kinds', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByText('Add Object'))
    // Built-in kinds: Baseplate, Bin
    expect(screen.getByText('Baseplate')).toBeInTheDocument()
    expect(screen.getByText('Bin')).toBeInTheDocument()
  })

  it('adds object and selects it when kind clicked', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByText('Add Object'))
    await user.click(screen.getByText('Bin'))
    const objects = useProjectStore.getState().objects
    expect(objects).toHaveLength(1)
    expect(objects[0].kind).toBe('bin')
    expect(useUIStore.getState().selectedObjectIds).toContain(objects[0].id)
  })
})
