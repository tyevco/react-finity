import { useEffect, useRef, type ComponentRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { Object3D } from 'three'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { useProfileStore } from '@/store/profileStore'

type TransformControlsRef = ComponentRef<typeof TransformControls>

interface TransformGizmoProps {
  target: Object3D
  objectId: string
}

export function TransformGizmo({ target, objectId }: TransformGizmoProps) {
  const controlsRef = useRef<TransformControlsRef>(null)
  const updateObjectPosition = useProjectStore((s) => s.updateObjectPosition)
  const snapEnabled = useUIStore((s) => s.snapToGrid)
  const gridSize = useProfileStore((s) => s.activeProfile.gridSize)
  const orbitControls = useThree((s) => s.controls)

  useEffect(() => {
    const tc = controlsRef.current
    if (!tc) return

    // TransformControls fires custom events not in Object3DEventMap,
    // so we use the underlying dispatchEvent API with type assertions.
    interface TCEvent {
      type: string
      value?: unknown
    }
    const evTarget = tc as unknown as {
      addEventListener(type: string, listener: (event: TCEvent) => void): void
      removeEventListener(type: string, listener: (event: TCEvent) => void): void
    }

    const handleDraggingChanged = (event: TCEvent) => {
      if (orbitControls) {
        ;(orbitControls as unknown as { enabled: boolean }).enabled = !event.value
      }
    }

    const handleMouseUp = () => {
      const pos: [number, number, number] = [
        target.position.x,
        target.position.y,
        target.position.z,
      ]
      updateObjectPosition(objectId, pos)
    }

    evTarget.addEventListener('dragging-changed', handleDraggingChanged)
    evTarget.addEventListener('mouseUp', handleMouseUp)

    return () => {
      evTarget.removeEventListener('dragging-changed', handleDraggingChanged)
      evTarget.removeEventListener('mouseUp', handleMouseUp)
    }
  }, [target, objectId, orbitControls, updateObjectPosition])

  return (
    <TransformControls
      ref={controlsRef}
      object={target}
      mode="translate"
      translationSnap={snapEnabled ? gridSize : null}
    />
  )
}
