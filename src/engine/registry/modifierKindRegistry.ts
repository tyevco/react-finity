import type { ModifierKindRegistration } from './types'

class ModifierKindRegistry {
  private registrations = new Map<string, ModifierKindRegistration>()
  private frozen = false

  register<TParams>(registration: ModifierKindRegistration<TParams>): void {
    if (this.frozen) {
      throw new Error(
        `ModifierKindRegistry is frozen. Cannot register kind "${registration.kind}".`,
      )
    }
    if (this.registrations.has(registration.kind)) {
      throw new Error(`Modifier kind "${registration.kind}" is already registered.`)
    }
    if (registration.subdividesSpace && !registration.computeChildContext) {
      throw new Error(
        `Modifier kind "${registration.kind}" has subdividesSpace=true but no computeChildContext function.`,
      )
    }
    this.registrations.set(registration.kind, registration as unknown as ModifierKindRegistration)
  }

  get(kind: string): ModifierKindRegistration | undefined {
    return this.registrations.get(kind)
  }

  getOrThrow(kind: string): ModifierKindRegistration {
    const reg = this.registrations.get(kind)
    if (!reg) {
      throw new Error(`Unknown modifier kind: "${kind}". Did you forget to register it?`)
    }
    return reg
  }

  getAll(): ModifierKindRegistration[] {
    return Array.from(this.registrations.values())
  }

  getAllKinds(): string[] {
    return Array.from(this.registrations.keys())
  }

  has(kind: string): boolean {
    return this.registrations.has(kind)
  }

  getForParent(parentKind: string): ModifierKindRegistration[] {
    return this.getAll().filter((reg) => {
      if (!reg.allowedParentKinds) return true
      return reg.allowedParentKinds.includes(parentKind)
    })
  }

  freeze(): void {
    this.frozen = true
  }

  unfreeze(): void {
    this.frozen = false
  }

  /** Clear all registrations. Used in tests. */
  clear(): void {
    this.registrations.clear()
    this.frozen = false
  }
}

export const modifierKindRegistry = new ModifierKindRegistry()
