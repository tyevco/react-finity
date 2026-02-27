import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest'
import { useHistoryStore } from '../historyStore'
import { useProjectStore } from '../projectStore'
import { useProjectManagerStore, setIsLoadingProject } from '../projectManagerStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'

// Mock localStorage so projectManagerStore's persist middleware has a backing store
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

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

beforeAll(() => {
  registerBuiltinKinds()
})

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear()
    useProjectStore.setState({ objects: [], modifiers: [] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('has correct default values', () => {
    const state = useHistoryStore.getState()
    expect(state.past).toEqual([])
    expect(state.future).toEqual([])
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
  })

  it('pushes a snapshot to past', () => {
    useHistoryStore.getState().pushSnapshot({
      objects: [],
      modifiers: [],
    })

    const state = useHistoryStore.getState()
    expect(state.past).toHaveLength(1)
    expect(state.canUndo).toBe(true)
    expect(state.canRedo).toBe(false)
  })

  it('clears future when pushing new snapshot', () => {
    useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })
    useHistoryStore.setState({ future: [{ objects: [], modifiers: [] }], canRedo: true })

    useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })

    expect(useHistoryStore.getState().future).toEqual([])
    expect(useHistoryStore.getState().canRedo).toBe(false)
  })

  it('enforces max history limit', () => {
    for (let i = 0; i < 60; i++) {
      useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })
    }

    expect(useHistoryStore.getState().past.length).toBeLessThanOrEqual(50)
  })

  it('undo restores previous state to projectStore', () => {
    const prevObjects = [
      {
        kind: 'bin' as const,
        id: 'bin-1',
        name: 'Bin 1',
        position: [0, 0, 0] as [number, number, number],
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
      },
    ]

    // Push a snapshot of the "before" state
    useHistoryStore.getState().pushSnapshot({
      objects: prevObjects,
      modifiers: [],
    })

    // Current state has no objects (simulates after a delete)
    useProjectStore.setState({ objects: [], modifiers: [] })

    // Undo should restore prevObjects
    useHistoryStore.getState().undo()

    const projectState = useProjectStore.getState()
    expect(projectState.objects).toEqual(prevObjects)
    expect(useHistoryStore.getState().canRedo).toBe(true)
  })

  it('redo restores forward state', () => {
    const objects1 = [
      {
        kind: 'bin' as const,
        id: 'bin-1',
        name: 'Bin 1',
        position: [0, 0, 0] as [number, number, number],
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
      },
    ]

    useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })
    useProjectStore.setState({ objects: objects1, modifiers: [] })

    useHistoryStore.getState().undo()
    expect(useProjectStore.getState().objects).toEqual([])

    useHistoryStore.getState().redo()
    expect(useProjectStore.getState().objects).toEqual(objects1)
    expect(useHistoryStore.getState().canUndo).toBe(true)
    expect(useHistoryStore.getState().canRedo).toBe(false)
  })

  it('undo does nothing when nothing to undo', () => {
    useProjectStore.setState({ objects: [], modifiers: [] })
    useHistoryStore.getState().undo()

    expect(useProjectStore.getState().objects).toEqual([])
    expect(useHistoryStore.getState().canUndo).toBe(false)
  })

  it('redo does nothing when nothing to redo', () => {
    useProjectStore.setState({ objects: [], modifiers: [] })
    useHistoryStore.getState().redo()

    expect(useProjectStore.getState().objects).toEqual([])
    expect(useHistoryStore.getState().canRedo).toBe(false)
  })

  it('clear resets all history', () => {
    useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })
    useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })

    useHistoryStore.getState().clear()

    const state = useHistoryStore.getState()
    expect(state.past).toEqual([])
    expect(state.future).toEqual([])
    expect(state.canUndo).toBe(false)
    expect(state.canRedo).toBe(false)
  })
})

