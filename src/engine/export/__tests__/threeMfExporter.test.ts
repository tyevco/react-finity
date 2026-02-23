import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as THREE from 'three'
import JSZip from 'jszip'
import { exportObjectAs3MF, exportAllAs3MF } from '../threeMfExporter'
import { generateBaseplate } from '../../geometry/baseplate'
import { PROFILE_OFFICIAL } from '../../constants'
import type { PrintLayoutItem } from '../printLayout'
import type { BaseplateObject } from '@/types/gridfinity'

let downloadState: { triggered: boolean; filename: string }
let capturedBlob: Blob | null

beforeEach(() => {
  vi.restoreAllMocks()
  downloadState = { triggered: false, filename: '' }
  capturedBlob = null

  vi.stubGlobal('URL', {
    ...globalThis.URL,
    createObjectURL: vi.fn((blob: Blob) => {
      capturedBlob = blob
      return 'blob:mock-url'
    }),
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

async function readModelXml(): Promise<string> {
  if (capturedBlob === null) {
    throw new Error('Expected capturedBlob to be set')
  }
  const zip = await JSZip.loadAsync(capturedBlob)
  const modelFile = zip.file('3D/3dmodel.model')
  if (modelFile === null) {
    throw new Error('Expected 3D/3dmodel.model in ZIP')
  }
  return modelFile.async('string')
}

describe('exportObjectAs3MF', () => {
  it('triggers a download with .3mf extension', async () => {
    const geo = makeTestGeometry()
    await exportObjectAs3MF(geo, 'test-object')

    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('test-object.3mf')

    geo.dispose()
  })

  it('sanitizes filenames with special characters', async () => {
    const geo = makeTestGeometry()
    await exportObjectAs3MF(geo, 'my/object<name>')

    expect(downloadState.filename).toBe('my_object_name_.3mf')

    geo.dispose()
  })

  it('produces a valid ZIP with required 3MF entries', async () => {
    const geo = makeTestGeometry()
    await exportObjectAs3MF(geo, 'test')

    if (capturedBlob === null) {
      throw new Error('Expected capturedBlob to be set')
    }
    const zip = await JSZip.loadAsync(capturedBlob)
    expect(zip.file('[Content_Types].xml')).not.toBeNull()
    expect(zip.file('_rels/.rels')).not.toBeNull()
    expect(zip.file('3D/3dmodel.model')).not.toBeNull()

    geo.dispose()
  })

  it('generates correct vertex and triangle counts in model XML', async () => {
    const geo = makeTestGeometry()
    await exportObjectAs3MF(geo, 'test')

    const modelXml = await readModelXml()

    expect((modelXml.match(/<vertex /g) ?? []).length).toBe(3)
    expect((modelXml.match(/<triangle /g) ?? []).length).toBe(1)

    geo.dispose()
  })

  it('declares millimeter units in model XML', async () => {
    const geo = makeTestGeometry()
    await exportObjectAs3MF(geo, 'test')

    const modelXml = await readModelXml()
    expect(modelXml).toContain('unit="millimeter"')

    geo.dispose()
  })

  it('escapes XML special characters in object names', async () => {
    const geo = makeTestGeometry()
    await exportObjectAs3MF(geo, 'Bin <1> & "2"')

    const modelXml = await readModelXml()
    expect(modelXml).toContain('Bin &lt;1&gt; &amp; &quot;2&quot;')

    geo.dispose()
  })

  it('handles real baseplate geometry', async () => {
    const params = { gridWidth: 1, gridDepth: 1, magnetHoles: false, screwHoles: false }
    const geo = generateBaseplate(params, PROFILE_OFFICIAL)

    await expect(exportObjectAs3MF(geo, 'Baseplate')).resolves.not.toThrow()

    geo.dispose()
  })

  it('applies scale factor when not equal to 1', async () => {
    const geo = makeTestGeometry()
    await exportObjectAs3MF(geo, 'scaled', 2)

    const modelXml = await readModelXml()
    // Original vertex at (1,0,0) should become (2,0,0) with scale=2
    expect(modelXml).toContain('x="2.000000"')

    geo.dispose()
  })
})

describe('exportAllAs3MF', () => {
  it('does nothing with empty items', async () => {
    await exportAllAs3MF([])
    expect(downloadState.triggered).toBe(false)
  })

  it('exports multiple objects in a single 3MF', async () => {
    const bp: BaseplateObject = {
      id: 'bp-1',
      name: 'Baseplate 1',
      kind: 'baseplate',
      position: [0, 0, 0],
      params: { gridWidth: 1, gridDepth: 1, magnetHoles: false, screwHoles: false },
    }

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
        object: { ...bp, id: 'bp-2', name: 'Baseplate 2' },
        geometry: makeTestGeometry(),
        position: [52, 0, 0],
        boundingBox: { width: 42, depth: 42, height: 7 },
        fitsOnBed: true,
      },
    ]

    await exportAllAs3MF(items)

    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-plate.3mf')

    const modelXml = await readModelXml()

    expect((modelXml.match(/<object /g) ?? []).length).toBe(2)
    expect((modelXml.match(/<item /g) ?? []).length).toBe(2)

    for (const item of items) {
      item.geometry.dispose()
    }
  })
})
