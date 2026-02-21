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

  test('clicking top view does not crash', async ({ page }) => {
    await page.getByRole('button', { name: 'Top View' }).click()
    // Canvas should still be rendered
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('clicking front view does not crash', async ({ page }) => {
    await page.getByRole('button', { name: 'Front View' }).click()
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('clicking side view does not crash', async ({ page }) => {
    await page.getByRole('button', { name: 'Side View' }).click()
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('clicking isometric view does not crash', async ({ page }) => {
    await page.getByRole('button', { name: 'Isometric View' }).click()
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('clicking all presets in sequence does not cause errors', async ({ page }) => {
    await page.getByRole('button', { name: 'Top View' }).click()
    await page.getByRole('button', { name: 'Front View' }).click()
    await page.getByRole('button', { name: 'Side View' }).click()
    await page.getByRole('button', { name: 'Isometric View' }).click()
    await expect(page.locator('canvas')).toBeVisible()
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