describe('debounced subscription', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useHistoryStore.getState().clear()
    // Reset project state. This triggers the subscription and may arm a
    // pending debounce timer. Drain it immediately so each test starts clean.
    useProjectStore.setState({ objects: [], modifiers: [] })
    vi.advanceTimersByTime(300)
    useHistoryStore.getState().clear()
    setIsLoadingProject(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    setIsLoadingProject(false)
  })

  it('auto-pushes snapshot when projectStore objects change', () => {
    const newObjects = [
      {
        kind: 'bin' as const,
        id: 'bin-1',
        name: 'Bin 1',
        position: [0, 0, 0] as [number, number, number],
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
      },
    ]

    // Trigger the subscription by setting a new objects reference
    useProjectStore.setState({ objects: newObjects, modifiers: [] })

    // No snapshot yet — debounce has not fired
    expect(useHistoryStore.getState().past).toHaveLength(0)

    // Advance past the 300ms debounce window
    vi.advanceTimersByTime(300)

    expect(useHistoryStore.getState().past).toHaveLength(1)
    expect(useHistoryStore.getState().canUndo).toBe(true)
  })

  it('does not push snapshot when isLoadingProject is true', () => {
    setIsLoadingProject(true)

    useProjectStore.setState({
      objects: [
        {
          kind: 'bin' as const,
          id: 'bin-2',
          name: 'Bin 2',
          position: [0, 0, 0] as [number, number, number],
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
        },
      ],
      modifiers: [],
    })

    vi.advanceTimersByTime(300)

    expect(useHistoryStore.getState().past).toHaveLength(0)
    expect(useHistoryStore.getState().canUndo).toBe(false)
  })

  it('captures pre-change state as snapshot', () => {
    const initialObjects = [
      {
        kind: 'bin' as const,
        id: 'bin-initial',
        name: 'Initial Bin',
        position: [0, 0, 0] as [number, number, number],
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
      },
    ]

    const updatedObjects = [
      {
        kind: 'bin' as const,
        id: 'bin-updated',
        name: 'Updated Bin',
        position: [42, 0, 0] as [number, number, number],
        params: {
          gridWidth: 2,
          gridDepth: 2,
          heightUnits: 6,
          stackingLip: false,
          wallThickness: 1.2,
          innerFillet: 0,
          magnetHoles: false,
          weightHoles: false,
          honeycombBase: false,
        },
      },
    ]

    // Establish the initial state, then drain the resulting debounce so the
    // snapshot for this setup call does not interfere with the assertion below
    useProjectStore.setState({ objects: initialObjects, modifiers: [] })
    vi.advanceTimersByTime(300)
    useHistoryStore.getState().clear()

    // Now change to updated state — the subscription should capture initialObjects
    useProjectStore.setState({ objects: updatedObjects, modifiers: [] })

    vi.advanceTimersByTime(300)

    const snapshot = useHistoryStore.getState().past[0]
    expect(snapshot).toBeDefined()
    // The snapshot holds the pre-change (initialObjects) state, not the updated state
    expect(snapshot.objects).toEqual(initialObjects)
    expect(snapshot.objects).not.toEqual(updatedObjects)
  })

  it('coalesces multiple rapid changes into a single snapshot', () => {
    const makeObjects = (id: string) => [
      {
        kind: 'bin' as const,
        id,
        name: `Bin ${id}`,
        position: [0, 0, 0] as [number, number, number],
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
      },
    ]

    // Set a stable baseline, drain its debounce, then clear so the burst
    // below starts from a known pre-burst state
    const baselineObjects = makeObjects('bin-baseline')
    useProjectStore.setState({ objects: baselineObjects, modifiers: [] })
    vi.advanceTimersByTime(300)
    useHistoryStore.getState().clear()

    // Burst of rapid changes — the subscription should coalesce them
    useProjectStore.setState({ objects: makeObjects('bin-a'), modifiers: [] })

    vi.advanceTimersByTime(150)
    useProjectStore.setState({ objects: makeObjects('bin-b'), modifiers: [] })

    vi.advanceTimersByTime(150)
    useProjectStore.setState({ objects: makeObjects('bin-c'), modifiers: [] })

    // Still within debounce window — no snapshot yet
    expect(useHistoryStore.getState().past).toHaveLength(0)

    vi.advanceTimersByTime(300)

    // Only one snapshot should have been pushed for the entire burst
    expect(useHistoryStore.getState().past).toHaveLength(1)
    // The snapshot captures the state before the burst began (baselineObjects)
    expect(useHistoryStore.getState().past[0].objects).toEqual(baselineObjects)
  })
})

describe('project change clearing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useHistoryStore.getState().clear()
    // Resetting projectStore state triggers the subscription and may arm a
    // pending debounce timer. Drain it immediately so each test starts clean.
    useProjectStore.setState({ objects: [], modifiers: [] })
    vi.advanceTimersByTime(300)
    useHistoryStore.getState().clear()
    localStorageMock.clear()
    useProjectManagerStore.setState({
      currentProjectId: null,
      currentProjectName: 'Untitled Project',
      isDirty: false,
      projects: [],
    })
    setIsLoadingProject(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    setIsLoadingProject(false)
  })

  it('clears history when currentProjectId changes from non-null', () => {
    // Push some snapshots to populate history
    useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })
    useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })
    expect(useHistoryStore.getState().past).toHaveLength(2)

    // Simulate switching from one project to another
    useProjectManagerStore.setState({ currentProjectId: 'proj-1' })
    useProjectManagerStore.setState({ currentProjectId: 'proj-2' })

    expect(useHistoryStore.getState().past).toHaveLength(0)
    expect(useHistoryStore.getState().canUndo).toBe(false)
  })

  it('does not clear history when currentProjectId changes from null', () => {
    // Push snapshots
    useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })
    useHistoryStore.getState().pushSnapshot({ objects: [], modifiers: [] })
    expect(useHistoryStore.getState().past).toHaveLength(2)

    // Simulate the initial auto-save that assigns the first project ID from null
    useProjectManagerStore.setState({ currentProjectId: null })
    useProjectManagerStore.setState({ currentProjectId: 'proj-first' })

    // History must remain intact — this transition is not a project switch
    expect(useHistoryStore.getState().past).toHaveLength(2)
    expect(useHistoryStore.getState().canUndo).toBe(true)
  })

  it('cancels a pending debounce when project changes', () => {
    // Trigger a projectStore change to arm the debounce timer
    useProjectStore.setState({
      objects: [
        {
          kind: 'bin' as const,
          id: 'bin-pending',
          name: 'Pending Bin',
          position: [0, 0, 0] as [number, number, number],
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
        },
      ],
      modifiers: [],
    })

    // The debounce is now pending — switch projects before it fires
    useProjectManagerStore.setState({ currentProjectId: 'proj-a' })
    useProjectManagerStore.setState({ currentProjectId: 'proj-b' })

    // Advance past debounce window — the cancelled timer must NOT push a snapshot
    vi.advanceTimersByTime(300)

    expect(useHistoryStore.getState().past).toHaveLength(0)
    expect(useHistoryStore.getState().canUndo).toBe(false)
  })
})
