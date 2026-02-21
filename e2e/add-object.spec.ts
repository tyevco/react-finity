import { test, expect } from '@playwright/test'

test.describe('Add Object', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('opens dropdown menu when clicking Add Object', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()

    await expect(page.getByRole('menuitem', { name: 'Baseplate' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Bin/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Lid/ })).toBeVisible()
  })

  test('disabled menu items for future phases', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()

    const binItem = page.getByRole('menuitem', { name: /Bin/ })
    const lidItem = page.getByRole('menuitem', { name: /Lid/ })

    await expect(binItem).toHaveAttribute('data-disabled', '')
    await expect(lidItem).toHaveAttribute('data-disabled', '')
  })

  test('adds a baseplate to the object list', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Check in object list panel (left panel)
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()
  })

  test('auto-selects the newly added baseplate', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Properties panel should show the baseplate kind
    await expect(page.getByText('(baseplate)')).toBeVisible()
  })

  test('increments names for multiple baseplates', async ({ page }) => {
    // Add first baseplate
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()

    // Add second baseplate
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()
    await expect(page.locator('.group').getByText('Baseplate 2')).toBeVisible()

    // Add third baseplate
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()
    await expect(page.locator('.group').getByText('Baseplate 3')).toBeVisible()
  })
})
