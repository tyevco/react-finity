import type { ObjectKindRegistration } from './types'

class ObjectKindRegistry {
  private registrations = new Map<string, ObjectKindRegistration>()
  private frozen = false

  register<TParams>(registration: ObjectKindRegistration<TParams>): void {
    if (this.frozen) {
      throw new Error(`ObjectKindRegistry is frozen. Cannot register kind "${registration.kind}".`)
    }
    if (this.registrations.has(registration.kind)) {
      throw new Error(`Object kind "${registration.kind}" is already registered.`)
    }
    this.registrations.set(registration.kind, registration as unknown as ObjectKindRegistration)
  }

  get(kind: string): ObjectKindRegistration | undefined {
    return this.registrations.get(kind)
  }

  getOrThrow(kind: string): ObjectKindRegistration {
    const reg = this.registrations.get(kind)
    if (!reg) {
      throw new Error(`Unknown object kind: "${kind}". Did you forget to register it?`)
    }
    return reg
  }

  getAll(): ObjectKindRegistration[] {
    return Array.from(this.registrations.values())
  }

  getAllKinds(): string[] {
    return Array.from(this.registrations.keys())
  }

  has(kind: string): boolean {
    return this.registrations.has(kind)
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

export const objectKindRegistry = new ObjectKindRegistry()
