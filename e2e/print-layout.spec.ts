import { test, expect } from '@playwright/test'

test.describe('Print Layout View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows Edit and Print view toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Edit view' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Print layout view' })).toBeVisible()
  })

  test('starts in Edit view by default', async ({ page }) => {
    // Edit button should be active (pressed)
    const editBtn = page.getByRole('button', { name: 'Edit view' })
    await expect(editBtn).toHaveAttribute('aria-pressed', 'true')

    // Edit view controls should be visible
    await expect(page.getByRole('button', { name: /Add Object/i })).toBeVisible()
    await expect(page.getByText('Objects', { exact: true })).toBeVisible()
    await expect(page.getByText('Properties', { exact: true })).toBeVisible()
  })

  test('switches to Print Layout view', async ({ page }) => {
    await page.getByRole('button', { name: 'Print layout view' }).click()

    // Print button should now be active
    const printBtn = page.getByRole('button', { name: 'Print layout view' })
    await expect(printBtn).toHaveAttribute('aria-pressed', 'true')

    // Print settings panel should be visible
    await expect(page.getByText('Print Settings')).toBeVisible()

    // Edit view controls should be hidden
    await expect(page.getByRole('button', { name: /Add Object/i })).not.toBeVisible()

    // Objects panel (left panel) should be hidden
    await expect(page.getByText('Objects', { exact: true })).not.toBeVisible()
  })

  test('switches back to Edit view', async ({ page }) => {
    // Go to print layout
    await page.getByRole('button', { name: 'Print layout view' }).click()
    await expect(page.getByText('Print Settings')).toBeVisible()

    // Switch back to edit
    await page.getByRole('button', { name: 'Edit view' }).click()

    // Edit view should be restored
    await expect(page.getByRole('button', { name: /Add Object/i })).toBeVisible()
    await expect(page.getByText('Properties', { exact: true })).toBeVisible()
  })

  test('shows print bed settings panel with bed size selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Print layout view' }).click()

    // Bed size selector should be visible
    await expect(page.getByText('Bed Size')).toBeVisible()
    await expect(page.getByLabel('Bed size')).toBeVisible()
  })

  test('shows spacing slider in print settings', async ({ page }) => {
    await page.getByRole('button', { name: 'Print layout view' }).click()

    await expect(page.getByText('Object Spacing')).toBeVisible()
    await expect(page.getByText('10 mm')).toBeVisible()
    await expect(page.getByLabel('Object spacing')).toBeVisible()
  })

  test('shows empty state when no objects exist', async ({ page }) => {
    await page.getByRole('button', { name: 'Print layout view' }).click()

    await expect(page.getByText('No objects to export. Add objects in Edit view.')).toBeVisible()
  })

  test('shows objects in print settings after adding in edit view', async ({ page }) => {
    // Add a baseplate in edit view
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Switch to print layout
    await page.getByRole('button', { name: 'Print layout view' }).click()

    // Should show the object in the list
    await expect(page.getByText('Baseplate 1')).toBeVisible()
    await expect(page.getByText('Objects (1)')).toBeVisible()
  })

  test('shows export buttons in print settings', async ({ page }) => {
    // Add an object first
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    await page.getByRole('button', { name: 'Print layout view' }).click()

    await expect(page.getByRole('button', { name: /Export All \(ZIP\)/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Export Plate/ })).toBeVisible()
  })

  test('shows per-object export button', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    await page.getByRole('button', { name: 'Print layout view' }).click()

    // Per-object export button
    await expect(page.getByRole('button', { name: /Export Baseplate 1/ })).toBeVisible()
  })

  test('shows dimensions for each object', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    await page.getByRole('button', { name: 'Print layout view' }).click()

    // Should show dimensions like "126.0 x 126.0 x 7.0 mm" (for 3x3 default baseplate)
    await expect(page.getByText(/\d+\.\d+ x \d+\.\d+ x \d+\.\d+ mm/)).toBeVisible()
  })

  test('renders canvas in print layout view', async ({ page }) => {
    await page.getByRole('button', { name: 'Print layout view' }).click()
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('changes bed size preset', async ({ page }) => {
    await page.getByRole('button', { name: 'Print layout view' }).click()

    // Open the bed size selector
    await page.getByLabel('Bed size').click()

    // Select a different size
    await page.getByText('220 x 220 mm').click()

    // Verify selection changed (the trigger should show the new value)
    await expect(page.getByText('220 x 220 mm')).toBeVisible()
  })

  test('shows Export All (3MF) button in print settings', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    await page.getByRole('button', { name: 'Print layout view' }).click()

    await expect(page.getByRole('button', { name: /Export All \(3MF\)/ })).toBeVisible()
  })

  test('Export All (3MF) is disabled when no objects exist', async ({ page }) => {
    await page.getByRole('button', { name: 'Print layout view' }).click()

    await expect(page.getByRole('button', { name: /Export All \(3MF\)/ })).toBeDisabled()
  })

  test('Export All (3MF) is enabled with objects on the plate', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    await page.getByRole('button', { name: 'Print layout view' }).click()

    await expect(page.getByRole('button', { name: /Export All \(3MF\)/ })).toBeEnabled()
  })

  test('Export All (3MF) triggers download with .3mf extension', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    await page.getByRole('button', { name: 'Print layout view' }).click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export All \(3MF\)/ }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('react-finity-plate.3mf')
  })

  test('per-object export dropdown shows STL and 3MF options', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    await page.getByRole('button', { name: 'Print layout view' }).click()

    // Click the per-object export button to open format dropdown
    await page.getByRole('button', { name: /Export Baseplate 1/ }).click()

    await expect(page.getByRole('menuitem', { name: /Export as STL/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Export as 3MF/ })).toBeVisible()
  })
})
