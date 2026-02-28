import { BufferGeometry, Mesh, MeshBasicMaterial, BufferAttribute } from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import JSZip from 'jszip'
import type { PrintLayoutItem } from './printLayout'
import { sanitizeFilename, triggerDownload } from './exportUtils'

function geometryToSTLBinary(geometry: BufferGeometry, scale = 1): ArrayBuffer {
  const exporter = new STLExporter()
  let geo = geometry
  let needsDispose = false
  const material = new MeshBasicMaterial()

  try {
    if (scale !== 1) {
      geo = geometry.clone()
      geo.scale(scale, scale, scale)
      needsDispose = true
    }

    const mesh = new Mesh(geo, material)
    const result = exporter.parse(mesh, { binary: true }) as DataView
    // Copy to a plain ArrayBuffer to satisfy BlobPart/JSZip type constraints
    const arrayBuffer = new ArrayBuffer(result.byteLength)
    new Uint8Array(arrayBuffer).set(new Uint8Array(result.buffer as ArrayBuffer))

    return arrayBuffer
  } finally {
    material.dispose()
    if (needsDispose) {
      geo.dispose()
    }
  }
}

/**
 * Export a single geometry as a binary STL file download.
 */
export function exportObjectAsSTL(geometry: BufferGeometry, name: string, scale = 1): void {
  const buffer = geometryToSTLBinary(geometry, scale)
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  triggerDownload(blob, `${sanitizeFilename(name)}.stl`)
}

/**
 * Export all print layout items as individual STL files bundled in a ZIP.
 */
export async function exportAllAsZip(items: PrintLayoutItem[], scale = 1): Promise<void> {
  try {
    const zip = new JSZip()

    for (const item of items) {
      const data = geometryToSTLBinary(item.geometry, scale)
      const filename = `${sanitizeFilename(item.label)}.stl`
      zip.file(filename, data)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    triggerDownload(blob, 'react-finity-export.zip')
  } catch (error) {
    console.error('Failed to export ZIP:', error)
    throw error
  }
}

/**
 * Export all print layout items as a single merged STL with objects at
 * their layout positions.
 */
export function exportAllAsSingleSTL(items: PrintLayoutItem[], scale = 1): void {
  if (items.length === 0) {
    console.warn('Export skipped: no objects in layout')
    return
  }

  const geometries: BufferGeometry[] = []
  let merged: BufferGeometry | null = null

  try {
    for (const item of items) {
      const clone = item.geometry.clone()
      const [x, y, z] = item.position
      clone.translate(x, y, z)
      geometries.push(clone)
    }

    // Merge all positioned geometries
    merged = new BufferGeometry()
    let totalVertices = 0
    let totalIndices = 0

    for (const geo of geometries) {
      totalVertices += geo.attributes.position.count
      if (geo.index) {
        totalIndices += geo.index.count
      } else {
        totalIndices += geo.attributes.position.count
      }
    }

    const positions = new Float32Array(totalVertices * 3)
    const normals = new Float32Array(totalVertices * 3)
    const indices = new Uint32Array(totalIndices)

    let vertexOffset = 0
    let indexOffset = 0

    for (const geo of geometries) {
      const posAttr = geo.attributes.position as BufferAttribute
      const normAttr = geo.attributes.normal as BufferAttribute | undefined

      for (let i = 0; i < posAttr.count * 3; i++) {
        positions[vertexOffset * 3 + i] = posAttr.array[i]
      }

      if (normAttr) {
        for (let i = 0; i < normAttr.count * 3; i++) {
          normals[vertexOffset * 3 + i] = normAttr.array[i]
        }
      }

      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          indices[indexOffset + i] = geo.index.array[i] + vertexOffset
        }
        indexOffset += geo.index.count
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          indices[indexOffset + i] = vertexOffset + i
        }
        indexOffset += posAttr.count
      }

      vertexOffset += posAttr.count
    }

    merged.setAttribute('position', new BufferAttribute(positions, 3))
    merged.setAttribute('normal', new BufferAttribute(normals, 3))
    merged.setIndex(new BufferAttribute(indices, 1))
    merged.computeVertexNormals()

    const buffer = geometryToSTLBinary(merged, scale)
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    triggerDownload(blob, 'react-finity-plate.stl')
  } catch (error) {
    console.error('Failed to export single STL:', error)
    throw error
  } finally {
    merged?.dispose()
    for (const geo of geometries) {
      geo.dispose()
    }
  }
}
