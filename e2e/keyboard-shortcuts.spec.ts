import { test, expect } from '@playwright/test'
import { addBaseplate, addBin } from './fixtures'

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Delete key removes the selected object', async ({ page }) => {
    await addBaseplate(page)
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()

    // Press Delete (object is auto-selected)
    await page.keyboard.press('Delete')

    await expect(page.locator('.group').getByText('Baseplate 1')).not.toBeVisible()
    await expect(page.getByText('No objects yet. Use "Add Object" to get started.')).toBeVisible()
  })

  test('Backspace key removes the selected object', async ({ page }) => {
    await addBaseplate(page)
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()

    await page.keyboard.press('Backspace')

    await expect(page.locator('.group').getByText('Baseplate 1')).not.toBeVisible()
  })

  test('Delete with no selection does not crash', async ({ page }) => {
    await page.keyboard.press('Delete')
    // Page should still be functional
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('Delete removes only the selected object', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    // Bin 2 is auto-selected (last added)
    await expect(page.getByText('(bin)')).toBeVisible()

    // Select Baseplate 1
    await page.locator('.group').getByText('Baseplate 1').click()
    await expect(page.getByText('(baseplate)')).toBeVisible()

    // Delete Baseplate 1
    await page.keyboard.press('Delete')

    // Baseplate 1 gone, Bin 2 still present
    await expect(page.locator('.group').getByText('Baseplate 1')).not.toBeVisible()
    await expect(page.locator('.group').getByText('Bin 2')).toBeVisible()
  })

  test('Escape deselects the current object', async ({ page }) => {
    await addBaseplate(page)
    await expect(page.getByText('(baseplate)')).toBeVisible()

    // Press Escape to deselect
    await page.keyboard.press('Escape')

    // Properties panel should show empty state
    await expect(page.getByText('Select an object to view its properties.')).toBeVisible()
  })

  test('Delete does not fire when a slider is focused', async ({ page }) => {
    await addBaseplate(page)
    await expect(page.getByText('(baseplate)')).toBeVisible()

    // Focus the first slider
    const slider = page.getByRole('slider').first()
    await slider.focus()

    // Press Delete - should NOT delete the object since slider is focused
    await page.keyboard.press('Delete')

    // Object must still exist -- the keyboard guard skips role="slider"
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()
    await expect(page.getByText('(baseplate)')).toBeVisible()
  })
})
