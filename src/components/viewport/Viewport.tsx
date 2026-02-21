import { Canvas } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { GridOverlay } from './GridOverlay'
import { SceneObject } from './SceneObject'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'

function Scene() {
  const objects = useProjectStore((s) => s.objects)
  const selectObject = useUIStore((s) => s.selectObject)

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[200, 300, 200]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-100, 200, -100]} intensity={0.3} />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        minDistance={20}
        maxDistance={2000}
        enableDamping
        dampingFactor={0.1}
      />

      {/* Grid */}
      <GridOverlay />

      {/* Scene objects */}
      <group
        onClick={(e) => {
          // Only deselect if clicking on empty space (not on an object)
          if (e.object.type === 'GridHelper' || e.object.type === 'Mesh') return
          selectObject(null)
        }}
      >
        {objects.map((obj) => (
          <SceneObject key={obj.id} object={obj} />
        ))}
      </group>

      {/* Gizmo helper - axis indicator in corner */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport
          axisColors={['#e74c3c', '#2ecc71', '#3498db']}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  )
}

export function Viewport() {
  const selectObject = useUIStore((s) => s.selectObject)

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{
          position: [200, 150, 200],
          fov: 50,
          near: 0.1,
          far: 10000,
        }}
        shadows
        gl={{ antialias: true }}
        onPointerMissed={() => selectObject(null)}
      >
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 1000, 3000]} />
        <Scene />
      </Canvas>
    </div>
  )
}
