import type * as THREE from 'three'
import JSZip from 'jszip'
import type { PrintLayoutItem } from './printLayout'
import { sanitizeFilename, triggerDownload } from './exportUtils'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function geometryToMeshXml(geometry: THREE.BufferGeometry, scale: number): string {
  const positions = geometry.attributes.position
  const parts: string[] = []

  parts.push('        <vertices>\n')
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) * scale
    const y = positions.getY(i) * scale
    const z = positions.getZ(i) * scale
    parts.push(`          <vertex x="${x.toFixed(6)}" y="${y.toFixed(6)}" z="${z.toFixed(6)}" />\n`)
  }
  parts.push('        </vertices>\n')

  parts.push('        <triangles>\n')
  const index = geometry.index
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      parts.push(
        `          <triangle v1="${index.getX(i)}" v2="${index.getX(i + 1)}" v3="${index.getX(i + 2)}" />\n`,
      )
    }
  } else {
    for (let i = 0; i < positions.count; i += 3) {
      parts.push(`          <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}" />\n`)
    }
  }
  parts.push('        </triangles>\n')

  return parts.join('')
}

interface ModelObject {
  id: number
  name: string
  meshXml: string
}

interface BuildItem {
  objectId: number
}

function buildModelXml(objects: ModelObject[], buildItems: BuildItem[]): string {
  const parts: string[] = []
  parts.push('<?xml version="1.0" encoding="UTF-8"?>\n')
  parts.push('<model unit="millimeter" xml:lang="en-US"\n')
  parts.push('  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n')

  parts.push('  <resources>\n')
  for (const obj of objects) {
    parts.push(`    <object id="${obj.id}" type="model" name="${escapeXml(obj.name)}">\n`)
    parts.push('      <mesh>\n')
    parts.push(obj.meshXml)
    parts.push('      </mesh>\n')
    parts.push('    </object>\n')
  }
  parts.push('  </resources>\n')

  parts.push('  <build>\n')
  for (const item of buildItems) {
    parts.push(`    <item objectid="${item.objectId}" />\n`)
  }
  parts.push('  </build>\n')

  parts.push('</model>\n')
  return parts.join('')
}

function buildContentTypesXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />',
    '  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />',
    '</Types>',
    '',
  ].join('\n')
}

function buildRelsXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Target="/3D/3dmodel.model" Id="rel0"',
    '    Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />',
    '</Relationships>',
    '',
  ].join('\n')
}

async function build3MFBlob(modelXml: string): Promise<Blob> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', buildContentTypesXml())
  zip.file('_rels/.rels', buildRelsXml())
  zip.file('3D/3dmodel.model', modelXml)
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
  })
}

/**
 * Export a single geometry as a 3MF file download.
 * Scale defaults to 1 since 3MF declares unit="millimeter" explicitly.
 */
export async function exportObjectAs3MF(
  geometry: THREE.BufferGeometry,
  name: string,
  scale = 1,
): Promise<void> {
  try {
    const meshXml = geometryToMeshXml(geometry, scale)
    const modelXml = buildModelXml([{ id: 1, name, meshXml }], [{ objectId: 1 }])
    const blob = await build3MFBlob(modelXml)
    triggerDownload(blob, `${sanitizeFilename(name)}.3mf`)
  } catch (error) {
    console.error('Failed to export 3MF:', error)
    throw error
  }
}

/**
 * Export all print layout items as separate objects in a single 3MF file.
 * Each item becomes a separate <object> element with position pre-translated
 * into the geometry (consistent with exportAllAsSingleSTL approach).
 */
export async function exportAllAs3MF(items: PrintLayoutItem[], scale = 1): Promise<void> {
  if (items.length === 0) return

  const clones: THREE.BufferGeometry[] = []

  try {
    const objects: ModelObject[] = []
    const buildItems: BuildItem[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const clone = item.geometry.clone()
      const [x, y, z] = item.position
      clone.translate(x, y, z)
      clones.push(clone)

      const id = i + 1
      const meshXml = geometryToMeshXml(clone, scale)
      objects.push({ id, name: item.label, meshXml })
      buildItems.push({ objectId: id })
    }

    const modelXml = buildModelXml(objects, buildItems)
    const blob = await build3MFBlob(modelXml)
    triggerDownload(blob, 'react-finity-plate.3mf')
  } catch (error) {
    console.error('Failed to export all as 3MF:', error)
    throw error
  } finally {
    for (const clone of clones) {
      clone.dispose()
    }
  }
}
