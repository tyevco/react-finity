// Module-level flag to suppress selection clicks while the transform gizmo
// is being dragged. Shared between TransformGizmo and SceneObject.

let gizmoActive = false
let gizmoActiveTimer: ReturnType<typeof setTimeout> | null = null

export function setGizmoActive(active: boolean): void {
  if (active) {
    if (gizmoActiveTimer) clearTimeout(gizmoActiveTimer)
    gizmoActive = true
  } else {
    // Keep flag set briefly so the trailing click event that fires
    // on mouseUp doesn't change the selection.
    gizmoActiveTimer = setTimeout(() => {
      gizmoActive = false
    }, 50)
  }
}

export function isGizmoActive(): boolean {
  return gizmoActive
}
