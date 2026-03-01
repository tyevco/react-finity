import { useEffect, useMemo } from 'react'
import { DoubleSide, PlaneGeometry } from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei'
import { usePrintLayout } from '@/hooks/usePrintLayout'
import type { PrintLayoutItem } from '@/engine/export/printLayout'

function PrintBed({ width, depth }: { width: number; depth: number }) {
  const gridSize = 42 // Gridfinity grid spacing in mm

  const divisionsX = Math.floor(width / gridSize)
  const divisionsZ = Math.floor(depth / gridSize)
  const divisions = Math.max(divisionsX, divisionsZ)
  const size = Math.max(width, depth)

  // Memoize the PlaneGeometry used for the bed outline edges to prevent leaks
  const outlinePlaneGeo = useMemo(() => new PlaneGeometry(width, depth), [width, depth])
  useEffect(() => {
    return () => {
      outlinePlaneGeo.dispose()
    }
  }, [outlinePlaneGeo])

  return (
    <>
      {/* Bed surface */}
      <mesh position={[width / 2, -0.1, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#2a2a3e" transparent opacity={0.8} side={DoubleSide} />
      </mesh>

      {/* Bed outline */}
      <lineSegments position={[width / 2, 0.05, depth / 2]}>
        <edgesGeometry args={[outlinePlaneGeo]} />
        <lineBasicMaterial color="#6b9bd2" linewidth={2} />
      </lineSegments>

      {/* Grid overlay */}
      <Grid
        position={[width / 2, 0, depth / 2]}
        args={[size, size]}
        cellSize={gridSize}
        cellThickness={0.5}
        cellColor="#444444"
        sectionSize={gridSize * (divisions || 1)}
        sectionThickness={1}
        sectionColor="#333333"
        fadeDistance={0}
        infiniteGrid={false}
      />
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
  const { layoutItems, bed } = usePrintLayout()

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
        <PrintObject key={item.id} item={item} />
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
