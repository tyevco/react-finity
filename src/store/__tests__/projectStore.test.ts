import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '../projectStore'

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useProjectStore.setState({ objects: [] })
  })

  it('starts with empty objects array', () => {
    expect(useProjectStore.getState().objects).toEqual([])
  })

  it('adds a baseplate object', () => {
    const id = useProjectStore.getState().addObject('baseplate')
    const { objects } = useProjectStore.getState()

    expect(objects).toHaveLength(1)
    expect(objects[0].id).toBe(id)
    expect(objects[0].kind).toBe('baseplate')
    expect(objects[0].params).toEqual({
      gridWidth: 3,
      gridDepth: 3,
      magnetHoles: true,
      screwHoles: false,
    })
  })

  it('removes an object by id', () => {
    const id = useProjectStore.getState().addObject('baseplate')
    expect(useProjectStore.getState().objects).toHaveLength(1)

    useProjectStore.getState().removeObject(id)
    expect(useProjectStore.getState().objects).toHaveLength(0)
  })

  it('updates object params', () => {
    const id = useProjectStore.getState().addObject('baseplate')
    useProjectStore.getState().updateObjectParams(id, { gridWidth: 5 })

    const obj = useProjectStore.getState().objects[0]
    expect(obj.params).toMatchObject({ gridWidth: 5 })
  })

  it('updates object position', () => {
    const id = useProjectStore.getState().addObject('baseplate')
    useProjectStore.getState().updateObjectPosition(id, [42, 0, 42])

    const obj = useProjectStore.getState().objects[0]
    expect(obj.position).toEqual([42, 0, 42])
  })

  it('updates object name', () => {
    const id = useProjectStore.getState().addObject('baseplate')
    useProjectStore.getState().updateObjectName(id, 'My Baseplate')

    const obj = useProjectStore.getState().objects[0]
    expect(obj.name).toBe('My Baseplate')
  })

  it('clears all objects', () => {
    useProjectStore.getState().addObject('baseplate')
    useProjectStore.getState().addObject('baseplate')
    expect(useProjectStore.getState().objects).toHaveLength(2)

    useProjectStore.getState().clearObjects()
    expect(useProjectStore.getState().objects).toHaveLength(0)
  })
})
