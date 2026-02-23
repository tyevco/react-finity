import { test, expect } from '@playwright/test'
import { addBaseplate, addBin, clickObjectInList } from './fixtures'

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
    await clickObjectInList(page, 'Baseplate 1')
    await expect(page.getByText('(baseplate)')).toBeVisible()

    // Select bin
    await clickObjectInList(page, 'Bin 2')
    await expect(page.getByText('(bin)')).toBeVisible()

    // Canvas should still be rendered
    await expect(page.locator('canvas')).toBeVisible()
  })
})
