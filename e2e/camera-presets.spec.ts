import { test, expect } from '@playwright/test'

test.describe('Camera Presets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('camera preset buttons are visible in toolbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Top View' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Front View' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Side View' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Isometric View' })).toBeVisible()
  })

  test('clicking each preset in sequence does not crash', async ({ page }) => {
    for (const preset of ['Top View', 'Front View', 'Side View', 'Isometric View']) {
      await page.getByRole('button', { name: preset }).click()
      await expect(page.locator('canvas')).toBeVisible()
    }
  })

  test('camera presets work with objects in the scene', async ({ page }) => {
    // Add an object first
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Click each preset
    await page.getByRole('button', { name: 'Top View' }).click()
    await expect(page.locator('canvas')).toBeVisible()

    await page.getByRole('button', { name: 'Front View' }).click()
    await expect(page.locator('canvas')).toBeVisible()
  })
})
