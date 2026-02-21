import { useMemo, useState } from 'react'
import type { Mesh } from 'three'
import { Edges } from '@react-three/drei'
import type { GridfinityObject } from '@/types/gridfinity'
import { generateBaseplate } from '@/engine/geometry/baseplate'
import { generateBin } from '@/engine/geometry/bin'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { TransformGizmo } from './TransformGizmo'

interface SceneObjectProps {
  object: GridfinityObject
}

export function SceneObject({ object }: SceneObjectProps) {
  const [meshNode, setMeshNode] = useState<Mesh | null>(null)
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const selectedObjectId = useUIStore((s) => s.selectedObjectId)
  const selectObject = useUIStore((s) => s.selectObject)

  const isSelected = selectedObjectId === object.id

  const geometry = useMemo(() => {
    switch (object.kind) {
      case 'baseplate':
        return generateBaseplate(object.params, activeProfile)
      case 'bin':
        return generateBin(object.params, activeProfile)
      default:
        return null
    }
  }, [object.kind, object.params, activeProfile])

  if (!geometry) return null

  return (
    <>
      <mesh
        ref={setMeshNode}
        geometry={geometry}
        position={object.position}
        onClick={(e) => {
          e.stopPropagation()
          selectObject(object.id)
        }}
      >
        <meshStandardMaterial
          color={isSelected ? '#6b9bd2' : '#b0b0b0'}
          roughness={0.6}
          metalness={0.1}
        />
        {isSelected && <Edges threshold={15} color="#4a90d9" lineWidth={2} />}
      </mesh>
      {isSelected && meshNode && <TransformGizmo target={meshNode} objectId={object.id} />}
    </>
  )
}
