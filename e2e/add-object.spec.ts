import { test, expect } from '@playwright/test'

test.describe('Add Object', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('opens dropdown menu when clicking Add Object', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()

    await expect(page.getByRole('menuitem', { name: 'Baseplate' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Bin/ })).toBeVisible()
  })

  test('adds a baseplate to the object list', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Check in object list panel (left panel)
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()
  })

  test('adds a bin to the object list', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()

    await expect(page.locator('.group').getByText('Bin 1')).toBeVisible()
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

  test('auto-selects the newly added bin', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()

    // Properties panel should show the bin kind
    await expect(page.getByText('(bin)')).toBeVisible()
  })

  test('increments names for multiple bins', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()
    await expect(page.locator('.group').getByText('Bin 1')).toBeVisible()

    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()
    await expect(page.locator('.group').getByText('Bin 2')).toBeVisible()
  })

  test('can add both baseplates and bins to the scene', async ({ page }) => {
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()

    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()
    await expect(page.locator('.group').getByText('Bin 2')).toBeVisible()

    // Both should be in the list
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()
    await expect(page.locator('.group').getByText('Bin 2')).toBeVisible()
  })
})
