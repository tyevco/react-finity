import { test, expect } from '@playwright/test'
import { addBin } from './fixtures'

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
    await expect(page.getByText('Dimensions', { exact: true })).toBeVisible()
  })

  test('shows default dimensions for 1x1x3 bin', async ({ page }) => {
    // Default: gridWidth=1, gridDepth=1, heightUnits=3, Official profile
    // 1*42=42, 1*42=42, 3*7=21
    await expect(page.getByTestId('dimensions-readout')).toHaveText('42 x 42 x 21 mm')
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
    await expect(page.getByTestId('dimensions-readout')).toHaveText('126 x 42 x 21 mm')
  })

  test('changing grid depth slider updates dimensions', async ({ page }) => {
    const depthSlider = page.getByRole('slider').nth(1)

    // Increase depth from 1 to 2 using keyboard
    await depthSlider.focus()
    await page.keyboard.press('ArrowRight')

    // Depth should now be 2: 2*42=84
    await expect(depthSlider).toHaveAttribute('aria-valuenow', '2')
    await expect(page.getByTestId('dimensions-readout')).toHaveText('42 x 84 x 21 mm')
  })

  test('changing height slider updates dimensions', async ({ page }) => {
    const heightSlider = page.getByRole('slider').nth(2)

    // Increase height from 3 to 5
    await heightSlider.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    // Height should now be 5: 5*7=35
    await expect(heightSlider).toHaveAttribute('aria-valuenow', '5')
    await expect(page.getByTestId('dimensions-readout')).toHaveText('42 x 42 x 35 mm')
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
    await expect(page.getByTestId('dimensions-readout')).toHaveText('42 x 42 x 21 mm')
  })

  test('base options toggles visible and off by default', async ({ page }) => {
    await expect(page.getByText('Base Options')).toBeVisible()
    await expect(page.getByText('Magnet Holes')).toBeVisible()
    await expect(page.getByText('Weight Holes')).toBeVisible()
    await expect(page.getByText('Honeycomb Base')).toBeVisible()
  })

  test('magnet holes toggle changes state', async ({ page }) => {
    // Find the Magnet Holes switch (after Stacking Lip switch)
    const magnetLabel = page.getByText('Magnet Holes').locator('..')
    const magnetSwitch = magnetLabel.getByRole('switch')

    await expect(magnetSwitch).toHaveAttribute('data-state', 'unchecked')
    await magnetSwitch.click()
    await expect(magnetSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('weight holes toggle changes state', async ({ page }) => {
    const weightLabel = page.getByText('Weight Holes').locator('..')
    const weightSwitch = weightLabel.getByRole('switch')

    await expect(weightSwitch).toHaveAttribute('data-state', 'unchecked')
    await weightSwitch.click()
    await expect(weightSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('honeycomb base toggle changes state', async ({ page }) => {
    const honeycombLabel = page.getByText('Honeycomb Base').locator('..')
    const honeycombSwitch = honeycombLabel.getByRole('switch')

    await expect(honeycombSwitch).toHaveAttribute('data-state', 'unchecked')
    await honeycombSwitch.click()
    await expect(honeycombSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('inner fillet slider visible and defaults to None', async ({ page }) => {
    await expect(page.getByText('Inner Fillet')).toBeVisible()
    await expect(page.getByText('None')).toBeVisible()
  })

  test('inner fillet slider updates value', async ({ page }) => {
    // Inner fillet slider is the 5th slider (after width, depth, height, wallThickness)
    const filletSlider = page.getByRole('slider').nth(4)
    await filletSlider.focus()
    await page.keyboard.press('ArrowRight')

    // Should update from 0 to 0.5mm
    await expect(page.getByText('0.5mm')).toBeVisible()
  })
})

test.describe('Bin Modifiers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await addBin(page)
  })

  test('shows modifiers section for bins', async ({ page }) => {
    await expect(page.getByText('Modifiers', { exact: true })).toBeVisible()
    await expect(page.getByText('No modifiers added.')).toBeVisible()
  })

  test('add modifier dropdown shows all modifier types', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()

    await expect(page.getByRole('menuitem', { name: 'Divider Grid' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Label Tab' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Scoop', exact: true })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Insert' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Lid' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Finger Scoop' })).toBeVisible()
  })

  test('can add a divider grid modifier', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Divider Grid' }).click()

    await expect(page.getByTestId('modifier-dividerGrid')).toBeVisible()
    await expect(page.getByText('Divider Grid')).toBeVisible()
  })

  test('divider grid controls render correctly', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Divider Grid' }).click()

    await expect(page.getByText('Dividers (Width)')).toBeVisible()
    await expect(page.getByText('Dividers (Depth)')).toBeVisible()
  })

  test('can add a label tab modifier', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Label Tab' }).click()

    await expect(page.getByTestId('modifier-labelTab')).toBeVisible()
    await expect(page.getByText('Label Tab')).toBeVisible()
  })

  test('label tab controls render correctly', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Label Tab' }).click()

    await expect(page.getByText('Angle')).toBeVisible()
  })

  test('can add a scoop modifier', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Scoop', exact: true }).click()

    await expect(page.getByTestId('modifier-scoop')).toBeVisible()
    await expect(page.getByTestId('modifier-scoop').getByText('Scoop')).toBeVisible()
  })

  test('scoop controls render correctly', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Scoop', exact: true }).click()

    await expect(page.getByText('Radius')).toBeVisible()
  })

  test('can add an insert modifier', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Insert' }).click()

    await expect(page.getByTestId('modifier-insert')).toBeVisible()
    await expect(page.getByText('Insert')).toBeVisible()
  })

  test('insert controls render correctly', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Insert' }).click()

    await expect(page.getByText('Compartments (Width)')).toBeVisible()
    await expect(page.getByText('Compartments (Depth)')).toBeVisible()
  })

  test('can add a lid modifier', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Lid' }).click()

    await expect(page.getByTestId('modifier-lid')).toBeVisible()
    await expect(page.getByText('Lid')).toBeVisible()
  })

  test('lid modifier shows stacking toggle', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Lid' }).click()

    const lidCard = page.getByTestId('modifier-lid')
    await expect(lidCard.getByText('Stacking')).toBeVisible()
  })

  test('can add a finger scoop modifier', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Finger Scoop' }).click()

    await expect(page.getByTestId('modifier-fingerScoop')).toBeVisible()
    await expect(page.getByText('Finger Scoop')).toBeVisible()
  })

  test('finger scoop controls render correctly', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Finger Scoop' }).click()

    const card = page.getByTestId('modifier-fingerScoop')
    await expect(card.getByText('Width')).toBeVisible()
    await expect(card.getByText('Depth')).toBeVisible()
  })

  test('can remove a modifier', async ({ page }) => {
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Divider Grid' }).click()

    await expect(page.getByTestId('modifier-dividerGrid')).toBeVisible()

    await page.getByTestId('remove-modifier-btn').click()

    await expect(page.getByTestId('modifier-dividerGrid')).not.toBeVisible()
    await expect(page.getByText('No modifiers added.')).toBeVisible()
  })

  test('multiple modifiers can coexist on one bin', async ({ page }) => {
    // Add divider grid
    await page.getByTestId('add-modifier-btn').click()
    await page.getByRole('menuitem', { name: 'Divider Grid' }).click()
    await expect(page.getByTestId('modifier-dividerGrid')).toBeVisible()

    // Add lid (use the top-level add-modifier-btn, first one)
    await page.getByTestId('add-modifier-btn').first().click()
    await page.getByRole('menuitem', { name: 'Lid' }).click()
    await expect(page.getByTestId('modifier-lid')).toBeVisible()

    // Both should be present
    await expect(page.getByTestId('modifier-dividerGrid')).toBeVisible()
    await expect(page.getByTestId('modifier-lid')).toBeVisible()
  })
})
