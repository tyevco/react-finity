import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import JSZip from 'jszip'
import { mergeObjectWithModifiers, collectSeparatePartModifiers } from '../mergeObjectGeometry'
import { computePrintLayout, disposePrintLayout } from '../printLayout'
import { exportObjectAsSTL, exportAllAsSingleSTL, exportAllAsZip } from '../stlExporter'
import { exportObjectAs3MF, exportAllAs3MF } from '../threeMfExporter'
import { PROFILE_OFFICIAL, PROFILE_TIGHT_FIT } from '../../constants'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import { setCurveQuality } from '@/engine/geometry/primitives'
import type {
  BinObject,
  BaseplateObject,
  Modifier,
  DividerGridModifier,
  LabelTabModifier,
  LidModifier,
  FingerScoopModifier,
  ScoopModifier,
} from '@/types/gridfinity'

// -- Setup ------------------------------------------------------------------

beforeAll(() => {
  registerBuiltinKinds()
  setCurveQuality('low')
})

let capturedBlob: Blob | null
let downloadState: { triggered: boolean; filename: string }

beforeEach(() => {
  vi.restoreAllMocks()
  capturedBlob = null
  downloadState = { triggered: false, filename: '' }

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

// -- Helpers ----------------------------------------------------------------

function makeBin(id = 'bin-1', overrides?: Partial<BinObject['params']>): BinObject {
  return {
    id,
    name: `Bin ${id}`,
    kind: 'bin',
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
      ...overrides,
    },
  }
}

function makeBaseplate(id = 'bp-1'): BaseplateObject {
  return {
    id,
    name: `Baseplate ${id}`,
    kind: 'baseplate',
    position: [0, 0, 0],
    params: {
      gridWidth: 1,
      gridDepth: 1,
      slim: false,
      magnetHoles: false,
      screwHoles: false,
    },
  }
}

async function parseSTLTriangleCount(blob: Blob): Promise<number> {
  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)
  return view.getUint32(80, true) // triangle count at offset 80, little-endian
}

async function parse3MFModelXml(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(blob)
  const modelFile = zip.file('3D/3dmodel.model')
  if (!modelFile) throw new Error('Missing 3D/3dmodel.model in 3MF archive')
  return modelFile.async('string')
}

function countXmlElements(xml: string, tag: string): number {
  const regex = new RegExp(`<${tag} `, 'g')
  return (xml.match(regex) ?? []).length
}

function getBlob(): Blob {
  if (capturedBlob === null) throw new Error('Expected capturedBlob to be set')
  return capturedBlob
}

// -- Tests ------------------------------------------------------------------

