import { useMemo } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { PRINT_BED_PRESETS } from '@/engine/constants'
import { computePrintLayout, disposePrintLayout } from '@/engine/export/printLayout'
import type { PrintLayoutItem } from '@/engine/export/printLayout'

function PrintBed({ width, depth }: { width: number; depth: number }) {
  const gridSize = 42 // Gridfinity grid spacing in mm

  const gridHelper = useMemo(() => {
    const divisionsX = Math.floor(width / gridSize)
    const divisionsZ = Math.floor(depth / gridSize)
    const divisions = Math.max(divisionsX, divisionsZ)
    const size = Math.max(width, depth)
    const grid = new THREE.GridHelper(size, divisions, '#444444', '#333333')
    grid.position.set(width / 2, 0, depth / 2)
    return grid
  }, [width, depth])

  return (
    <>
      {/* Bed surface */}
      <mesh position={[width / 2, -0.1, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#2a2a3e" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Bed outline */}
      <lineSegments position={[width / 2, 0.05, depth / 2]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, depth)]} />
        <lineBasicMaterial color="#6b9bd2" linewidth={2} />
      </lineSegments>

      {/* Grid overlay */}
      <primitive object={gridHelper} />
    </>
  )
}

function PrintObject({ item }: { item: PrintLayoutItem }) {
  const [x, y, z] = item.position

  return (
    <mesh geometry={item.geometry} position={[x, y, z]}>
      <meshStandardMaterial
        color={item.fitsOnBed ? '#b0b0b0' : '#e74c3c'}
        roughness={0.6}
        metalness={0.1}
        transparent={!item.fitsOnBed}
        opacity={item.fitsOnBed ? 1 : 0.7}
      />
    </mesh>
  )
}

function PrintScene() {
  const objects = useProjectStore((s) => s.objects)
  const modifiers = useProjectStore((s) => s.modifiers)
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const printBedPreset = useUIStore((s) => s.printBedPreset)
  const printBedSpacing = useUIStore((s) => s.printBedSpacing)

  const bed = PRINT_BED_PRESETS[printBedPreset] ?? PRINT_BED_PRESETS['256x256']

  const layoutItems = useMemo(() => {
    if (objects.length === 0) return []
    const items = computePrintLayout(
      objects,
      modifiers,
      activeProfile,
      bed.width,
      bed.depth,
      printBedSpacing,
    )
    return items
  }, [objects, modifiers, activeProfile, bed.width, bed.depth, printBedSpacing])

  // Dispose previous layout geometries on unmount/recompute
  useMemo(() => {
    return () => {
      disposePrintLayout(layoutItems)
    }
  }, [layoutItems])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[200, 400, 200]} intensity={0.8} />
      <directionalLight position={[-100, 200, -100]} intensity={0.3} />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        minDistance={20}
        maxDistance={2000}
        enableDamping
        dampingFactor={0.1}
      />

      {/* Print bed */}
      <PrintBed width={bed.width} depth={bed.depth} />

      {/* Objects on the print bed */}
      {layoutItems.map((item) => (
        <PrintObject key={item.object.id} item={item} />
      ))}

      {/* Gizmo helper */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport axisColors={['#e74c3c', '#2ecc71', '#3498db']} labelColor="white" />
      </GizmoHelper>
    </>
  )
}

export function PrintLayoutViewport() {
  return (
    <div className="h-full w-full touch-manipulation">
      <Canvas
        camera={{
          position: [200, 300, 200],
          fov: 50,
          near: 0.1,
          far: 10000,
        }}
        shadows
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 1000, 3000]} />
        <PrintScene />
      </Canvas>
    </div>
  )
}
