import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest'
import { useProjectManagerStore } from '../projectManagerStore'
import { useProjectStore } from '../projectStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'

beforeAll(() => {
  registerBuiltinKinds()
})

// Mock localStorage
const localStorageMock = (() => {
  let store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store = new Map()
    },
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('projectManagerStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorageMock.clear()
    useProjectStore.setState({ objects: [], modifiers: [] })
    useProjectManagerStore.setState({
      currentProjectId: null,
      currentProjectName: 'Untitled Project',
      isDirty: false,
      projects: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty state', () => {
    const state = useProjectManagerStore.getState()
    expect(state.currentProjectId).toBeNull()
    expect(state.currentProjectName).toBe('Untitled Project')
    expect(state.isDirty).toBe(false)
    expect(state.projects).toEqual([])
  })

  it('saves a new project', () => {
    // Add an object to projectStore
    useProjectStore.getState().addObject('bin')

    useProjectManagerStore.getState().saveProject()

    const state = useProjectManagerStore.getState()
    expect(state.currentProjectId).not.toBeNull()
    expect(state.isDirty).toBe(false)
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0].name).toBe('Untitled Project')

    // Verify localStorage has the data
    const raw = localStorageMock.getItem(`react-finity-project-${state.currentProjectId}`)
    expect(raw).not.toBeNull()
    const data = JSON.parse(raw!) as { objects: unknown[] } // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(data.objects).toHaveLength(1)
  })

  it('saves as a new project with given name', () => {
    useProjectStore.getState().addObject('baseplate')

    useProjectManagerStore.getState().saveProjectAs('My Cool Project')

    const state = useProjectManagerStore.getState()
    expect(state.currentProjectName).toBe('My Cool Project')
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0].name).toBe('My Cool Project')
  })

  it('loads a saved project', () => {
    // Save a project first
    useProjectStore.getState().addObject('bin')
    useProjectManagerStore.getState().saveProjectAs('Test Project')

    const savedId = useProjectManagerStore.getState().currentProjectId! // eslint-disable-line @typescript-eslint/no-non-null-assertion

    // Clear project store to simulate a new project
    useProjectStore.setState({ objects: [], modifiers: [] })
    useProjectManagerStore.setState({
      currentProjectId: null,
      currentProjectName: 'Other Project',
    })

    // Load the saved project
    useProjectManagerStore.getState().loadProject(savedId)

    const state = useProjectManagerStore.getState()
    expect(state.currentProjectId).toBe(savedId)
    expect(state.currentProjectName).toBe('Test Project')
    expect(state.isDirty).toBe(false)

    // Verify projectStore was populated
    expect(useProjectStore.getState().objects).toHaveLength(1)
  })

  it('creates a new project', () => {
    // Save a project and add objects
    useProjectStore.getState().addObject('bin')
    useProjectManagerStore.getState().saveProject()

    // Create new project
    useProjectManagerStore.getState().newProject()

    const state = useProjectManagerStore.getState()
    expect(state.currentProjectId).toBeNull()
    expect(state.currentProjectName).toBe('Untitled Project')
    expect(state.isDirty).toBe(false)
    expect(useProjectStore.getState().objects).toEqual([])
    expect(useProjectStore.getState().modifiers).toEqual([])
  })

  it('renames a project', () => {
    useProjectManagerStore.getState().saveProjectAs('Original Name')
    const id = useProjectManagerStore.getState().currentProjectId! // eslint-disable-line @typescript-eslint/no-non-null-assertion

    useProjectManagerStore.getState().renameProject(id, 'New Name')

    const state = useProjectManagerStore.getState()
    expect(state.currentProjectName).toBe('New Name')
    expect(state.projects[0].name).toBe('New Name')
  })

  it('deletes a non-current project', () => {
    // Create two projects
    useProjectManagerStore.getState().saveProjectAs('Project 1')
    const id1 = useProjectManagerStore.getState().currentProjectId! // eslint-disable-line @typescript-eslint/no-non-null-assertion

    useProjectManagerStore.getState().saveProjectAs('Project 2')

    expect(useProjectManagerStore.getState().projects).toHaveLength(2)

    // Delete the first project (not currently active)
    useProjectManagerStore.getState().deleteProject(id1)

    const state = useProjectManagerStore.getState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0].name).toBe('Project 2')
    expect(state.currentProjectName).toBe('Project 2')
  })

  it('deletes the current project and creates a new one', () => {
    useProjectStore.getState().addObject('bin')
    useProjectManagerStore.getState().saveProjectAs('To Delete')
    const id = useProjectManagerStore.getState().currentProjectId! // eslint-disable-line @typescript-eslint/no-non-null-assertion

    useProjectManagerStore.getState().deleteProject(id)

    const state = useProjectManagerStore.getState()
    expect(state.currentProjectId).toBeNull()
    expect(state.currentProjectName).toBe('Untitled Project')
    expect(state.projects).toHaveLength(0)
    expect(useProjectStore.getState().objects).toEqual([])
  })

  it('marks dirty and auto-saves after debounce', () => {
    useProjectStore.getState().addObject('bin')
    useProjectManagerStore.getState().saveProject()

    const projectId = useProjectManagerStore.getState().currentProjectId! // eslint-disable-line @typescript-eslint/no-non-null-assertion

    // Manually mark dirty
    useProjectManagerStore.getState().markDirty()
    expect(useProjectManagerStore.getState().isDirty).toBe(true)

    // Before timer fires, should still be dirty
    vi.advanceTimersByTime(1000)
    expect(useProjectManagerStore.getState().isDirty).toBe(true)

    // After 2s debounce, auto-save should fire
    vi.advanceTimersByTime(1500)
    expect(useProjectManagerStore.getState().isDirty).toBe(false)

    // Data should be persisted
    const raw = localStorageMock.getItem(`react-finity-project-${projectId}`)
    expect(raw).not.toBeNull()
  })

  it('debounce resets on subsequent markDirty calls', () => {
    useProjectStore.getState().addObject('bin')
    useProjectManagerStore.getState().saveProject()

    useProjectManagerStore.getState().markDirty()

    // Wait 1.5s then mark dirty again
    vi.advanceTimersByTime(1500)
    expect(useProjectManagerStore.getState().isDirty).toBe(true)

    useProjectManagerStore.getState().markDirty()

    // 1.5s later, should still be dirty (debounce reset)
    vi.advanceTimersByTime(1500)
    expect(useProjectManagerStore.getState().isDirty).toBe(true)

    // 0.5s more (total 2s from last markDirty), should be saved
    vi.advanceTimersByTime(500)
    expect(useProjectManagerStore.getState().isDirty).toBe(false)
  })

  it('saves project updates updatedAt timestamp', () => {
    useProjectManagerStore.getState().saveProjectAs('Timestamp Test')
    const firstSave = useProjectManagerStore.getState().projects[0].updatedAt

    // Wait a bit and save again
    vi.advanceTimersByTime(5000)
    useProjectManagerStore.getState().saveProject()
    const secondSave = useProjectManagerStore.getState().projects[0].updatedAt

    expect(new Date(secondSave).getTime()).toBeGreaterThanOrEqual(new Date(firstSave).getTime())
  })

  it('handles loading nonexistent project gracefully', () => {
    useProjectManagerStore.getState().loadProject('nonexistent-id')

    // State should be unchanged
    expect(useProjectManagerStore.getState().currentProjectId).toBeNull()
    expect(useProjectStore.getState().objects).toEqual([])
  })

  it('filters out malformed objects when loading project data', () => {
    // Write corrupted data directly to localStorage
    const projectId = 'test-corrupted'
    const corruptedData = {
      objects: [
        {
          kind: 'bin',
          id: 'valid-obj',
          name: 'Valid Bin',
          position: [0, 0, 0],
          params: {
            gridWidth: 1,
            gridDepth: 1,
            heightUnits: 3,
            stackingLip: false,
            wallThickness: 1.2,
            innerFillet: 0,
            magnetHoles: false,
            weightHoles: false,
            honeycombBase: false,
          },
        },
        { broken: true }, // missing id, kind, params
        'not-an-object', // entirely wrong type
      ],
      modifiers: [
        {
          id: 'valid-mod',
          parentId: 'valid-obj',
          kind: 'dividerGrid',
          params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
        },
        { id: 'bad-mod' }, // missing parentId, kind, params
      ],
    }
    localStorageMock.setItem(`react-finity-project-${projectId}`, JSON.stringify(corruptedData))

    // Register the project in the store
    useProjectManagerStore.setState({
      currentProjectId: null,
      projects: [{ id: projectId, name: 'Corrupted', createdAt: '', updatedAt: '' }],
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    useProjectManagerStore.getState().loadProject(projectId)

    // Should only load valid entries
    expect(useProjectStore.getState().objects).toHaveLength(1)
    expect(useProjectStore.getState().objects[0].id).toBe('valid-obj')
    expect(useProjectStore.getState().modifiers).toHaveLength(1)
    expect(useProjectStore.getState().modifiers[0].id).toBe('valid-mod')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
