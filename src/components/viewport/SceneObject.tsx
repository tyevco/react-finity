import { useMemo, useState } from 'react'
import type { Mesh } from 'three'
import { Edges } from '@react-three/drei'
import type {
  GridfinityObject,
  GridfinityProfile,
  Modifier,
  ModifierContext,
} from '@/types/gridfinity'
import { generateModifierGeometry } from '@/engine/export/mergeObjectGeometry'
import { objectKindRegistry } from '@/engine/registry/objectKindRegistry'
import { modifierKindRegistry } from '@/engine/registry/modifierKindRegistry'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { TransformGizmo } from './TransformGizmo'
import { isGizmoActive } from './gizmoState'

interface SceneObjectProps {
  object: GridfinityObject
}

interface ModifierMeshesProps {
  parentId: string
  context: ModifierContext
}

function ModifierMeshes({ parentId, context }: ModifierMeshesProps) {
  const allModifiers = useProjectStore((s) => s.modifiers)
  const modifiers = useMemo(
    () => allModifiers.filter((m) => m.parentId === parentId),
    [allModifiers, parentId],
  )
  const activeProfile = useProfileStore((s) => s.activeProfile)

  return (
    <>
      {modifiers.map((modifier) => (
        <ModifierMesh
          key={modifier.id}
          modifier={modifier}
          context={context}
          profile={activeProfile}
        />
      ))}
    </>
  )
}

interface ModifierMeshProps {
  modifier: Modifier
  context: ModifierContext
  profile: GridfinityProfile
}

function ModifierMesh({ modifier, context, profile }: ModifierMeshProps) {
  const curveQuality = useUIStore((s) => s.curveQuality)
  const showWireframe = useUIStore((s) => s.showWireframe)
  const transparencyMode = useUIStore((s) => s.transparencyMode)

  const geometry = useMemo(() => {
    return generateModifierGeometry(modifier, context, profile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modifier, context, profile, curveQuality])

  const childContext = useMemo((): ModifierContext | null => {
    const reg = modifierKindRegistry.get(modifier.kind)
    if (reg?.subdividesSpace && reg.computeChildContext) {
      return reg.computeChildContext(modifier.params as unknown as Record<string, unknown>, context)
    }
    return context
  }, [modifier, context])

  if (!geometry || !('position' in geometry.attributes)) return null

  const reg = modifierKindRegistry.get(modifier.kind)
  const color = reg?.color ?? '#cccccc'
  const opacity = transparencyMode ? 0.4 : 0.9

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          metalness={0.1}
          transparent
          opacity={opacity}
          wireframe={showWireframe}
        />
      </mesh>
      {childContext && <ModifierMeshes parentId={modifier.id} context={childContext} />}
    </>
  )
}

export function SceneObject({ object }: SceneObjectProps) {
  const [meshNode, setMeshNode] = useState<Mesh | null>(null)
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const selectedObjectIds = useUIStore((s) => s.selectedObjectIds)
  const selectObject = useUIStore((s) => s.selectObject)
  const showWireframe = useUIStore((s) => s.showWireframe)
  const transparencyMode = useUIStore((s) => s.transparencyMode)

  const curveQuality = useUIStore((s) => s.curveQuality)
  const isSelected = selectedObjectIds.includes(object.id)
  const isSingleSelected = selectedObjectIds.length === 1 && isSelected

  const geometry = useMemo(() => {
    const reg = objectKindRegistry.getOrThrow(object.kind)
    return reg.generateGeometry(object.params as unknown as Record<string, unknown>, activeProfile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.kind, object.params, activeProfile, curveQuality])

  const modifierContext = useMemo(() => {
    const reg = objectKindRegistry.get(object.kind)
    if (reg?.supportsModifiers && reg.computeModifierContext) {
      return reg.computeModifierContext(
        object.params as unknown as Record<string, unknown>,
        activeProfile,
      )
    }
    return null
  }, [object.kind, object.params, activeProfile])

  const objectOpacity = transparencyMode ? 0.5 : 1.0

  return (
    <>
      <mesh
        ref={setMeshNode}
        geometry={geometry}
        position={object.position}
        onClick={(e) => {
          e.stopPropagation()
          if (isGizmoActive()) return
          selectObject(object.id, e.shiftKey || e.ctrlKey || e.metaKey)
        }}
      >
        <meshStandardMaterial
          color={isSelected ? '#6b9bd2' : '#b0b0b0'}
          roughness={0.6}
          metalness={0.1}
          transparent={transparencyMode}
          opacity={objectOpacity}
          wireframe={showWireframe}
        />
        {isSelected && !showWireframe && <Edges threshold={15} color="#4a90d9" lineWidth={2} />}
      </mesh>
      {isSingleSelected && meshNode && <TransformGizmo target={meshNode} objectId={object.id} />}
      {modifierContext && (
        <group position={object.position}>
          <ModifierMeshes parentId={object.id} context={modifierContext} />
        </group>
      )}
    </>
  )
}
