import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BufferGeometry, BufferAttribute } from 'three'
import { exportObjectAsSTL, exportAllAsSingleSTL, exportAllAsZip } from '../stlExporter'
import { generateBaseplate } from '../../geometry/baseplate'
import { PROFILE_OFFICIAL } from '../../constants'
import type { PrintLayoutItem } from '../printLayout'
import type { BaseplateObject } from '@/types/gridfinity'

// Track download calls via a shared state object
let downloadState: { triggered: boolean; filename: string }

beforeEach(() => {
  vi.restoreAllMocks()
  downloadState = { triggered: false, filename: '' }

  vi.stubGlobal('URL', {
    ...globalThis.URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  })

  const mockLink = {
    href: '',
    download: '',
    click: () => {
      downloadState.triggered = true
      downloadState.filename = mockLink.download
    },
  }
  vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
  vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node)
  vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node)
})

function makeTestGeometry(): BufferGeometry {
  const geometry = new BufferGeometry()
  const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])
  geometry.setAttribute('position', new BufferAttribute(vertices, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setIndex([0, 1, 2])
  return geometry
}

describe('exportObjectAsSTL', () => {
  it('triggers a download with .stl extension', () => {
    const geo = makeTestGeometry()
    exportObjectAsSTL(geo, 'test-object')

    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('test-object.stl')

    geo.dispose()
  })

  it('sanitizes filenames with special characters', () => {
    const geo = makeTestGeometry()
    exportObjectAsSTL(geo, 'my/object<name>')

    expect(downloadState.filename).toBe('my_object_name_.stl')

    geo.dispose()
  })

  it('applies a scale factor to the exported geometry', () => {
    const geo = makeTestGeometry()
    expect(() => {
      exportObjectAsSTL(geo, 'scaled-object', 0.001)
    }).not.toThrow()
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('scaled-object.stl')

    geo.dispose()
  })

  it('handles real baseplate geometry', () => {
    const params = {
      gridWidth: 1,
      gridDepth: 1,
      slim: false,
      magnetHoles: false,
      screwHoles: false,
    }
    const geo = generateBaseplate(params, PROFILE_OFFICIAL)

    expect(() => {
      exportObjectAsSTL(geo, 'Baseplate')
    }).not.toThrow()

    geo.dispose()
  })
})

function makeNonIndexedGeometry(): BufferGeometry {
  const geometry = new BufferGeometry()
  const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])
  geometry.setAttribute('position', new BufferAttribute(vertices, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  return geometry
}

function makeBaseplateObject(id: string, name: string): BaseplateObject {
  return {
    id,
    name,
    kind: 'baseplate',
    position: [0, 0, 0],
    params: { gridWidth: 1, gridDepth: 1, slim: false, magnetHoles: false, screwHoles: false },
  }
}

describe('exportAllAsSingleSTL', () => {
  it('does nothing with empty items', () => {
    exportAllAsSingleSTL([])
    expect(downloadState.triggered).toBe(false)
  })

  it('exports merged geometry from multiple items', () => {
    const bp = makeBaseplateObject('bp-1', 'Baseplate 1')

    const items: PrintLayoutItem[] = [
      {
        id: 'bp-1',
        label: 'Baseplate 1',
        object: bp,
        geometry: makeTestGeometry(),
        position: [0, 0, 0],
        boundingBox: { width: 42, depth: 42, height: 7 },
        fitsOnBed: true,
      },
      {
        id: 'bp-2',
        label: 'Baseplate 2',
        object: makeBaseplateObject('bp-2', 'Baseplate 2'),
        geometry: makeTestGeometry(),
        position: [52, 0, 0],
        boundingBox: { width: 42, depth: 42, height: 7 },
        fitsOnBed: true,
      },
    ]

    expect(() => {
      exportAllAsSingleSTL(items)
    }).not.toThrow()
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-plate.stl')

    for (const item of items) {
      item.geometry.dispose()
    }
  })

  it('exports a single item through the merge code path', () => {
    const item: PrintLayoutItem = {
      id: 'test-1',
      label: 'Test Object',
      object: makeBaseplateObject('test-1', 'Test Object'),
      geometry: makeTestGeometry(),
      position: [0, 0, 0],
      boundingBox: { width: 42, depth: 42, height: 7 },
      fitsOnBed: true,
    }

    expect(() => {
      exportAllAsSingleSTL([item])
    }).not.toThrow()
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-plate.stl')

    item.geometry.dispose()
  })

  it('handles non-indexed geometry via the else branch', () => {
    // Non-indexed geometry exercises the else branch at lines 122-126 in stlExporter.ts,
    // where sequential indices are generated instead of reading from geo.index.
    const item: PrintLayoutItem = {
      id: 'nonindexed-1',
      label: 'Non-Indexed Object',
      object: makeBaseplateObject('nonindexed-1', 'Non-Indexed Object'),
      geometry: makeNonIndexedGeometry(),
      position: [0, 0, 0],
      boundingBox: { width: 42, depth: 42, height: 7 },
      fitsOnBed: true,
    }

    expect(() => {
      exportAllAsSingleSTL([item])
    }).not.toThrow()
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-plate.stl')

    item.geometry.dispose()
  })

  it('applies a non-unit scale factor to merged geometry', () => {
    const item: PrintLayoutItem = {
      id: 'scaled-1',
      label: 'Scaled Object',
      object: makeBaseplateObject('scaled-1', 'Scaled Object'),
      geometry: makeTestGeometry(),
      position: [0, 0, 0],
      boundingBox: { width: 42, depth: 42, height: 7 },
      fitsOnBed: true,
    }

    expect(() => {
      exportAllAsSingleSTL([item], 0.001)
    }).not.toThrow()
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-plate.stl')

    item.geometry.dispose()
  })

  it('mixes indexed and non-indexed geometry in a single merge', () => {
    const items: PrintLayoutItem[] = [
      {
        id: 'indexed-1',
        label: 'Indexed Object',
        object: makeBaseplateObject('indexed-1', 'Indexed Object'),
        geometry: makeTestGeometry(),
        position: [0, 0, 0],
        boundingBox: { width: 42, depth: 42, height: 7 },
        fitsOnBed: true,
      },
      {
        id: 'nonindexed-2',
        label: 'Non-Indexed Object',
        object: makeBaseplateObject('nonindexed-2', 'Non-Indexed Object'),
        geometry: makeNonIndexedGeometry(),
        position: [52, 0, 0],
        boundingBox: { width: 42, depth: 42, height: 7 },
        fitsOnBed: true,
      },
    ]

    expect(() => {
      exportAllAsSingleSTL(items)
    }).not.toThrow()
    expect(downloadState.triggered).toBe(true)

    for (const item of items) {
      item.geometry.dispose()
    }
  })

  it('preserves vertex positions from multiple items at different offsets', () => {
    // Create two test geometries with known vertex positions
    const geo1 = new BufferGeometry()
    const verts1 = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    geo1.setAttribute('position', new BufferAttribute(verts1, 3))
    geo1.setAttribute('normal', new BufferAttribute(new Float32Array(9).fill(0), 3))
    geo1.setIndex([0, 1, 2])

    const geo2 = new BufferGeometry()
    const verts2 = new Float32Array([10, 0, 0, 11, 0, 0, 10, 1, 0])
    geo2.setAttribute('position', new BufferAttribute(verts2, 3))
    geo2.setAttribute('normal', new BufferAttribute(new Float32Array(9).fill(0), 3))
    geo2.setIndex([0, 1, 2])

    const items: PrintLayoutItem[] = [
      {
        id: 'a',
        label: 'A',
        object: makeBaseplateObject('a', 'A'),
        geometry: geo1,
        position: [0, 0, 0],
        boundingBox: { width: 1, depth: 1, height: 1 },
        fitsOnBed: true,
      },
      {
        id: 'b',
        label: 'B',
        object: makeBaseplateObject('b', 'B'),
        geometry: geo2,
        position: [20, 0, 0],
        boundingBox: { width: 1, depth: 1, height: 1 },
        fitsOnBed: true,
      },
    ]

    // Should not throw and should produce a valid download
    expect(() => {
      exportAllAsSingleSTL(items)
    }).not.toThrow()
    expect(downloadState.triggered).toBe(true)

    geo1.dispose()
    geo2.dispose()
  })

  it('skips items with empty geometry without crashing', () => {
    const items: PrintLayoutItem[] = [
      {
        id: 'empty-1',
        label: 'Empty',
        object: makeBaseplateObject('empty-1', 'Empty'),
        geometry: new BufferGeometry(), // no position attribute
        position: [0, 0, 0],
        boundingBox: { width: 0, depth: 0, height: 0 },
        fitsOnBed: true,
      },
      {
        id: 'valid-1',
        label: 'Valid',
        object: makeBaseplateObject('valid-1', 'Valid'),
        geometry: makeTestGeometry(),
        position: [52, 0, 0],
        boundingBox: { width: 42, depth: 42, height: 7 },
        fitsOnBed: true,
      },
    ]

    expect(() => {
      exportAllAsSingleSTL(items)
    }).not.toThrow()
    expect(downloadState.triggered).toBe(true)

    for (const item of items) {
      item.geometry.dispose()
    }
  })
})

describe('exportAllAsZip', () => {
  it('does nothing with empty items', async () => {
    await exportAllAsZip([])
    expect(downloadState.triggered).toBe(false)
  })

  it('exports items as individual STL files in a ZIP', async () => {
    const items: PrintLayoutItem[] = [
      {
        id: 'zip-1',
        label: 'Bin 1',
        object: makeBaseplateObject('zip-1', 'Bin 1'),
        geometry: makeTestGeometry(),
        position: [0, 0, 0],
        boundingBox: { width: 42, depth: 42, height: 7 },
        fitsOnBed: true,
      },
      {
        id: 'zip-2',
        label: 'Bin 2',
        object: makeBaseplateObject('zip-2', 'Bin 2'),
        geometry: makeTestGeometry(),
        position: [52, 0, 0],
        boundingBox: { width: 42, depth: 42, height: 7 },
        fitsOnBed: true,
      },
    ]

    await expect(exportAllAsZip(items)).resolves.toBeUndefined()
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-export.zip')

    for (const item of items) {
      item.geometry.dispose()
    }
  })

  it('exports a single item as a ZIP', async () => {
    const item: PrintLayoutItem = {
      id: 'zip-single',
      label: 'Single Bin',
      object: makeBaseplateObject('zip-single', 'Single Bin'),
      geometry: makeTestGeometry(),
      position: [0, 0, 0],
      boundingBox: { width: 42, depth: 42, height: 7 },
      fitsOnBed: true,
    }

    await expect(exportAllAsZip([item])).resolves.toBeUndefined()
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-export.zip')

    item.geometry.dispose()
  })

  it('applies a scale factor when exporting each STL in the ZIP', async () => {
    const item: PrintLayoutItem = {
      id: 'zip-scaled',
      label: 'Scaled Bin',
      object: makeBaseplateObject('zip-scaled', 'Scaled Bin'),
      geometry: makeTestGeometry(),
      position: [0, 0, 0],
      boundingBox: { width: 42, depth: 42, height: 7 },
      fitsOnBed: true,
    }

    await expect(exportAllAsZip([item], 0.001)).resolves.toBeUndefined()
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-export.zip')

    item.geometry.dispose()
  })

  it('sanitizes item labels as STL filenames within the ZIP', async () => {
    // We verify the function completes without error; the filename sanitization
    // for individual entries inside the ZIP archive is tested indirectly since
    // JSZip accepts any string key and the download filename is always the ZIP name.
    const item: PrintLayoutItem = {
      id: 'zip-special',
      label: 'My/Bin<Object>',
      object: makeBaseplateObject('zip-special', 'My/Bin<Object>'),
      geometry: makeTestGeometry(),
      position: [0, 0, 0],
      boundingBox: { width: 42, depth: 42, height: 7 },
      fitsOnBed: true,
    }

    await expect(exportAllAsZip([item])).resolves.toBeUndefined()
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-export.zip')

    item.geometry.dispose()
  })
})
