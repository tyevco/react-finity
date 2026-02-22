import { test, expect } from '@playwright/test'

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows Export dropdown in toolbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Export/ })).toBeVisible()
  })

  test('Export dropdown shows menu items', async ({ page }) => {
    await page.getByRole('button', { name: /Export/ }).click()

    await expect(page.getByRole('menuitem', { name: /Export Selected \(STL\)/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Export Selected \(3MF\)/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Open Print Layout/ })).toBeVisible()
  })

  test('Export Selected (STL) is disabled when nothing is selected', async ({ page }) => {
    await page.getByRole('button', { name: /Export/ }).click()

    const exportSelected = page.getByRole('menuitem', { name: /Export Selected \(STL\)/ })
    await expect(exportSelected).toBeVisible()
    await expect(exportSelected).toHaveAttribute('data-disabled')
  })

  test('Export Selected (3MF) is disabled when nothing is selected', async ({ page }) => {
    await page.getByRole('button', { name: /Export/ }).click()

    const export3mf = page.getByRole('menuitem', { name: /Export Selected \(3MF\)/ })
    await expect(export3mf).toBeVisible()
    await expect(export3mf).toHaveAttribute('data-disabled')
  })

  test('Open Print Layout switches to print view', async ({ page }) => {
    await page.getByRole('button', { name: /Export/ }).click()
    await page.getByRole('menuitem', { name: /Open Print Layout/ }).click()

    // Should switch to print layout view
    await expect(page.getByText('Print Settings')).toBeVisible()
  })

  test('Export Selected (STL) is enabled after selecting an object', async ({ page }) => {
    // Add and select an object
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Open export dropdown
    await page.getByRole('button', { name: /Export/ }).click()

    // Export Selected (STL) should be enabled (no data-disabled attribute)
    const exportSelected = page.getByRole('menuitem', { name: /Export Selected \(STL\)/ })
    await expect(exportSelected).not.toHaveAttribute('data-disabled')
  })

  test('Export Selected (3MF) is enabled after selecting an object', async ({ page }) => {
    // Add and select an object
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Open export dropdown
    await page.getByRole('button', { name: /Export/ }).click()

    // Export Selected (3MF) should be enabled (no data-disabled attribute)
    const export3mf = page.getByRole('menuitem', { name: /Export Selected \(3MF\)/ })
    await expect(export3mf).not.toHaveAttribute('data-disabled')
  })

  test('Export Selected (STL) triggers download with .stl extension', async ({ page }) => {
    // Add and select an object
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Export selected as STL
    await page.getByRole('button', { name: /Export/ }).click()
    await page.getByRole('menuitem', { name: /Export Selected \(STL\)/ }).click()

    // Should trigger a download
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('Baseplate 1.stl')
  })

  test('Export Selected (3MF) triggers download with .3mf extension', async ({ page }) => {
    // Add and select an object
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Export selected as 3MF
    await page.getByRole('button', { name: /Export/ }).click()
    await page.getByRole('menuitem', { name: /Export Selected \(3MF\)/ }).click()

    // Should trigger a download
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('Baseplate 1.3mf')
  })

  test('Ctrl+P toggles to print layout view', async ({ page }) => {
    await page.keyboard.press('Control+p')

    // Should switch to print layout view
    await expect(page.getByText('Print Settings')).toBeVisible()

    // Press again to go back
    await page.keyboard.press('Control+p')
    await expect(page.getByRole('button', { name: /Add Object/i })).toBeVisible()
  })

  test('export buttons are disabled when no objects in print layout', async ({ page }) => {
    await page.getByRole('button', { name: 'Print layout view' }).click()

    const exportAllBtn = page.getByRole('button', { name: /Export All \(ZIP\)/ })
    const exportPlateBtn = page.getByRole('button', { name: /Export Plate/ })

    await expect(exportAllBtn).toBeDisabled()
    await expect(exportPlateBtn).toBeDisabled()
  })

  test('export buttons are enabled with objects in print layout', async ({ page }) => {
    // Add objects in edit view
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Switch to print layout
    await page.getByRole('button', { name: 'Print layout view' }).click()

    const exportAllBtn = page.getByRole('button', { name: /Export All \(ZIP\)/ })
    const exportPlateBtn = page.getByRole('button', { name: /Export Plate/ })

    await expect(exportAllBtn).toBeEnabled()
    await expect(exportPlateBtn).toBeEnabled()
  })
})
