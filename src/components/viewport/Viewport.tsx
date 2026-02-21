import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'
import { GridOverlay } from './GridOverlay'
import { SceneObject } from './SceneObject'
import { MeasurementOverlay } from './MeasurementOverlay'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import type { ViewportBackground, LightingPreset, CameraPreset } from '@/types/gridfinity'

const BACKGROUND_COLORS: Record<ViewportBackground, string> = {
  dark: '#1a1a2e',
  light: '#d4d4d8',
  neutral: '#404040',
}

const LIGHTING_PRESETS: Record<
  LightingPreset,
  {
    ambient: number
    lights: { position: [number, number, number]; intensity: number }[]
  }
> = {
  studio: {
    ambient: 0.5,
    lights: [
      { position: [200, 300, 200], intensity: 1.0 },
      { position: [-100, 200, -100], intensity: 0.3 },
    ],
  },
  outdoor: {
    ambient: 0.7,
    lights: [
      { position: [300, 500, 100], intensity: 1.2 },
      { position: [-200, 100, 200], intensity: 0.2 },
    ],
  },
  soft: {
    ambient: 0.8,
    lights: [
      { position: [100, 200, 100], intensity: 0.6 },
      { position: [-100, 200, -100], intensity: 0.5 },
      { position: [0, 300, 0], intensity: 0.3 },
    ],
  },
}

const CAMERA_POSITIONS: Record<
  CameraPreset,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  top: { position: [0, 400, 0.01], target: [0, 0, 0] },
  front: { position: [0, 50, 400], target: [0, 50, 0] },
  side: { position: [400, 50, 0], target: [0, 50, 0] },
  isometric: { position: [200, 150, 200], target: [0, 0, 0] },
}

function CameraController() {
  const cameraPreset = useUIStore((s) => s.cameraPreset)
  const setCameraPreset = useUIStore((s) => s.setCameraPreset)
  const { camera } = useThree()
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null

  useEffect(() => {
    if (!cameraPreset || !controls) return
    const preset = CAMERA_POSITIONS[cameraPreset]
    camera.position.set(...preset.position)
    controls.target.set(...preset.target)
    controls.update()
    setCameraPreset(null)
  }, [cameraPreset, camera, controls, setCameraPreset])

  return null
}

function Scene() {
  const objects = useProjectStore((s) => s.objects)
  const selectObject = useUIStore((s) => s.selectObject)
  const selectedObjectId = useUIStore((s) => s.selectedObjectId)
  const lightingPreset = useUIStore((s) => s.lightingPreset)
  const showMeasurements = useUIStore((s) => s.showMeasurements)

  const lighting = LIGHTING_PRESETS[lightingPreset]
  const selectedObject = objects.find((o) => o.id === selectedObjectId) ?? null

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={lighting.ambient} />
      {lighting.lights.map((light, i) => (
        <directionalLight
          key={`${lightingPreset}-${i}`}
          position={light.position}
          intensity={light.intensity}
          castShadow={i === 0}
          shadow-mapSize={i === 0 ? [1024, 1024] : undefined}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        minDistance={20}
        maxDistance={2000}
        enableDamping
        dampingFactor={0.1}
      />

      {/* Camera preset controller */}
      <CameraController />

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

      {/* Measurement overlay */}
      {showMeasurements && selectedObject && <MeasurementOverlay object={selectedObject} />}

      {/* Gizmo helper - axis indicator in corner */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport axisColors={['#e74c3c', '#2ecc71', '#3498db']} labelColor="white" />
      </GizmoHelper>
    </>
  )
}

export function Viewport() {
  const selectObject = useUIStore((s) => s.selectObject)
  const viewportBackground = useUIStore((s) => s.viewportBackground)
  const bgColor = BACKGROUND_COLORS[viewportBackground]

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
        onPointerMissed={() => {
          selectObject(null)
        }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 1000, 3000]} />
        <Scene />
      </Canvas>
    </div>
  )
}
