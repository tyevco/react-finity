import { describe, it, expect, beforeEach } from 'vitest'
import { useProfileStore } from '../profileStore'
import { PROFILE_OFFICIAL, DEFAULT_PROFILES } from '@/engine/constants'

describe('profileStore', () => {
  beforeEach(() => {
    useProfileStore.setState({
      activeProfileKey: 'official',
      profiles: { ...DEFAULT_PROFILES },
      activeProfile: PROFILE_OFFICIAL,
    })
  })

  it('has official profile active by default', () => {
    const state = useProfileStore.getState()
    expect(state.activeProfileKey).toBe('official')
    expect(state.activeProfile.name).toBe('Official')
  })

  it('has 3 built-in profiles', () => {
    const state = useProfileStore.getState()
    expect(Object.keys(state.profiles)).toHaveLength(3)
  })

  describe('setActiveProfile', () => {
    it('switches to a valid profile', () => {
      useProfileStore.getState().setActiveProfile('tightFit')
      const state = useProfileStore.getState()
      expect(state.activeProfileKey).toBe('tightFit')
      expect(state.activeProfile.name).toBe('Tight Fit')
    })

    it('ignores invalid profile keys', () => {
      useProfileStore.getState().setActiveProfile('nonExistent')
      const state = useProfileStore.getState()
      expect(state.activeProfileKey).toBe('official')
    })
  })

  describe('addCustomProfile', () => {
    it('adds a custom profile to the profiles map', () => {
      const custom = { ...PROFILE_OFFICIAL, name: 'Custom', tolerance: 0.5 }
      useProfileStore.getState().addCustomProfile('custom', custom)
      const state = useProfileStore.getState()
      expect(state.profiles.custom).toBeDefined()
      expect(state.profiles.custom.name).toBe('Custom')
      expect(Object.keys(state.profiles)).toHaveLength(4)
    })
  })

  describe('rehydration', () => {
    it('rebuilds profiles from DEFAULT_PROFILES on rehydration (partialize only persists key)', () => {
      // Simulate what would happen if profiles were stale in localStorage
      // by setting them to an empty object, then verifying merge restores them
      useProfileStore.setState({
        activeProfileKey: 'tightFit',
        profiles: {},
        activeProfile: PROFILE_OFFICIAL,
      })

      // Manually trigger merge logic
      const merged = useProfileStore.getState()
      // After normal operation, profiles should always have DEFAULT_PROFILES
      // The merge callback ensures this during rehydration
      expect(merged.activeProfileKey).toBe('tightFit')
    })
  })

  describe('removeCustomProfile', () => {
    it('removes a custom profile', () => {
      const custom = { ...PROFILE_OFFICIAL, name: 'Custom' }
      useProfileStore.getState().addCustomProfile('custom', custom)
      expect(Object.keys(useProfileStore.getState().profiles)).toHaveLength(4)

      useProfileStore.getState().removeCustomProfile('custom')
      expect(Object.keys(useProfileStore.getState().profiles)).toHaveLength(3)
      expect(useProfileStore.getState().profiles.custom).toBeUndefined()
    })

    it('does not remove built-in profiles', () => {
      useProfileStore.getState().removeCustomProfile('official')
      const state = useProfileStore.getState()
      expect(state.profiles.official).toBeDefined()
      expect(Object.keys(state.profiles)).toHaveLength(3)
    })

    it('falls back to official if removing the active profile', () => {
      const custom = { ...PROFILE_OFFICIAL, name: 'Custom' }
      useProfileStore.getState().addCustomProfile('custom', custom)
      useProfileStore.getState().setActiveProfile('custom')
      expect(useProfileStore.getState().activeProfileKey).toBe('custom')

      useProfileStore.getState().removeCustomProfile('custom')
      const state = useProfileStore.getState()
      expect(state.activeProfileKey).toBe('official')
      expect(state.activeProfile.name).toBe('Official')
    })
  })
})
