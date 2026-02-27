import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileSelector } from '../ProfileSelector'
import { useProfileStore } from '@/store/profileStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import { DEFAULT_PROFILES, PROFILE_OFFICIAL } from '@/engine/constants'

beforeAll(() => {
  registerBuiltinKinds()
})

describe('ProfileSelector', () => {
  beforeEach(() => {
    useProfileStore.setState({
      activeProfileKey: 'official',
      profiles: { ...DEFAULT_PROFILES },
      activeProfile: PROFILE_OFFICIAL,
    })
  })

  it('renders "Dimension Profile" label', () => {
    render(<ProfileSelector />)
    expect(screen.getByText('Dimension Profile')).toBeInTheDocument()
  })

  it('renders a combobox for profile selection', () => {
    render(<ProfileSelector />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('opens dropdown and shows all profile options', async () => {
    const user = userEvent.setup()
    render(<ProfileSelector />)
    await user.click(screen.getByRole('combobox'))
    // "Official" appears both in trigger and dropdown, so use getAllByText
    expect(screen.getAllByText('Official').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Tight Fit')).toBeInTheDocument()
    expect(screen.getByText('Loose Fit')).toBeInTheDocument()
  })

  it('calls setActiveProfile when selecting a profile', async () => {
    const user = userEvent.setup()
    render(<ProfileSelector />)
    await user.click(screen.getByRole('combobox'))
    // Select "Tight Fit" from dropdown options
    await user.click(screen.getByRole('option', { name: 'Tight Fit' }))
    expect(useProfileStore.getState().activeProfileKey).toBe('tightFit')
  })
})
