import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useHistoryStore } from '../historyStore'
import { useProjectStore } from '../projectStore'

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
