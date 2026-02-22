import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as THREE from 'three'
import { exportObjectAsSTL, exportAllAsSingleSTL } from '../stlExporter'
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

function makeTestGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
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

  it('handles real baseplate geometry', () => {
    const params = { gridWidth: 1, gridDepth: 1, magnetHoles: false, screwHoles: false }
    const geo = generateBaseplate(params, PROFILE_OFFICIAL)

    expect(() => {
      exportObjectAsSTL(geo, 'Baseplate')
    }).not.toThrow()

    geo.dispose()
  })
})

describe('exportAllAsSingleSTL', () => {
  it('does nothing with empty items', () => {
    exportAllAsSingleSTL([])
    expect(downloadState.triggered).toBe(false)
  })

  it('exports merged geometry from multiple items', () => {
    const bp: BaseplateObject = {
      id: 'bp-1',
      name: 'Baseplate 1',
      kind: 'baseplate',
      position: [0, 0, 0],
      params: { gridWidth: 1, gridDepth: 1, magnetHoles: false, screwHoles: false },
    }

    const items: PrintLayoutItem[] = [
      {
        object: bp,
        geometry: makeTestGeometry(),
        position: [0, 0, 0],
        boundingBox: { width: 42, depth: 42, height: 7 },
        fitsOnBed: true,
      },
      {
        object: { ...bp, id: 'bp-2', name: 'Baseplate 2' },
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
})
