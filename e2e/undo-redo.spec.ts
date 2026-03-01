import { test, expect } from '@playwright/test'
import { addBin } from './fixtures'

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('undo button is disabled when there is no history', async ({ page }) => {
    const undoBtn = page.getByTestId('undo-btn')
    await expect(undoBtn).toBeDisabled()
  })

  test('redo button is disabled when there is no future', async ({ page }) => {
    const redoBtn = page.getByTestId('redo-btn')
    await expect(redoBtn).toBeDisabled()
  })

  test('undo button becomes enabled after making a change', async ({ page }) => {
    await addBin(page)

    // Wait for debounced history push (300ms debounce + react re-render + parallel load margin)
    const undoBtn = page.getByTestId('undo-btn')
    await expect(undoBtn).toBeEnabled({ timeout: 10000 })
  })

  test('Ctrl+Z triggers undo', async ({ page }) => {
    await addBin(page)
    await expect(page.locator('.group').getByText('Bin 1')).toBeVisible()

    // Wait for history to capture
    await expect(page.getByTestId('undo-btn')).toBeEnabled({ timeout: 10000 })

    // Undo should remove the object
    await page.keyboard.press('Control+z')
    await expect(page.locator('.group').getByText('Bin 1')).not.toBeVisible({ timeout: 10000 })
  })

  test('Ctrl+Shift+Z triggers redo', async ({ page }) => {
    await addBin(page)
    await expect(page.locator('.group').getByText('Bin 1')).toBeVisible()

    // Wait for history capture
    await expect(page.getByTestId('undo-btn')).toBeEnabled({ timeout: 10000 })

    // Undo
    await page.keyboard.press('Control+z')
    await expect(page.locator('.group').getByText('Bin 1')).not.toBeVisible({ timeout: 10000 })

    // Redo
    await page.keyboard.press('Control+Shift+z')
    await expect(page.locator('.group').getByText('Bin 1')).toBeVisible({ timeout: 10000 })
  })

  test('undo then re-add produces correct object name (counter sync)', async ({ page }) => {
    // Add a bin -> "Bin 1"
    await addBin(page)
    await expect(page.locator('.group').getByText('Bin 1')).toBeVisible()

    // Wait for history to capture
    await expect(page.getByTestId('undo-btn')).toBeEnabled({ timeout: 10000 })

    // Undo the add
    await page.keyboard.press('Control+z')
    await expect(page.locator('.group').getByText('Bin 1')).not.toBeVisible({ timeout: 10000 })

    // Add another bin -- should be "Bin 1" again (not "Bin 2")
    await addBin(page)
    await expect(page.locator('.group').getByText('Bin 1')).toBeVisible()
  })

  test('undo button works via click', async ({ page }) => {
    await addBin(page)
    await expect(page.locator('.group').getByText('Bin 1')).toBeVisible()

    // Wait for undo button to be enabled
    const undoBtn = page.getByTestId('undo-btn')
    await expect(undoBtn).toBeEnabled({ timeout: 10000 })

    await undoBtn.click()
    await expect(page.locator('.group').getByText('Bin 1')).not.toBeVisible({ timeout: 10000 })
  })
})
