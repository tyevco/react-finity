import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GridfinityProfile } from '@/types/gridfinity'
import { DEFAULT_PROFILES, PROFILE_OFFICIAL } from '@/engine/constants'

interface ProfileStore {
  activeProfileKey: string
  profiles: Record<string, GridfinityProfile>
  activeProfile: GridfinityProfile
  setActiveProfile: (key: string) => void
  addCustomProfile: (key: string, profile: GridfinityProfile) => void
  removeCustomProfile: (key: string) => void
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      activeProfileKey: 'official',
      profiles: { ...DEFAULT_PROFILES },
      activeProfile: PROFILE_OFFICIAL,

      setActiveProfile: (key: string) => {
        const profile = get().profiles[key] as GridfinityProfile | undefined
        if (profile) {
          set({ activeProfileKey: key, activeProfile: profile })
        }
      },

      addCustomProfile: (key: string, profile: GridfinityProfile) => {
        set((state) => ({
          profiles: { ...state.profiles, [key]: profile },
        }))
      },

      removeCustomProfile: (key: string) => {
        // Don't allow removing built-in profiles
        if (key in DEFAULT_PROFILES) return
        set((state) => {
          const { [key]: _, ...rest } = state.profiles
          const newState: Partial<ProfileStore> = { profiles: rest }
          // If removing active profile, switch to official
          if (state.activeProfileKey === key) {
            newState.activeProfileKey = 'official'
            newState.activeProfile = PROFILE_OFFICIAL
          }
          return newState
        })
      },
    }),
    {
      name: 'react-finity-profiles',
      partialize: (state) => ({
        activeProfileKey: state.activeProfileKey,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ProfileStore> | undefined
        const key = persistedState?.activeProfileKey ?? current.activeProfileKey
        const profiles = { ...DEFAULT_PROFILES }
        const activeProfile = profiles[key] ?? PROFILE_OFFICIAL
        return {
          ...current,
          activeProfileKey: key,
          profiles,
          activeProfile,
        }
      },
    },
  ),
)
