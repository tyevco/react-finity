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

test.describe('Multi-select', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('clicking an object selects it', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    await page.locator('.group').getByText('Baseplate 1').click()
    await expect(page.getByText('(baseplate)')).toBeVisible()
  })

  test('shift-click adds to selection', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    await page.locator('.group').getByText('Baseplate 1').click()
    // Wait for selection to register before shift-clicking
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await page
      .locator('.group')
      .getByText('Bin 2')
      .click({ modifiers: ['Shift'] })

    await expect(page.getByText('2 objects selected')).toBeVisible()
  })

  test('clicking without shift replaces selection', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    // Select both
    await page.locator('.group').getByText('Baseplate 1').click()
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await page
      .locator('.group')
      .getByText('Bin 2')
      .click({ modifiers: ['Shift'] })
    await expect(page.getByText('2 objects selected')).toBeVisible()

    // Regular click replaces selection
    await page.locator('.group').getByText('Baseplate 1').click()
    await expect(page.getByText('(baseplate)')).toBeVisible()
  })

  test('Delete removes all selected objects', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    await page.locator('.group').getByText('Baseplate 1').click()
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await page
      .locator('.group')
      .getByText('Bin 2')
      .click({ modifiers: ['Shift'] })
    await expect(page.getByText('2 objects selected')).toBeVisible()

    await page.keyboard.press('Delete')

    await expect(page.getByText('No objects yet. Use "Add Object" to get started.')).toBeVisible()
  })

  test('Escape clears selection', async ({ page }) => {
    await addBaseplate(page)

    await expect(page.getByText('(baseplate)')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByText('Select an object to view its properties.')).toBeVisible()
  })

  test('Ctrl+D duplicates selected object', async ({ page }) => {
    await addBaseplate(page)
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()

    await page.keyboard.press('Control+d')

    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()
    await expect(page.locator('.group').getByText('Baseplate 2')).toBeVisible()
  })

  test('multi-select shows count in properties panel', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)
    await addBaseplate(page)

    await page.locator('.group').getByText('Baseplate 1').click()
    // Wait for first selection to register
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await page
      .locator('.group')
      .getByText('Bin 2')
      .click({ modifiers: ['Shift'] })
    await expect(page.getByText('2 objects selected')).toBeVisible()
    await page
      .locator('.group')
      .getByText('Baseplate 3')
      .click({ modifiers: ['Shift'] })

    await expect(page.getByText('3 objects selected')).toBeVisible()
  })
})
