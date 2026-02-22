import { useMemo, useState } from 'react'
import type { Mesh } from 'three'
import { Edges } from '@react-three/drei'
import type {
  GridfinityObject,
  GridfinityProfile,
  Modifier,
  ModifierContext,
  ModifierKind,
} from '@/types/gridfinity'
import { generateBaseplate } from '@/engine/geometry/baseplate'
import { generateBin } from '@/engine/geometry/bin'
import { generateModifierGeometry, computeBinContext } from '@/engine/export/mergeObjectGeometry'
import { useProjectStore } from '@/store/projectStore'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { TransformGizmo } from './TransformGizmo'

const MODIFIER_COLORS: Record<ModifierKind, string> = {
  dividerGrid: '#a8d8ea',
  labelTab: '#f9c784',
  scoop: '#b5e8b5',
  insert: '#d4a5e5',
  lid: '#f5a5a5',
}

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

  // Compute child context for nested modifiers
  const childContext = useMemo((): ModifierContext | null => {
    if (modifier.kind === 'dividerGrid') {
      const { dividersX, dividersY, wallThickness } = modifier.params
      if (dividersX === 0 && dividersY === 0) return context
      const compartmentWidth = (context.innerWidth - wallThickness * dividersX) / (dividersX + 1)
      const compartmentDepth = (context.innerDepth - wallThickness * dividersY) / (dividersY + 1)
      return {
        innerWidth: compartmentWidth,
        innerDepth: compartmentDepth,
        wallHeight: context.wallHeight,
        floorY: context.floorY,
        centerX: context.centerX,
        centerZ: context.centerZ,
      }
    }
    if (modifier.kind === 'insert') {
      const { compartmentsX, compartmentsY, wallThickness } = modifier.params
      const rimInnerWidth = context.innerWidth - wallThickness * 2
      const rimInnerDepth = context.innerDepth - wallThickness * 2
      const compartmentWidth = (rimInnerWidth - wallThickness * (compartmentsX - 1)) / compartmentsX
      const compartmentDepth = (rimInnerDepth - wallThickness * (compartmentsY - 1)) / compartmentsY
      return {
        innerWidth: compartmentWidth,
        innerDepth: compartmentDepth,
        wallHeight: context.wallHeight,
        floorY: context.floorY,
        centerX: context.centerX,
        centerZ: context.centerZ,
      }
    }
    return context
  }, [modifier, context])

  if (!geometry || !('position' in geometry.attributes)) return null

  const color = MODIFIER_COLORS[modifier.kind]
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
    switch (object.kind) {
      case 'baseplate':
        return generateBaseplate(object.params, activeProfile)
      case 'bin':
        return generateBin(object.params, activeProfile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.kind, object.params, activeProfile, curveQuality])

  const binContext = useMemo(() => {
    if (object.kind === 'bin') {
      return computeBinContext(object.params, activeProfile)
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
      {binContext && (
        <group position={object.position}>
          <ModifierMeshes parentId={object.id} context={binContext} />
        </group>
      )}
    </>
  )
}
