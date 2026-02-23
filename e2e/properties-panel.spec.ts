import { test, expect } from '@playwright/test'
import { addBaseplate } from './fixtures'

test.describe('Properties Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await addBaseplate(page)
  })

  test('shows baseplate properties when selected', async ({ page }) => {
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await expect(page.getByText('Dimension Profile')).toBeVisible()
    await expect(page.getByText('Grid Width')).toBeVisible()
    await expect(page.getByText('Grid Depth')).toBeVisible()
    await expect(page.getByText('Magnet Holes')).toBeVisible()
    await expect(page.getByText('Screw Holes')).toBeVisible()
    await expect(page.getByText('Dimensions', { exact: true })).toBeVisible()
  })

  test('shows default dimensions for 3x3 baseplate', async ({ page }) => {
    // Default: gridWidth=3, gridDepth=3, Official profile (gridSize=42, height=7)
    // 3*42=126, 3*42=126, height=7
    await expect(page.getByTestId('dimensions-readout')).toHaveText('126 x 126 x 7 mm')
  })

  test('shows default grid values', async ({ page }) => {
    // Grid Width default is 3
    const widthSlider = page.getByRole('slider').first()
    await expect(widthSlider).toHaveAttribute('aria-valuenow', '3')

    // Grid Depth default is 3
    const depthSlider = page.getByRole('slider').nth(1)
    await expect(depthSlider).toHaveAttribute('aria-valuenow', '3')
  })

  test('magnet holes toggle is on by default', async ({ page }) => {
    // Default: magnetHoles=true
    const magnetSwitch = page.getByRole('switch').first()
    await expect(magnetSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('screw holes toggle is off by default', async ({ page }) => {
    // Default: screwHoles=false
    const screwSwitch = page.getByRole('switch').nth(1)
    await expect(screwSwitch).toHaveAttribute('data-state', 'unchecked')
  })

  test('changing grid width slider updates dimensions', async ({ page }) => {
    const widthSlider = page.getByRole('slider').first()

    // Increase width from 3 to 5 using keyboard
    await widthSlider.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    // Width should now be 5: 5*42=210
    await expect(widthSlider).toHaveAttribute('aria-valuenow', '5')
    await expect(page.getByTestId('dimensions-readout')).toHaveText('210 x 126 x 7 mm')
  })

  test('changing grid depth slider updates dimensions', async ({ page }) => {
    const depthSlider = page.getByRole('slider').nth(1)

    // Decrease depth from 3 to 1 using keyboard
    await depthSlider.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')

    // Depth should now be 1: 1*42=42
    await expect(depthSlider).toHaveAttribute('aria-valuenow', '1')
    await expect(page.getByTestId('dimensions-readout')).toHaveText('126 x 42 x 7 mm')
  })

  test('toggling magnet holes switch changes state', async ({ page }) => {
    const magnetSwitch = page.getByRole('switch').first()

    // Initially checked
    await expect(magnetSwitch).toHaveAttribute('data-state', 'checked')

    // Toggle off
    await magnetSwitch.click()
    await expect(magnetSwitch).toHaveAttribute('data-state', 'unchecked')

    // Toggle back on
    await magnetSwitch.click()
    await expect(magnetSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('toggling screw holes switch changes state', async ({ page }) => {
    const screwSwitch = page.getByRole('switch').nth(1)

    // Initially unchecked
    await expect(screwSwitch).toHaveAttribute('data-state', 'unchecked')

    // Toggle on
    await screwSwitch.click()
    await expect(screwSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('changing profile updates dimensions', async ({ page }) => {
    // Default is "Official" profile. Click the select trigger to open.
    const selectTrigger = page.getByRole('combobox')
    await selectTrigger.click()

    // Wait for option to appear then click
    const tightFit = page.getByRole('option', { name: 'Tight Fit' })
    await expect(tightFit).toBeVisible()
    await tightFit.click()

    // Tight Fit has tolerance=0.1 vs Official tolerance=0.25
    // But the grid dimensions are the same (gridSize=42) so the mm dimensions
    // remain 126 x 126 x 7. The profile name should be shown though.
    await expect(page.getByTestId('dimensions-readout')).toHaveText('126 x 126 x 7 mm')

    // Switch to "Loose Fit"
    await selectTrigger.click()
    const looseFit = page.getByRole('option', { name: 'Loose Fit' })
    await expect(looseFit).toBeVisible()
    await looseFit.click()
    await expect(page.getByTestId('dimensions-readout')).toHaveText('126 x 126 x 7 mm')

    // Switch back to "Official"
    await selectTrigger.click()
    const official = page.getByRole('option', { name: 'Official' })
    await expect(official).toBeVisible()
    await official.click()
    await expect(page.getByTestId('dimensions-readout')).toHaveText('126 x 126 x 7 mm')
  })

  test('grid width value display updates with slider', async ({ page }) => {
    // Initially both show "3u (126mm)" - use first for Grid Width
    const widthLabel = page.getByText('Grid Width').locator('..')
    await expect(widthLabel.getByText('3u (126mm)')).toBeVisible()

    const widthSlider = page.getByRole('slider').first()
    await widthSlider.focus()
    await page.keyboard.press('ArrowRight')

    // Should now show "4u (168mm)"
    await expect(widthLabel.getByText('4u (168mm)')).toBeVisible()
  })
})
