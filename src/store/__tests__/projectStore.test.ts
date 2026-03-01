import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { useProjectStore, resetObjectCounter } from '../projectStore'
import { useProfileStore } from '../profileStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import { PROFILE_TIGHT_FIT, PROFILE_OFFICIAL } from '@/engine/constants'

beforeAll(() => {
  registerBuiltinKinds()
})

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
      slim: false,
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

  it('updates object rotation', () => {
    const id = useProjectStore.getState().addObject('baseplate')
    const rotation: [number, number, number] = [-Math.PI / 2, 0, 0]
    useProjectStore.getState().updateObjectRotation(id, rotation)

    const obj = useProjectStore.getState().objects[0]
    expect(obj.rotation).toEqual(rotation)
  })

  it('rotation persists through load/save cycle', () => {
    const id = useProjectStore.getState().addObject('bin')
    const rotation: [number, number, number] = [-Math.PI / 2, 0, 0]
    useProjectStore.getState().updateObjectRotation(id, rotation)

    const state = useProjectStore.getState()
    const data = { objects: state.objects, modifiers: state.modifiers }
    const serialized = JSON.parse(JSON.stringify(data)) as typeof data

    useProjectStore.getState().loadProjectData(serialized)
    const loaded = useProjectStore.getState().objects.find((o) => o.id === id)
    expect(loaded).toBeDefined()
    expect(loaded!.rotation).toEqual(rotation) // eslint-disable-line @typescript-eslint/no-non-null-assertion
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

  it('adds a bin object with correct defaults', () => {
    const id = useProjectStore.getState().addObject('bin')
    const obj = useProjectStore.getState().objects[0]

    expect(obj.id).toBe(id)
    expect(obj.kind).toBe('bin')
    expect(obj.params).toMatchObject({
      innerFillet: 0,
      magnetHoles: false,
      weightHoles: false,
      honeycombBase: false,
    })
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

  it('getRootObjectId returns null for circular references', () => {
    // Manually inject a circular modifier chain
    useProjectStore.setState({
      objects: [],
      modifiers: [
        {
          id: 'mod-a',
          parentId: 'mod-b',
          kind: 'dividerGrid',
          params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
        },
        {
          id: 'mod-b',
          parentId: 'mod-a',
          kind: 'dividerGrid',
          params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
        },
      ] as never,
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const result = useProjectStore.getState().getRootObjectId('mod-a')
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      'Circular reference detected in modifier chain at:',
      expect.any(String),
    )
    warnSpy.mockRestore()
  })

  it('getRootObjectId returns null for unknown id', () => {
    expect(useProjectStore.getState().getRootObjectId('nonexistent')).toBeNull()
  })

  it('addModifier returns empty string for nonexistent parent', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const id = useProjectStore.getState().addModifier('nonexistent', 'dividerGrid')
    expect(id).toBe('')
    expect(useProjectStore.getState().modifiers).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
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

  it('getModifierContext returns null for circular modifier chain', () => {
    useProjectStore.setState({
      objects: [],
      modifiers: [
        {
          id: 'mod-a',
          parentId: 'mod-b',
          kind: 'dividerGrid',
          params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
        },
        {
          id: 'mod-b',
          parentId: 'mod-a',
          kind: 'dividerGrid',
          params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
        },
      ] as never,
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const result = useProjectStore.getState().getModifierContext('mod-a')
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      'Circular reference detected in modifier context chain at:',
      expect.any(String),
    )
    warnSpy.mockRestore()
  })

  it('getModifierContext uses active profile, not hardcoded Official', () => {
    // Switch to Tight Fit profile (tolerance 0.1 vs Official 0.25)
    useProfileStore.setState({ activeProfile: PROFILE_TIGHT_FIT, activeProfileKey: 'tightFit' })

    const binId = useProjectStore.getState().addObject('bin')
    const contextTight = useProjectStore.getState().getModifierContext(binId)

    // Switch to Official profile
    useProfileStore.setState({ activeProfile: PROFILE_OFFICIAL, activeProfileKey: 'official' })
    const contextOfficial = useProjectStore.getState().getModifierContext(binId)

    expect(contextTight).not.toBeNull()
    expect(contextOfficial).not.toBeNull()

    // Tight Fit has smaller tolerance (0.1 vs 0.25), so inner dimensions are larger
    expect(contextTight!.innerWidth).toBeGreaterThan(contextOfficial!.innerWidth) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(contextTight!.innerDepth).toBeGreaterThan(contextOfficial!.innerDepth) // eslint-disable-line @typescript-eslint/no-non-null-assertion

    // Restore default profile
    useProfileStore.setState({ activeProfile: PROFILE_OFFICIAL, activeProfileKey: 'official' })
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
            magnetHoles: false,
            weightHoles: false,
            honeycombBase: false,
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
            magnetHoles: false,
            weightHoles: false,
            honeycombBase: false,
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
            slim: false,
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
          magnetHoles: false,
          weightHoles: false,
          honeycombBase: false,
        },
      },
      {
        kind: 'baseplate',
        id: '2',
        name: 'Custom Name',
        position: [0, 0, 0],
        params: {
          gridWidth: 3,
          gridDepth: 3,
          slim: false,
          magnetHoles: true,
          screwHoles: false,
        },
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
          magnetHoles: false,
          weightHoles: false,
          honeycombBase: false,
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

  describe('removeObjects (batch)', () => {
    it('removes multiple objects and their modifiers in a single set call', () => {
      const bin1 = useProjectStore.getState().addObject('bin')
      const bin2 = useProjectStore.getState().addObject('bin')
      useProjectStore.getState().addModifier(bin1, 'dividerGrid')
      useProjectStore.getState().addModifier(bin2, 'scoop')
      expect(useProjectStore.getState().objects).toHaveLength(2)
      expect(useProjectStore.getState().modifiers).toHaveLength(2)

      useProjectStore.getState().removeObjects([bin1, bin2])
      expect(useProjectStore.getState().objects).toHaveLength(0)
      expect(useProjectStore.getState().modifiers).toHaveLength(0)
    })

    it('handles empty array gracefully', () => {
      useProjectStore.getState().addObject('bin')
      useProjectStore.getState().removeObjects([])
      expect(useProjectStore.getState().objects).toHaveLength(1)
    })

    it('removes cascade modifiers for all deleted objects', () => {
      const bin1 = useProjectStore.getState().addObject('bin')
      const bin2 = useProjectStore.getState().addObject('bin')
      const insert = useProjectStore.getState().addModifier(bin1, 'insert')
      useProjectStore.getState().addModifier(insert, 'scoop')
      useProjectStore.getState().addModifier(bin2, 'lid')
      expect(useProjectStore.getState().modifiers).toHaveLength(3)

      useProjectStore.getState().removeObjects([bin1, bin2])
      expect(useProjectStore.getState().modifiers).toHaveLength(0)
    })
  })

  describe('duplicateObjects', () => {
    it('duplicates a single object with new id and name', () => {
      resetObjectCounter([])
      const id = useProjectStore.getState().addObject('bin')
      const newIds = useProjectStore.getState().duplicateObjects([id])

      expect(newIds).toHaveLength(1)
      expect(newIds[0]).not.toBe(id)

      const { objects } = useProjectStore.getState()
      expect(objects).toHaveLength(2)

      const original = objects.find((o) => o.id === id)
      const duplicate = objects.find((o) => o.id === newIds[0])
      expect(original).toBeDefined()
      expect(duplicate).toBeDefined()
      expect(duplicate!.kind).toBe('bin') // eslint-disable-line @typescript-eslint/no-non-null-assertion
      expect(duplicate!.name).not.toBe(original!.name) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    })

    it('offsets duplicate position by 42 on x-axis', () => {
      const id = useProjectStore.getState().addObject('bin')
      const newIds = useProjectStore.getState().duplicateObjects([id])

      const { objects } = useProjectStore.getState()
      const original = objects.find((o) => o.id === id)
      const duplicate = objects.find((o) => o.id === newIds[0])
      expect(duplicate!.position[0]).toBe(original!.position[0] + 42) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    })

    it('deep-copies modifiers with new ids', () => {
      const objId = useProjectStore.getState().addObject('bin')
      const modId = useProjectStore.getState().addModifier(objId, 'dividerGrid')

      const newIds = useProjectStore.getState().duplicateObjects([objId])
      const { modifiers } = useProjectStore.getState()

      // Should have 2 modifiers (original + duplicate)
      expect(modifiers).toHaveLength(2)

      const originalMod = modifiers.find((m) => m.id === modId)
      const duplicateMod = modifiers.find((m) => m.parentId === newIds[0])

      expect(originalMod).toBeDefined()
      expect(duplicateMod).toBeDefined()
      expect(duplicateMod!.id).not.toBe(modId) // eslint-disable-line @typescript-eslint/no-non-null-assertion
      expect(duplicateMod!.kind).toBe('dividerGrid') // eslint-disable-line @typescript-eslint/no-non-null-assertion
    })

    it('duplicates multiple objects at once', () => {
      const id1 = useProjectStore.getState().addObject('bin')
      const id2 = useProjectStore.getState().addObject('baseplate')

      const newIds = useProjectStore.getState().duplicateObjects([id1, id2])

      expect(newIds).toHaveLength(2)
      expect(useProjectStore.getState().objects).toHaveLength(4)
    })

    it('skips non-existent object ids', () => {
      const id = useProjectStore.getState().addObject('bin')
      const newIds = useProjectStore.getState().duplicateObjects([id, 'nonexistent'])

      expect(newIds).toHaveLength(1)
      expect(useProjectStore.getState().objects).toHaveLength(2)
    })

    it('deep-copies 3-level modifier hierarchy with remapped parentIds', () => {
      const binId = useProjectStore.getState().addObject('bin')
      const insertId = useProjectStore.getState().addModifier(binId, 'insert')
      const divId = useProjectStore.getState().addModifier(insertId, 'dividerGrid')
      useProjectStore.getState().addModifier(divId, 'scoop')

      expect(useProjectStore.getState().modifiers).toHaveLength(3)

      const newIds = useProjectStore.getState().duplicateObjects([binId])
      const { modifiers } = useProjectStore.getState()

      // Should have 6 modifiers total (3 original + 3 duplicated)
      expect(modifiers).toHaveLength(6)

      // Find the duplicated insert (child of new bin)
      const dupInsert = modifiers.find((m) => m.parentId === newIds[0] && m.kind === 'insert')
      expect(dupInsert).toBeDefined()

      // Find the duplicated dividerGrid (child of duplicated insert)
      const dupDiv = modifiers.find(
        (m) => m.parentId === dupInsert!.id && m.kind === 'dividerGrid', // eslint-disable-line @typescript-eslint/no-non-null-assertion
      )
      expect(dupDiv).toBeDefined()

      // Find the duplicated scoop (child of duplicated dividerGrid)
      const dupScoop = modifiers.find(
        (m) => m.parentId === dupDiv!.id && m.kind === 'scoop', // eslint-disable-line @typescript-eslint/no-non-null-assertion
      )
      expect(dupScoop).toBeDefined()

      // All duplicated IDs should be new (not matching originals)
      expect(dupInsert!.id).not.toBe(insertId) // eslint-disable-line @typescript-eslint/no-non-null-assertion
      expect(dupDiv!.id).not.toBe(divId) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    })
  })

  describe('reorderObject', () => {
    it('moves an object from one position to another', () => {
      resetObjectCounter([])
      const id1 = useProjectStore.getState().addObject('baseplate')
      const id2 = useProjectStore.getState().addObject('bin')
      const id3 = useProjectStore.getState().addObject('baseplate')

      useProjectStore.getState().reorderObject(0, 2)

      const { objects } = useProjectStore.getState()
      expect(objects[0].id).toBe(id2)
      expect(objects[1].id).toBe(id3)
      expect(objects[2].id).toBe(id1)
    })

    it('moves an object forward in the list', () => {
      resetObjectCounter([])
      const id1 = useProjectStore.getState().addObject('baseplate')
      const id2 = useProjectStore.getState().addObject('bin')
      const id3 = useProjectStore.getState().addObject('baseplate')

      useProjectStore.getState().reorderObject(2, 0)

      const { objects } = useProjectStore.getState()
      expect(objects[0].id).toBe(id3)
      expect(objects[1].id).toBe(id1)
      expect(objects[2].id).toBe(id2)
    })
  })

  describe('reorderModifier', () => {
    it('reorders modifiers within the same parent', () => {
      const objId = useProjectStore.getState().addObject('bin')
      const mod1 = useProjectStore.getState().addModifier(objId, 'dividerGrid')
      const mod2 = useProjectStore.getState().addModifier(objId, 'labelTab')
      const mod3 = useProjectStore.getState().addModifier(objId, 'scoop')

      useProjectStore.getState().reorderModifier(objId, 0, 2)

      const parentMods = useProjectStore.getState().modifiers.filter((m) => m.parentId === objId)
      expect(parentMods[0].id).toBe(mod2)
      expect(parentMods[1].id).toBe(mod3)
      expect(parentMods[2].id).toBe(mod1)
    })

    it('does not affect modifiers of other parents', () => {
      const obj1 = useProjectStore.getState().addObject('bin')
      const obj2 = useProjectStore.getState().addObject('bin')
      useProjectStore.getState().addModifier(obj1, 'dividerGrid')
      useProjectStore.getState().addModifier(obj1, 'labelTab')
      const otherMod = useProjectStore.getState().addModifier(obj2, 'scoop')

      useProjectStore.getState().reorderModifier(obj1, 0, 1)

      const obj2Mods = useProjectStore.getState().modifiers.filter((m) => m.parentId === obj2)
      expect(obj2Mods).toHaveLength(1)
      expect(obj2Mods[0].id).toBe(otherMod)
    })

    it('preserves relative ordering of interleaved non-sibling modifiers', () => {
      const obj1 = useProjectStore.getState().addObject('bin')
      const obj2 = useProjectStore.getState().addObject('bin')
      // Interleave: [A1, B1, A2, B2]
      const a1 = useProjectStore.getState().addModifier(obj1, 'dividerGrid')
      const b1 = useProjectStore.getState().addModifier(obj2, 'scoop')
      const a2 = useProjectStore.getState().addModifier(obj1, 'labelTab')
      const b2 = useProjectStore.getState().addModifier(obj2, 'lid')

      // Reorder obj1 modifiers: move A1 (index 0) to after A2 (index 1)
      useProjectStore.getState().reorderModifier(obj1, 0, 1)

      const allMods = useProjectStore.getState().modifiers
      // obj2 modifiers should still appear in their original positions relative to each other
      const obj2Indices = allMods
        .map((m, i) => (m.parentId === obj2 ? i : -1))
        .filter((i) => i >= 0)
      expect(allMods[obj2Indices[0]].id).toBe(b1)
      expect(allMods[obj2Indices[1]].id).toBe(b2)

      // obj1 modifiers should be reordered: A2 before A1
      const obj1Mods = allMods.filter((m) => m.parentId === obj1)
      expect(obj1Mods[0].id).toBe(a2)
      expect(obj1Mods[1].id).toBe(a1)
    })

    it('handles single-child reorder without losing the modifier', () => {
      const objId = useProjectStore.getState().addObject('bin')
      const modId = useProjectStore.getState().addModifier(objId, 'dividerGrid')

      // Only one modifier: reorder from 0 to 1 (toIndex out of bounds after removal)
      useProjectStore.getState().reorderModifier(objId, 0, 1)

      // The modifier should still exist
      const mods = useProjectStore.getState().modifiers.filter((m) => m.parentId === objId)
      expect(mods).toHaveLength(1)
      expect(mods[0].id).toBe(modId)
    })

    it('returns unchanged state when fromIndex equals toIndex', () => {
      const objId = useProjectStore.getState().addObject('bin')
      useProjectStore.getState().addModifier(objId, 'dividerGrid')
      useProjectStore.getState().addModifier(objId, 'labelTab')

      const before = useProjectStore.getState().modifiers
      useProjectStore.getState().reorderModifier(objId, 0, 0)
      const after = useProjectStore.getState().modifiers

      expect(after).toBe(before)
    })
  })

  it('deep-copies 3-level modifier hierarchy with remapped parentIds', () => {
    const binId = useProjectStore.getState().addObject('bin')
    const insertId = useProjectStore.getState().addModifier(binId, 'insert')
    const divId = useProjectStore.getState().addModifier(insertId, 'dividerGrid')
    useProjectStore.getState().addModifier(divId, 'scoop')

    // 3 modifiers before duplication
    expect(useProjectStore.getState().modifiers).toHaveLength(3)

    const newIds = useProjectStore.getState().duplicateObjects([binId])
    expect(newIds).toHaveLength(1)
    const newBinId = newIds[0]

    // Should now have 6 modifiers total (3 original + 3 duplicated)
    const allMods = useProjectStore.getState().modifiers
    expect(allMods).toHaveLength(6)

    // New bin's modifiers should chain correctly
    const newInsert = allMods.find((m) => m.parentId === newBinId && m.kind === 'insert')
    expect(newInsert).toBeDefined()
    const newDiv = allMods.find((m) => m.parentId === newInsert!.id && m.kind === 'dividerGrid') // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(newDiv).toBeDefined()
    const newScoop = allMods.find((m) => m.parentId === newDiv!.id && m.kind === 'scoop') // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(newScoop).toBeDefined()

    // None of the new IDs should match the originals
    expect(newInsert!.id).not.toBe(insertId) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(newDiv!.id).not.toBe(divId) // eslint-disable-line @typescript-eslint/no-non-null-assertion
  })

  describe('getModifierContext with modifier parent', () => {
    it('returns child context for modifier that subdivides space', () => {
      const binId = useProjectStore.getState().addObject('bin')
      const insertId = useProjectStore.getState().addModifier(binId, 'insert')

      // Get context using the insert modifier's ID as the parentId
      const context = useProjectStore.getState().getModifierContext(insertId)
      expect(context).not.toBeNull()

      // Insert subdivides space, so the context should have smaller dimensions
      // than the bin's own modifier context
      const binContext = useProjectStore.getState().getModifierContext(binId)
      expect(context!.innerWidth).toBeLessThan(binContext!.innerWidth) // eslint-disable-line @typescript-eslint/no-non-null-assertion
      expect(context!.innerDepth).toBeLessThan(binContext!.innerDepth) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    })

    it('returns parent context for modifier that does not subdivide space', () => {
      const binId = useProjectStore.getState().addObject('bin')
      const scoopId = useProjectStore.getState().addModifier(binId, 'scoop')

      // Scoop does not subdivide space, so context should equal the bin's context
      const context = useProjectStore.getState().getModifierContext(scoopId)
      const binContext = useProjectStore.getState().getModifierContext(binId)
      expect(context).toEqual(binContext)
    })

    it('returns null for modifier whose parent object does not support modifiers', () => {
      // Create a baseplate (supportsModifiers: false) and manually attach a modifier to it
      useProjectStore.setState({
        objects: [
          {
            kind: 'baseplate' as const,
            id: 'bp-1',
            name: 'Baseplate 1',
            position: [0, 0, 0] as [number, number, number],
            params: {
              gridWidth: 3,
              gridDepth: 3,
              slim: false,
              magnetHoles: true,
              screwHoles: false,
            },
          },
        ],
        modifiers: [
          {
            kind: 'dividerGrid' as const,
            id: 'mod-orphan',
            parentId: 'bp-1',
            params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
          },
        ] as never,
      })

      const context = useProjectStore.getState().getModifierContext('mod-orphan')
      expect(context).toBeNull()
    })

    it('chains context through multiple levels of modifiers', () => {
      const binId = useProjectStore.getState().addObject('bin')
      const insertId = useProjectStore.getState().addModifier(binId, 'insert')
      const divGridId = useProjectStore.getState().addModifier(insertId, 'dividerGrid')

      const context = useProjectStore.getState().getModifierContext(divGridId)
      expect(context).not.toBeNull()

      // The dividerGrid also subdivides space, so its child context should be
      // smaller than the insert's child context
      const insertContext = useProjectStore.getState().getModifierContext(insertId)
      expect(context!.innerWidth).toBeLessThan(insertContext!.innerWidth) // eslint-disable-line @typescript-eslint/no-non-null-assertion
      expect(context!.innerDepth).toBeLessThan(insertContext!.innerDepth) // eslint-disable-line @typescript-eslint/no-non-null-assertion
    })
  })
})