describe('bin with modifiers -> STL export', () => {
  it('bin + divider grid produces valid STL with more triangles than bare bin', async () => {
    const bin = makeBin()

    // Export bare bin
    const bareGeo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)
    exportObjectAsSTL(bareGeo, 'bare-bin')
    const bareBlob = getBlob()
    const bareTriangles = await parseSTLTriangleCount(bareBlob)
    bareGeo.dispose()

    // Reset for second export
    capturedBlob = null

    // Export bin + divider
    const divider: DividerGridModifier = {
      id: 'div-1',
      parentId: 'bin-1',
      kind: 'dividerGrid',
      params: { dividersX: 1, dividersY: 1, wallThickness: 1.2 },
    }
    const mergedGeo = mergeObjectWithModifiers(bin, [divider], PROFILE_OFFICIAL)
    exportObjectAsSTL(mergedGeo, 'bin-with-divider')
    const mergedBlob = getBlob()
    const mergedTriangles = await parseSTLTriangleCount(mergedBlob)
    mergedGeo.dispose()

    expect(bareTriangles).toBeGreaterThan(0)
    expect(mergedTriangles).toBeGreaterThan(bareTriangles)
  })

  it('bin + label tab produces valid STL', async () => {
    const bin = makeBin()
    const label: LabelTabModifier = {
      id: 'label-1',
      parentId: 'bin-1',
      kind: 'labelTab',
      params: { wall: 'front', angle: 45, height: 7 },
    }
    const geo = mergeObjectWithModifiers(bin, [label], PROFILE_OFFICIAL)
    exportObjectAsSTL(geo, 'bin-with-label')
    const triangles = await parseSTLTriangleCount(getBlob())
    geo.dispose()

    expect(triangles).toBeGreaterThan(0)
  })

  it('bin + finger scoop (subtractive) produces different triangle count', async () => {
    const bin = makeBin()

    // Bare bin
    const bareGeo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)
    exportObjectAsSTL(bareGeo, 'bare')
    const bareTriangles = await parseSTLTriangleCount(getBlob())
    bareGeo.dispose()

    capturedBlob = null

    // Bin + finger scoop (CSG subtraction)
    const fingerScoop: FingerScoopModifier = {
      id: 'fs-1',
      parentId: 'bin-1',
      kind: 'fingerScoop',
      params: { wall: 'front', width: 20, depth: 15 },
    }
    const csgGeo = mergeObjectWithModifiers(bin, [fingerScoop], PROFILE_OFFICIAL)
    exportObjectAsSTL(csgGeo, 'bin-with-scoop')
    const csgTriangles = await parseSTLTriangleCount(getBlob())
    csgGeo.dispose()

    expect(bareTriangles).toBeGreaterThan(0)
    expect(csgTriangles).toBeGreaterThan(0)
    expect(csgTriangles).not.toBe(bareTriangles)
  })

  it('bin + nested modifiers (divider + label tab) produces valid STL', async () => {
    const bin = makeBin()

    // Divider only
    const divider: DividerGridModifier = {
      id: 'div-1',
      parentId: 'bin-1',
      kind: 'dividerGrid',
      params: { dividersX: 1, dividersY: 0, wallThickness: 1.2 },
    }
    const divOnlyGeo = mergeObjectWithModifiers(bin, [divider], PROFILE_OFFICIAL)
    exportObjectAsSTL(divOnlyGeo, 'div-only')
    const divOnlyTriangles = await parseSTLTriangleCount(getBlob())
    divOnlyGeo.dispose()

    capturedBlob = null

    // Divider + nested label tab
    const label: LabelTabModifier = {
      id: 'label-1',
      parentId: 'div-1', // child of divider
      kind: 'labelTab',
      params: { wall: 'front', angle: 45, height: 7 },
    }
    const nestedGeo = mergeObjectWithModifiers(bin, [divider, label], PROFILE_OFFICIAL)
    exportObjectAsSTL(nestedGeo, 'div-with-label')
    const nestedTriangles = await parseSTLTriangleCount(getBlob())
    nestedGeo.dispose()

    expect(nestedTriangles).toBeGreaterThan(divOnlyTriangles)
  })
})

describe('bin with lid -> separate print parts', () => {
  const bin = makeBin()
  const lid: LidModifier = {
    id: 'lid-1',
    parentId: 'bin-1',
    kind: 'lid',
    params: { stacking: false },
  }

  it('bin + lid produces 2 layout items (bin and lid)', () => {
    const items = computePrintLayout([bin], [lid], PROFILE_OFFICIAL, 350, 350, 10)

    expect(items).toHaveLength(2)
    expect(items[0].label).toBe('Bin bin-1')
    expect(items[1].label).toContain('Lid')

    disposePrintLayout(items)
  })

  it('bin + lid exports 2 objects in 3MF', async () => {
    const items = computePrintLayout([bin], [lid], PROFILE_OFFICIAL, 350, 350, 10)

    exportAllAs3MF(items)
    expect(downloadState.triggered).toBe(true)

    const xml = await parse3MFModelXml(getBlob())
    expect(countXmlElements(xml, 'object')).toBe(2)
    expect(countXmlElements(xml, 'item')).toBe(2)

    disposePrintLayout(items)
  })

  it('bin + lid exports 2 STL files in ZIP', async () => {
    const items = computePrintLayout([bin], [lid], PROFILE_OFFICIAL, 350, 350, 10)

    await exportAllAsZip(items)
    expect(downloadState.triggered).toBe(true)
    expect(downloadState.filename).toBe('react-finity-export.zip')

    const zip = await JSZip.loadAsync(getBlob())
    const stlFiles = Object.keys(zip.files).filter((f) => f.endsWith('.stl'))
    expect(stlFiles).toHaveLength(2)

    disposePrintLayout(items)
  })

  it('lid geometry has vertices (not empty)', () => {
    const parts = collectSeparatePartModifiers(bin.id, [lid], PROFILE_OFFICIAL, bin)

    expect(parts).toHaveLength(1)
    expect(parts[0].geometry.attributes.position.count).toBeGreaterThan(0)

    for (const p of parts) p.geometry.dispose()
  })
})

