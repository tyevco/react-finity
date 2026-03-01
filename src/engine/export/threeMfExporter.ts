import type { BufferGeometry } from 'three'
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

function geometryToMeshXml(geometry: BufferGeometry, scaleInput: number): string {
  const scale = isFinite(scaleInput) ? scaleInput : 1
  if (!('position' in geometry.attributes)) {
    return '        <vertices>\n        </vertices>\n        <triangles>\n        </triangles>\n'
  }
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
    for (let i = 0; i + 2 < index.count; i += 3) {
      parts.push(
        `          <triangle v1="${index.getX(i)}" v2="${index.getX(i + 1)}" v3="${index.getX(i + 2)}" />\n`,
      )
    }
  } else {
    for (let i = 0; i + 2 < positions.count; i += 3) {
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

// -- Minimal synchronous ZIP builder (STORE, no compression) --
// JSZip's generateAsync uses setTimeout-based chunking which suffers from
// browser minimum delays (~4ms per chunk), causing multi-second stalls for
// large payloads. This synchronous builder avoids that overhead entirely.

const crc32Table = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
  }
  crc32Table[i] = c
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

interface ZipFileEntry {
  name: string
  data: Uint8Array
}

function buildZipSync(entries: ZipFileEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const encoded = entries.map((e) => ({
    nameBytes: encoder.encode(e.name),
    data: e.data,
  }))

  // Calculate total size
  let totalSize = 22 // End of central directory
  for (const e of encoded) {
    totalSize += 30 + e.nameBytes.length + e.data.length // Local file header + data
    totalSize += 46 + e.nameBytes.length // Central directory entry
  }

  const buffer = new Uint8Array(totalSize)
  const view = new DataView(buffer.buffer)
  let offset = 0

  const headers: { nameBytes: Uint8Array; crc: number; size: number; localOffset: number }[] = []

  // Local file headers + data
  for (const e of encoded) {
    const crcVal = crc32(e.data)
    const localOffset = offset
    headers.push({ nameBytes: e.nameBytes, crc: crcVal, size: e.data.length, localOffset })

    view.setUint32(offset, 0x04034b50, true)
    offset += 4 // Signature
    view.setUint16(offset, 20, true)
    offset += 2 // Version needed
    view.setUint16(offset, 0, true)
    offset += 2 // Flags
    view.setUint16(offset, 0, true)
    offset += 2 // Compression (STORE)
    view.setUint16(offset, 0, true)
    offset += 2 // Mod time
    view.setUint16(offset, 0, true)
    offset += 2 // Mod date
    view.setUint32(offset, crcVal, true)
    offset += 4 // CRC-32
    view.setUint32(offset, e.data.length, true)
    offset += 4 // Compressed size
    view.setUint32(offset, e.data.length, true)
    offset += 4 // Uncompressed size
    view.setUint16(offset, e.nameBytes.length, true)
    offset += 2 // Filename length
    view.setUint16(offset, 0, true)
    offset += 2 // Extra field length
    buffer.set(e.nameBytes, offset)
    offset += e.nameBytes.length
    buffer.set(e.data, offset)
    offset += e.data.length
  }

  const centralDirOffset = offset

  // Central directory entries
  for (const h of headers) {
    view.setUint32(offset, 0x02014b50, true)
    offset += 4 // Signature
    view.setUint16(offset, 20, true)
    offset += 2 // Version made by
    view.setUint16(offset, 20, true)
    offset += 2 // Version needed
    view.setUint16(offset, 0, true)
    offset += 2 // Flags
    view.setUint16(offset, 0, true)
    offset += 2 // Compression (STORE)
    view.setUint16(offset, 0, true)
    offset += 2 // Mod time
    view.setUint16(offset, 0, true)
    offset += 2 // Mod date
    view.setUint32(offset, h.crc, true)
    offset += 4 // CRC-32
    view.setUint32(offset, h.size, true)
    offset += 4 // Compressed size
    view.setUint32(offset, h.size, true)
    offset += 4 // Uncompressed size
    view.setUint16(offset, h.nameBytes.length, true)
    offset += 2 // Filename length
    view.setUint16(offset, 0, true)
    offset += 2 // Extra field length
    view.setUint16(offset, 0, true)
    offset += 2 // File comment length
    view.setUint16(offset, 0, true)
    offset += 2 // Disk number start
    view.setUint16(offset, 0, true)
    offset += 2 // Internal attributes
    view.setUint32(offset, 0, true)
    offset += 4 // External attributes
    view.setUint32(offset, h.localOffset, true)
    offset += 4 // Local header offset
    buffer.set(h.nameBytes, offset)
    offset += h.nameBytes.length
  }

  const centralDirSize = offset - centralDirOffset

  // End of central directory
  view.setUint32(offset, 0x06054b50, true)
  offset += 4 // Signature
  view.setUint16(offset, 0, true)
  offset += 2 // Disk number
  view.setUint16(offset, 0, true)
  offset += 2 // Disk with central dir
  view.setUint16(offset, headers.length, true)
  offset += 2 // Entries on this disk
  view.setUint16(offset, headers.length, true)
  offset += 2 // Total entries
  view.setUint32(offset, centralDirSize, true)
  offset += 4 // Central dir size
  view.setUint32(offset, centralDirOffset, true)
  offset += 4 // Central dir offset
  view.setUint16(offset, 0, true) // Comment length

  return buffer
}

function build3MFBlob(modelXml: string): Blob {
  const encoder = new TextEncoder()
  const zipBytes = buildZipSync([
    { name: '[Content_Types].xml', data: encoder.encode(buildContentTypesXml()) },
    { name: '_rels/.rels', data: encoder.encode(buildRelsXml()) },
    { name: '3D/3dmodel.model', data: encoder.encode(modelXml) },
  ])
  return new Blob([new Uint8Array(zipBytes)], {
    type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
  })
}

/**
 * Export a single geometry as a 3MF file download.
 * Scale defaults to 1 since 3MF declares unit="millimeter" explicitly.
 */
export function exportObjectAs3MF(geometry: BufferGeometry, name: string, scale = 1): void {
  const meshXml = geometryToMeshXml(geometry, scale)
  const modelXml = buildModelXml([{ id: 1, name, meshXml }], [{ objectId: 1 }])
  const blob = build3MFBlob(modelXml)
  triggerDownload(blob, `${sanitizeFilename(name)}.3mf`)
}

/**
 * Export all print layout items as separate objects in a single 3MF file.
 * Each item becomes a separate <object> element with position pre-translated
 * into the geometry (consistent with exportAllAsSingleSTL approach).
 */
export function exportAllAs3MF(items: PrintLayoutItem[], scale = 1): void {
  if (items.length === 0) {
    console.warn('Export skipped: no objects in layout')
    return
  }

  const clones: BufferGeometry[] = []

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
    const blob = build3MFBlob(modelXml)
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
