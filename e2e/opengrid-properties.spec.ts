import { test, expect } from '@playwright/test'
import { addOpenGridBoard } from './fixtures'

test.describe('OpenGrid Board Properties', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await addOpenGridBoard(page)
  })

  test('shows OpenGrid Board properties when selected', async ({ page }) => {
    await expect(page.getByText('(opengridBoard)')).toBeVisible()
    await expect(page.getByText('Grid Width')).toBeVisible()
    await expect(page.getByText('Grid Depth')).toBeVisible()
    await expect(page.getByText('Variant')).toBeVisible()
    await expect(page.getByText('Orientation')).toBeVisible()
    await expect(page.getByText('Dimensions', { exact: true })).toBeVisible()
  })

  test('shows default dimensions for 4x4 full board', async ({ page }) => {
    // Default: gridWidth=4, gridDepth=4, variant=full (6.8mm), 4*28=112
    await expect(page.getByTestId('dimensions-readout')).toHaveText('112 x 112 x 6.8 mm')
  })

  test('shows default grid values', async ({ page }) => {
    // Grid Width default is 4
    const widthSlider = page.getByRole('slider').first()
    await expect(widthSlider).toHaveAttribute('aria-valuenow', '4')

    // Grid Depth default is 4
    const depthSlider = page.getByRole('slider').nth(1)
    await expect(depthSlider).toHaveAttribute('aria-valuenow', '4')
  })

  test('changing grid width slider updates dimensions', async ({ page }) => {
    const widthSlider = page.getByRole('slider').first()

    // Decrease width from 4 to 2 using keyboard
    await widthSlider.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')

    // Width should now be 2: 2*28=56
    await expect(widthSlider).toHaveAttribute('aria-valuenow', '2')
    await expect(page.getByTestId('dimensions-readout')).toHaveText('56 x 112 x 6.8 mm')
  })

  test('changing grid depth slider updates dimensions', async ({ page }) => {
    const depthSlider = page.getByRole('slider').nth(1)

    // Increase depth from 4 to 6 using keyboard
    await depthSlider.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    // Depth should now be 6: 6*28=168
    await expect(depthSlider).toHaveAttribute('aria-valuenow', '6')
    await expect(page.getByTestId('dimensions-readout')).toHaveText('112 x 168 x 6.8 mm')
  })

  test('variant select changes between Full and Lite', async ({ page }) => {
    // Default is Full (6.8mm)
    await expect(page.getByTestId('dimensions-readout')).toHaveText('112 x 112 x 6.8 mm')

    // Open variant select and choose Lite
    const variantTrigger = page.getByRole('combobox').first()
    await variantTrigger.click()
    await page.getByRole('option', { name: /Lite/ }).click()

    // Should now show Lite thickness (4.0mm)
    await expect(page.getByTestId('dimensions-readout')).toHaveText('112 x 112 x 4 mm')

    // Switch back to Full
    await variantTrigger.click()
    await page.getByRole('option', { name: /Full/ }).click()
    await expect(page.getByTestId('dimensions-readout')).toHaveText('112 x 112 x 6.8 mm')
  })

  test('orientation select changes between Flat and Wall', async ({ page }) => {
    // Open orientation select (second combobox) and choose Wall
    const orientationTrigger = page.getByRole('combobox').nth(1)
    await orientationTrigger.click()
    await page.getByRole('option', { name: 'Wall' }).click()

    // Dimensions should remain the same (orientation doesn't change dimensions)
    await expect(page.getByTestId('dimensions-readout')).toHaveText('112 x 112 x 6.8 mm')

    // Switch back to Flat
    await orientationTrigger.click()
    await page.getByRole('option', { name: 'Flat' }).click()
    await expect(page.getByTestId('dimensions-readout')).toHaveText('112 x 112 x 6.8 mm')
  })

  test('grid width value display updates with slider', async ({ page }) => {
    // Initially shows "4u (112mm)"
    const widthLabel = page.getByText('Grid Width').locator('..')
    await expect(widthLabel.getByText('4u (112mm)')).toBeVisible()

    const widthSlider = page.getByRole('slider').first()
    await widthSlider.focus()
    await page.keyboard.press('ArrowRight')

    // Should now show "5u (140mm)"
    await expect(widthLabel.getByText('5u (140mm)')).toBeVisible()
  })
})
