import { describe, it, expect } from 'vitest'
import {
  PROFILE_OFFICIAL,
  PROFILE_TIGHT_FIT,
  PROFILE_LOOSE_FIT,
  DEFAULT_PROFILES,
  DEFAULT_BASEPLATE_PARAMS,
  DEFAULT_BIN_PARAMS,
  DEFAULT_DIVIDER_GRID_PARAMS,
  DEFAULT_LABEL_TAB_PARAMS,
  DEFAULT_SCOOP_PARAMS,
  DEFAULT_INSERT_PARAMS,
  DEFAULT_LID_PARAMS,
  PRINT_BED_PRESETS,
} from '../constants'

describe('profiles', () => {
  it('official profile has grid size 42mm', () => {
    expect(PROFILE_OFFICIAL.gridSize).toBe(42)
  })

  it('official profile has height unit 7mm', () => {
    expect(PROFILE_OFFICIAL.heightUnit).toBe(7)
  })

  it('tolerance ordering: tight < official < loose', () => {
    expect(PROFILE_TIGHT_FIT.tolerance).toBeLessThan(PROFILE_OFFICIAL.tolerance)
    expect(PROFILE_OFFICIAL.tolerance).toBeLessThan(PROFILE_LOOSE_FIT.tolerance)
  })

  it('all profiles have positive dimensions', () => {
    for (const profile of Object.values(DEFAULT_PROFILES)) {
      expect(profile.gridSize).toBeGreaterThan(0)
      expect(profile.heightUnit).toBeGreaterThan(0)
      expect(profile.wallThickness).toBeGreaterThan(0)
      expect(profile.tolerance).toBeGreaterThan(0)
    }
  })

  it('DEFAULT_PROFILES contains 3 built-in profiles', () => {
    expect(Object.keys(DEFAULT_PROFILES)).toHaveLength(3)
    expect(DEFAULT_PROFILES.official).toBeDefined()
    expect(DEFAULT_PROFILES.tightFit).toBeDefined()
    expect(DEFAULT_PROFILES.looseFit).toBeDefined()
  })
})

describe('default params', () => {
  it('baseplate has positive grid dimensions', () => {
    expect(DEFAULT_BASEPLATE_PARAMS.gridWidth).toBeGreaterThan(0)
    expect(DEFAULT_BASEPLATE_PARAMS.gridDepth).toBeGreaterThan(0)
  })

  it('bin has positive grid dimensions and height', () => {
    expect(DEFAULT_BIN_PARAMS.gridWidth).toBeGreaterThan(0)
    expect(DEFAULT_BIN_PARAMS.gridDepth).toBeGreaterThan(0)
    expect(DEFAULT_BIN_PARAMS.heightUnits).toBeGreaterThan(0)
  })

  it('bin has valid wall thickness', () => {
    expect(DEFAULT_BIN_PARAMS.wallThickness).toBeGreaterThan(0)
  })

  it('divider grid has positive values', () => {
    expect(DEFAULT_DIVIDER_GRID_PARAMS.dividersX).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_DIVIDER_GRID_PARAMS.dividersY).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_DIVIDER_GRID_PARAMS.wallThickness).toBeGreaterThan(0)
  })

  it('label tab has valid wall and positive angle/height', () => {
    const validWalls = ['front', 'back', 'left', 'right']
    expect(validWalls).toContain(DEFAULT_LABEL_TAB_PARAMS.wall)
    expect(DEFAULT_LABEL_TAB_PARAMS.angle).toBeGreaterThan(0)
    expect(DEFAULT_LABEL_TAB_PARAMS.height).toBeGreaterThan(0)
  })

  it('scoop has valid wall value', () => {
    const validWalls = ['front', 'back', 'left', 'right']
    expect(validWalls).toContain(DEFAULT_SCOOP_PARAMS.wall)
  })

  it('insert has positive compartment counts', () => {
    expect(DEFAULT_INSERT_PARAMS.compartmentsX).toBeGreaterThan(0)
    expect(DEFAULT_INSERT_PARAMS.compartmentsY).toBeGreaterThan(0)
  })

  it('lid default params exist', () => {
    expect(DEFAULT_LID_PARAMS).toBeDefined()
    expect(typeof DEFAULT_LID_PARAMS.stacking).toBe('boolean')
  })
})

describe('print bed presets', () => {
  it('all presets have positive dimensions', () => {
    for (const preset of Object.values(PRINT_BED_PRESETS)) {
      expect(preset.width).toBeGreaterThan(0)
      expect(preset.depth).toBeGreaterThan(0)
    }
  })

  it('includes 256x256 preset', () => {
    expect(PRINT_BED_PRESETS['256x256']).toBeDefined()
    expect(PRINT_BED_PRESETS['256x256'].width).toBe(256)
    expect(PRINT_BED_PRESETS['256x256'].depth).toBe(256)
  })

  it('all presets have a name', () => {
    for (const preset of Object.values(PRINT_BED_PRESETS)) {
      expect(preset.name.length).toBeGreaterThan(0)
    }
  })
})
