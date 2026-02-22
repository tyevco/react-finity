import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore, resetObjectCounter } from '../projectStore'

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useProjectStore.setState({ objects: [], modifiers: [] })
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

  it('clears modifiers when clearing objects', () => {
    const binId = useProjectStore.getState().addObject('bin')
    useProjectStore.getState().addModifier(binId, 'dividerGrid')
    expect(useProjectStore.getState().modifiers).toHaveLength(1)

    useProjectStore.getState().clearObjects()
    expect(useProjectStore.getState().modifiers).toHaveLength(0)
  })

  it('adds a bin object with innerFillet default', () => {
    const id = useProjectStore.getState().addObject('bin')
    const obj = useProjectStore.getState().objects[0]

    expect(obj.id).toBe(id)
    expect(obj.kind).toBe('bin')
    expect(obj.params).toMatchObject({ innerFillet: 0 })
  })
})

describe('modifier CRUD', () => {
  beforeEach(() => {
    useProjectStore.setState({ objects: [], modifiers: [] })
  })

  it('addModifier creates a dividerGrid modifier with correct defaults', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const modId = useProjectStore.getState().addModifier(binId, 'dividerGrid')
    const { modifiers } = useProjectStore.getState()

    expect(modifiers).toHaveLength(1)
    expect(modifiers[0].id).toBe(modId)
    expect(modifiers[0].parentId).toBe(binId)
    expect(modifiers[0].kind).toBe('dividerGrid')
    expect(modifiers[0].params).toEqual({
      dividersX: 1,
      dividersY: 1,
      wallThickness: 1.2,
    })
  })

  it('addModifier creates a labelTab modifier with correct defaults', () => {
    const binId = useProjectStore.getState().addObject('bin')
    useProjectStore.getState().addModifier(binId, 'labelTab')
    const { modifiers } = useProjectStore.getState()

    expect(modifiers[0].kind).toBe('labelTab')
    expect(modifiers[0].params).toEqual({
      wall: 'front',
      angle: 45,
      height: 7,
    })
  })

  it('addModifier creates a scoop modifier with correct defaults', () => {
    const binId = useProjectStore.getState().addObject('bin')
    useProjectStore.getState().addModifier(binId, 'scoop')
    const { modifiers } = useProjectStore.getState()

    expect(modifiers[0].kind).toBe('scoop')
    expect(modifiers[0].params).toEqual({
      wall: 'front',
      radius: 0,
    })
  })

  it('addModifier creates an insert modifier with correct defaults', () => {
    const binId = useProjectStore.getState().addObject('bin')
    useProjectStore.getState().addModifier(binId, 'insert')
    const { modifiers } = useProjectStore.getState()

    expect(modifiers[0].kind).toBe('insert')
    expect(modifiers[0].params).toEqual({
      compartmentsX: 2,
      compartmentsY: 2,
      wallThickness: 1.2,
    })
  })

  it('addModifier creates a lid modifier with correct defaults', () => {
    const binId = useProjectStore.getState().addObject('bin')
    useProjectStore.getState().addModifier(binId, 'lid')
    const { modifiers } = useProjectStore.getState()

    expect(modifiers[0].kind).toBe('lid')
    expect(modifiers[0].params).toEqual({
      stacking: false,
    })
  })

  it('updateModifierParams merges params correctly', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const modId = useProjectStore.getState().addModifier(binId, 'dividerGrid')

    useProjectStore.getState().updateModifierParams(modId, { dividersX: 5 })

    const mod = useProjectStore.getState().modifiers[0]
    expect(mod.params).toEqual({
      dividersX: 5,
      dividersY: 1,
      wallThickness: 1.2,
    })
  })

  it('removeModifier removes by ID', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const modId = useProjectStore.getState().addModifier(binId, 'dividerGrid')
    expect(useProjectStore.getState().modifiers).toHaveLength(1)

    useProjectStore.getState().removeModifier(modId)
    expect(useProjectStore.getState().modifiers).toHaveLength(0)
  })

  it('removeModifier cascade-deletes child modifiers', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const insertId = useProjectStore.getState().addModifier(binId, 'insert')
    useProjectStore.getState().addModifier(insertId, 'scoop')
    useProjectStore.getState().addModifier(insertId, 'labelTab')
    expect(useProjectStore.getState().modifiers).toHaveLength(3)

    useProjectStore.getState().removeModifier(insertId)
    expect(useProjectStore.getState().modifiers).toHaveLength(0)
  })

  it('removeModifier cascade-deletes grandchild modifiers', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const insertId = useProjectStore.getState().addModifier(binId, 'insert')
    const divId = useProjectStore.getState().addModifier(insertId, 'dividerGrid')
    useProjectStore.getState().addModifier(divId, 'scoop')
    expect(useProjectStore.getState().modifiers).toHaveLength(3)

    useProjectStore.getState().removeModifier(insertId)
    expect(useProjectStore.getState().modifiers).toHaveLength(0)
  })

  it('removeObject cascade-deletes all modifiers in subtree', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const insertId = useProjectStore.getState().addModifier(binId, 'insert')
    useProjectStore.getState().addModifier(insertId, 'scoop')
    useProjectStore.getState().addModifier(binId, 'lid')
    expect(useProjectStore.getState().modifiers).toHaveLength(3)

    useProjectStore.getState().removeObject(binId)
    expect(useProjectStore.getState().objects).toHaveLength(0)
    expect(useProjectStore.getState().modifiers).toHaveLength(0)
  })

  it('getModifiersForParent returns only direct children', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const insertId = useProjectStore.getState().addModifier(binId, 'insert')
    useProjectStore.getState().addModifier(insertId, 'scoop')
    useProjectStore.getState().addModifier(binId, 'lid')

    const binMods = useProjectStore.getState().getModifiersForParent(binId)
    expect(binMods).toHaveLength(2)
    expect(binMods.map((m) => m.kind).sort()).toEqual(['insert', 'lid'])

    const insertMods = useProjectStore.getState().getModifiersForParent(insertId)
    expect(insertMods).toHaveLength(1)
    expect(insertMods[0].kind).toBe('scoop')
  })

  it('getRootObjectId walks up parent chain correctly', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const insertId = useProjectStore.getState().addModifier(binId, 'insert')
    const scoopId = useProjectStore.getState().addModifier(insertId, 'scoop')

    expect(useProjectStore.getState().getRootObjectId(insertId)).toBe(binId)
    expect(useProjectStore.getState().getRootObjectId(scoopId)).toBe(binId)
  })

  it('addModifier with parentId pointing to another modifier works', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const divId = useProjectStore.getState().addModifier(binId, 'dividerGrid')
    const labelId = useProjectStore.getState().addModifier(divId, 'labelTab')

    const mod = useProjectStore.getState().modifiers.find((m) => m.id === labelId)
    expect(mod).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(mod!.parentId).toBe(divId)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(mod!.kind).toBe('labelTab')
  })

  it('multiple modifiers on same parent all returned correctly', () => {
    const binId = useProjectStore.getState().addObject('bin')
    useProjectStore.getState().addModifier(binId, 'dividerGrid')
    useProjectStore.getState().addModifier(binId, 'scoop')
    useProjectStore.getState().addModifier(binId, 'labelTab')
    useProjectStore.getState().addModifier(binId, 'lid')

    const mods = useProjectStore.getState().getModifiersForParent(binId)
    expect(mods).toHaveLength(4)
  })

  it('getModifierContext returns context for bin parent', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const context = useProjectStore.getState().getModifierContext(binId)

    expect(context).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(context!.innerWidth).toBeGreaterThan(0)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(context!.innerDepth).toBeGreaterThan(0)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(context!.wallHeight).toBeGreaterThan(0)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(context!.floorY).toBeGreaterThan(0)
  })

  it('getModifierContext returns null for unknown parent', () => {
    const context = useProjectStore.getState().getModifierContext('nonexistent-id')
    expect(context).toBeNull()
  })

  it('loads project data with objects and modifiers', () => {
    const data = {
      objects: [
        {
          kind: 'bin' as const,
          id: 'test-bin-1',
          name: 'Bin 5',
          position: [0, 0, 0] as [number, number, number],
          params: {
            gridWidth: 2,
            gridDepth: 2,
            heightUnits: 4,
            stackingLip: true,
            wallThickness: 1.2,
            innerFillet: 0,
          },
        },
      ],
      modifiers: [
        {
          kind: 'dividerGrid' as const,
          id: 'test-div-1',
          parentId: 'test-bin-1',
          params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
        },
      ],
    }

    useProjectStore.getState().loadProjectData(data)
    const state = useProjectStore.getState()
    expect(state.objects).toHaveLength(1)
    expect(state.objects[0].id).toBe('test-bin-1')
    expect(state.modifiers).toHaveLength(1)
    expect(state.modifiers[0].id).toBe('test-div-1')
  })

  it('resets object counter after loading project data', () => {
    const data = {
      objects: [
        {
          kind: 'bin' as const,
          id: 'b1',
          name: 'Bin 7',
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
        {
          kind: 'baseplate' as const,
          id: 'bp1',
          name: 'Baseplate 3',
          position: [0, 0, 0] as [number, number, number],
          params: {
            gridWidth: 3,
            gridDepth: 3,
            magnetHoles: true,
            screwHoles: false,
          },
        },
      ],
      modifiers: [],
    }

    useProjectStore.getState().loadProjectData(data)

    // Next object should get counter > 7 (the max in loaded data)
    const id = useProjectStore.getState().addObject('bin')
    const newObj = useProjectStore.getState().objects.find((o) => o.id === id)
    expect(newObj).toBeDefined()
    const nameNum = parseInt(/\d+$/.exec(newObj!.name)?.[0] ?? '0', 10) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(nameNum).toBe(8)
  })

  it('resetObjectCounter finds max from mixed names', () => {
    resetObjectCounter([
      {
        kind: 'bin',
        id: '1',
        name: 'Bin 10',
        position: [0, 0, 0],
        params: {
          gridWidth: 1,
          gridDepth: 1,
          heightUnits: 3,
          stackingLip: true,
          wallThickness: 1.2,
          innerFillet: 0,
        },
      },
      {
        kind: 'baseplate',
        id: '2',
        name: 'Custom Name',
        position: [0, 0, 0],
        params: { gridWidth: 3, gridDepth: 3, magnetHoles: true, screwHoles: false },
      },
      {
        kind: 'bin',
        id: '3',
        name: 'Bin 3',
        position: [0, 0, 0],
        params: {
          gridWidth: 1,
          gridDepth: 1,
          heightUnits: 3,
          stackingLip: true,
          wallThickness: 1.2,
          innerFillet: 0,
        },
      },
    ])
    // After reset to 10, next addObject should produce counter 11
    const id = useProjectStore.getState().addObject('bin')
    const obj = useProjectStore.getState().objects.find((o) => o.id === id)
    expect(obj!.name).toMatch(/\d+$/) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const num = parseInt(/\d+$/.exec(obj!.name)?.[0] ?? '0', 10) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(num).toBe(11)
  })
})
