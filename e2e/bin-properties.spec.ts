import { test, expect } from '@playwright/test'

async function addBin(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Add Object/i }).click()
  await page.getByRole('menuitem', { name: 'Bin' }).click()
}

test.describe('Bin Properties Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await addBin(page)
  })

  test('shows bin properties when selected', async ({ page }) => {
    await expect(page.getByText('(bin)')).toBeVisible()
    await expect(page.getByText('Dimension Profile')).toBeVisible()
    await expect(page.getByText('Grid Width')).toBeVisible()
    await expect(page.getByText('Grid Depth')).toBeVisible()
    await expect(page.getByText('Height')).toBeVisible()
    await expect(page.getByText('Stacking Lip')).toBeVisible()
    await expect(page.getByText('Wall Thickness')).toBeVisible()
    await expect(
      page.getByText('Dimensions', { exact: true }),
    ).toBeVisible()
  })

  test('shows default dimensions for 1x1x3 bin', async ({ page }) => {
    // Default: gridWidth=1, gridDepth=1, heightUnits=3, Official profile
    // 1*42=42, 1*42=42, 3*7=21
    await expect(page.getByText('42 x 42 x 21 mm')).toBeVisible()
  })

  test('shows default grid and height values', async ({ page }) => {
    // Grid Width default is 1
    const widthSlider = page.getByRole('slider').first()
    await expect(widthSlider).toHaveAttribute('aria-valuenow', '1')

    // Grid Depth default is 1
    const depthSlider = page.getByRole('slider').nth(1)
    await expect(depthSlider).toHaveAttribute('aria-valuenow', '1')

    // Height default is 3
    const heightSlider = page.getByRole('slider').nth(2)
    await expect(heightSlider).toHaveAttribute('aria-valuenow', '3')
  })

  test('stacking lip toggle is on by default', async ({ page }) => {
    // Default: stackingLip=true
    const lipSwitch = page.getByRole('switch').first()
    await expect(lipSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('changing grid width slider updates dimensions', async ({ page }) => {
    const widthSlider = page.getByRole('slider').first()

    // Increase width from 1 to 3 using keyboard
    await widthSlider.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    // Width should now be 3: 3*42=126
    await expect(widthSlider).toHaveAttribute('aria-valuenow', '3')
    await expect(page.getByText('126 x 42 x 21 mm')).toBeVisible()
  })

  test('changing grid depth slider updates dimensions', async ({ page }) => {
    const depthSlider = page.getByRole('slider').nth(1)

    // Increase depth from 1 to 2 using keyboard
    await depthSlider.focus()
    await page.keyboard.press('ArrowRight')

    // Depth should now be 2: 2*42=84
    await expect(depthSlider).toHaveAttribute('aria-valuenow', '2')
    await expect(page.getByText('42 x 84 x 21 mm')).toBeVisible()
  })

  test('changing height slider updates dimensions', async ({ page }) => {
    const heightSlider = page.getByRole('slider').nth(2)

    // Increase height from 3 to 5
    await heightSlider.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    // Height should now be 5: 5*7=35
    await expect(heightSlider).toHaveAttribute('aria-valuenow', '5')
    await expect(page.getByText('42 x 42 x 35 mm')).toBeVisible()
  })

  test('toggling stacking lip switch changes state', async ({ page }) => {
    const lipSwitch = page.getByRole('switch').first()

    // Initially checked
    await expect(lipSwitch).toHaveAttribute('data-state', 'checked')

    // Toggle off
    await lipSwitch.click()
    await expect(lipSwitch).toHaveAttribute('data-state', 'unchecked')

    // Toggle back on
    await lipSwitch.click()
    await expect(lipSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('wall thickness slider shows default value', async ({ page }) => {
    // Default: wallThickness=1.2
    await expect(page.getByText('1.2mm')).toBeVisible()
  })

  test('changing wall thickness slider updates display', async ({ page }) => {
    // Wall thickness slider is the 4th slider (after width, depth, height)
    const thicknessSlider = page.getByRole('slider').nth(3)

    // Increase thickness
    await thicknessSlider.focus()
    await page.keyboard.press('ArrowRight')

    // Should update from 1.2 to 1.3
    await expect(page.getByText('1.3mm')).toBeVisible()
  })

  test('grid width value display updates with slider', async ({ page }) => {
    const widthLabel = page.getByText('Grid Width').locator('..')
    await expect(widthLabel.getByText('1u (42mm)')).toBeVisible()

    const widthSlider = page.getByRole('slider').first()
    await widthSlider.focus()
    await page.keyboard.press('ArrowRight')

    await expect(widthLabel.getByText('2u (84mm)')).toBeVisible()
  })

  test('height value display updates with slider', async ({ page }) => {
    const heightLabel = page.getByText('Height').locator('..')
    await expect(heightLabel.getByText('3u (21mm)')).toBeVisible()

    const heightSlider = page.getByRole('slider').nth(2)
    await heightSlider.focus()
    await page.keyboard.press('ArrowRight')

    await expect(heightLabel.getByText('4u (28mm)')).toBeVisible()
  })

  test('changing profile preserves bin dimensions display', async ({ page }) => {
    // Default is "Official" profile
    const selectTrigger = page.getByRole('combobox')
    await selectTrigger.click()

    // Select "Tight Fit"
    await page.getByRole('option', { name: 'Tight Fit' }).click()

    // Grid dimensions remain the same (gridSize=42)
    await expect(page.getByText('42 x 42 x 21 mm')).toBeVisible()
  })
})