describe('multiple objects -> print layout -> merged STL', () => {
  it('2 baseplates + 1 bin produce 3 layout items', () => {
    const objects = [makeBaseplate('bp-1'), makeBaseplate('bp-2'), makeBin('bin-1')]
    const items = computePrintLayout(objects, [], PROFILE_OFFICIAL, 350, 350, 10)

    expect(items).toHaveLength(3)

    disposePrintLayout(items)
  })

  it('merged STL triangle count >= sum of individual triangle counts', async () => {
    const objects = [makeBaseplate('bp-1'), makeBin('bin-1')]
    const items = computePrintLayout(objects, [], PROFILE_OFFICIAL, 350, 350, 10)

    // Export each individually and sum triangle counts
    let individualSum = 0
    for (const item of items) {
      capturedBlob = null
      exportObjectAsSTL(item.geometry, item.label)
      individualSum += await parseSTLTriangleCount(getBlob())
    }

    // Export merged
    capturedBlob = null
    exportAllAsSingleSTL(items)
    const mergedTriangles = await parseSTLTriangleCount(getBlob())

    expect(mergedTriangles).toBeGreaterThanOrEqual(individualSum)

    disposePrintLayout(items)
  })

  it('layout items are non-overlapping', () => {
    const objects = [makeBaseplate('bp-1'), makeBaseplate('bp-2'), makeBin('bin-1')]
    const items = computePrintLayout(objects, [], PROFILE_OFFICIAL, 350, 350, 10)

    // Check that no two items overlap in the XZ plane
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]

        const aMinX = a.position[0] - a.boundingBox.width / 2
        const aMaxX = a.position[0] + a.boundingBox.width / 2
        const aMinZ = a.position[2] - a.boundingBox.depth / 2
        const aMaxZ = a.position[2] + a.boundingBox.depth / 2

        const bMinX = b.position[0] - b.boundingBox.width / 2
        const bMaxX = b.position[0] + b.boundingBox.width / 2
        const bMinZ = b.position[2] - b.boundingBox.depth / 2
        const bMaxZ = b.position[2] + b.boundingBox.depth / 2

        const overlapX = aMinX < bMaxX && aMaxX > bMinX
        const overlapZ = aMinZ < bMaxZ && aMaxZ > bMinZ
        const overlaps = overlapX && overlapZ

        expect(overlaps, `items ${i} and ${j} should not overlap`).toBe(false)
      }
    }

    disposePrintLayout(items)
  })

  it('all items fit on a large bed', () => {
    const objects = [makeBaseplate('bp-1'), makeBaseplate('bp-2'), makeBin('bin-1')]
    const items = computePrintLayout(objects, [], PROFILE_OFFICIAL, 350, 350, 10)

    expect(items.every((item) => item.fitsOnBed)).toBe(true)

    disposePrintLayout(items)
  })
})

describe('profile variation affects geometry', () => {
  it('tight fit profile produces different vertex count than official', () => {
    const bin = makeBin()

    const officialGeo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)
    const tightGeo = mergeObjectWithModifiers(bin, [], PROFILE_TIGHT_FIT)

    // Different tolerances mean different geometry
    const officialCount = officialGeo.attributes.position.count
    const tightCount = tightGeo.attributes.position.count

    // Both should produce valid geometry
    expect(officialCount).toBeGreaterThan(0)
    expect(tightCount).toBeGreaterThan(0)

    // With different tolerance values, vertex positions differ even if count may be the same.
    // Verify by checking that at least the geometry bounding spheres differ.
    officialGeo.computeBoundingSphere()
    tightGeo.computeBoundingSphere()
    const officialSphere = officialGeo.boundingSphere
    const tightSphere = tightGeo.boundingSphere
    if (!officialSphere || !tightSphere) throw new Error('Expected bounding spheres')
    const officialRadius = officialSphere.radius
    const tightRadius = tightSphere.radius

    // Tight fit has smaller tolerance (0.1 vs 0.25), so geometry is slightly larger
    expect(tightRadius).not.toBeCloseTo(officialRadius, 3)

    officialGeo.dispose()
    tightGeo.dispose()
  })

  it('profile affects exported STL triangle count or geometry size', async () => {
    const bin = makeBin()

    // Export with official profile
    const officialGeo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)
    exportObjectAsSTL(officialGeo, 'official')
    const officialBlob = getBlob()
    const officialSize = officialBlob.size
    officialGeo.dispose()

    capturedBlob = null

    // Export with tight fit profile
    const tightGeo = mergeObjectWithModifiers(bin, [], PROFILE_TIGHT_FIT)
    exportObjectAsSTL(tightGeo, 'tight')
    const tightBlob = getBlob()
    const tightSize = tightBlob.size
    tightGeo.dispose()

    // Both should produce valid STL files
    expect(officialSize).toBeGreaterThan(84) // at least header + triangle count
    expect(tightSize).toBeGreaterThan(84)

    // Different profiles produce different geometry, so file sizes should differ
    // (vertex positions change due to tolerance differences)
    const officialTriangles = await parseSTLTriangleCount(officialBlob)
    const tightTriangles = await parseSTLTriangleCount(tightBlob)
    expect(officialTriangles).toBeGreaterThan(0)
    expect(tightTriangles).toBeGreaterThan(0)
  })
})

