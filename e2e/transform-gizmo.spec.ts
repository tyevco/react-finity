import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function addBaseplate(page: Page) {
  await page.getByRole('button', { name: /Add Object/i }).click()
  await page.getByRole('menuitem', { name: 'Baseplate' }).click()
}

async function addBin(page: Page) {
  await page.getByRole('button', { name: /Add Object/i }).click()
  await page.getByRole('menuitem', { name: 'Bin' }).click()
}

test.describe('Transform Gizmo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('snap to grid toggle is visible in toolbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Snap to grid' })).toBeVisible()
  })

  test('snap to grid is enabled by default', async ({ page }) => {
    const snapButton = page.getByRole('button', { name: 'Snap to grid' })
    await expect(snapButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('clicking snap toggle changes its state', async ({ page }) => {
    const snapButton = page.getByRole('button', { name: 'Snap to grid' })

    // Initially active
    await expect(snapButton).toHaveAttribute('aria-pressed', 'true')

    // Toggle off
    await snapButton.click()
    await expect(snapButton).toHaveAttribute('aria-pressed', 'false')

    // Toggle back on
    await snapButton.click()
    await expect(snapButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('adding and selecting objects does not crash', async ({ page }) => {
    await addBaseplate(page)
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.getByText('(baseplate)')).toBeVisible()
  })

  test('selecting different objects works without errors', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    // Select baseplate
    await page.locator('.group').getByText('Baseplate 1').click()
    await expect(page.getByText('(baseplate)')).toBeVisible()

    // Select bin
    await page.locator('.group').getByText('Bin 2').click()
    await expect(page.getByText('(bin)')).toBeVisible()

    // Canvas should still be rendered
    await expect(page.locator('canvas')).toBeVisible()
  })
})