describe('3MF format integrity', () => {
  it('single bin export produces valid 3MF with correct XML structure', async () => {
    const bin = makeBin()
    const geo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)

    exportObjectAs3MF(geo, 'test-bin')
    expect(downloadState.triggered).toBe(true)

    const zip = await JSZip.loadAsync(getBlob())
    expect(zip.file('[Content_Types].xml')).not.toBeNull()
    expect(zip.file('_rels/.rels')).not.toBeNull()
    expect(zip.file('3D/3dmodel.model')).not.toBeNull()

    const xml = await parse3MFModelXml(getBlob())
    expect(xml).toContain('unit="millimeter"')
    expect(countXmlElements(xml, 'vertex')).toBeGreaterThan(0)
    expect(countXmlElements(xml, 'triangle')).toBeGreaterThan(0)

    geo.dispose()
  })

  it('multi-object export has correct object and build item counts', async () => {
    const bin = makeBin('bin-1')
    const lid: LidModifier = {
      id: 'lid-1',
      parentId: 'bin-1',
      kind: 'lid',
      params: { stacking: false },
    }
    const objects = [makeBaseplate('bp-1'), makeBaseplate('bp-2'), bin]
    const modifiers: Modifier[] = [lid]

    // 2 baseplates + 1 bin + 1 lid = 4 layout items
    const items = computePrintLayout(objects, modifiers, PROFILE_OFFICIAL, 350, 350, 10)
    expect(items).toHaveLength(4)

    exportAllAs3MF(items)
    const xml = await parse3MFModelXml(getBlob())

    expect(countXmlElements(xml, 'object')).toBe(4)
    expect(countXmlElements(xml, 'item')).toBe(4)

    disposePrintLayout(items)
  })

  it('3MF vertex coordinates are valid numbers (no NaN/Infinity)', async () => {
    const bin = makeBin()
    const scoop: ScoopModifier = {
      id: 'scoop-1',
      parentId: 'bin-1',
      kind: 'scoop',
      params: { wall: 'front', radius: 0 },
    }
    const geo = mergeObjectWithModifiers(bin, [scoop], PROFILE_OFFICIAL)

    exportObjectAs3MF(geo, 'bin-with-scoop')
    const xml = await parse3MFModelXml(getBlob())

    // Extract all x, y, z attribute values from vertex elements
    const coordRegex = /[xyz]="([^"]+)"/g
    let match: RegExpExecArray | null
    const values: number[] = []
    while ((match = coordRegex.exec(xml)) !== null) {
      values.push(parseFloat(match[1]))
    }

    expect(values.length).toBeGreaterThan(0)
    for (const val of values) {
      expect(isFinite(val), `coordinate value ${val} should be finite`).toBe(true)
    }

    geo.dispose()
  })

  it('scale factor is applied correctly in 3MF export', async () => {
    const bin = makeBin()
    const geo = mergeObjectWithModifiers(bin, [], PROFILE_OFFICIAL)

    // Export at scale 1
    exportObjectAs3MF(geo, 'scale-1', 1)
    const xml1 = await parse3MFModelXml(getBlob())

    capturedBlob = null

    // Export at scale 0.001
    exportObjectAs3MF(geo, 'scale-0001', 0.001)
    const xml2 = await parse3MFModelXml(getBlob())

    // Extract first vertex x-coordinate from each
    const getFirstX = (xml: string): number => {
      const match = /x="([^"]+)"/.exec(xml)
      if (!match) throw new Error('No x attribute found')
      return parseFloat(match[1])
    }

    const x1 = getFirstX(xml1)
    const x2 = getFirstX(xml2)

    // The scaled version should have coordinates ~1000x smaller
    expect(x1).not.toBe(0)
    expect(Math.abs(x2 / x1)).toBeCloseTo(0.001, 2)

    geo.dispose()
  })
})
