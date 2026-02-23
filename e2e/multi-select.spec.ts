import { test, expect } from '@playwright/test'
import { addBaseplate, addBin, clickObjectInList } from './fixtures'

test.describe('Multi-select', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('clicking an object selects it', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    await clickObjectInList(page, 'Baseplate 1')
    await expect(page.getByText('(baseplate)')).toBeVisible()
  })

  test('shift-click adds to selection', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    await clickObjectInList(page, 'Baseplate 1')
    // Wait for selection to register before shift-clicking
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await clickObjectInList(page, 'Bin 2', { modifiers: ['Shift'] })

    await expect(page.getByText('2 objects selected')).toBeVisible()
  })

  test('clicking without shift replaces selection', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    // Select both
    await clickObjectInList(page, 'Baseplate 1')
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await clickObjectInList(page, 'Bin 2', { modifiers: ['Shift'] })
    await expect(page.getByText('2 objects selected')).toBeVisible()

    // Regular click replaces selection
    await clickObjectInList(page, 'Baseplate 1')
    await expect(page.getByText('(baseplate)')).toBeVisible()
  })

  test('Delete removes all selected objects', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    await clickObjectInList(page, 'Baseplate 1')
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await clickObjectInList(page, 'Bin 2', { modifiers: ['Shift'] })
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
    test.slow() // 3 object additions + 3 shift-clicks can exceed default timeout under load
    await addBaseplate(page)
    await addBin(page)
    await addBaseplate(page)

    await clickObjectInList(page, 'Baseplate 1')
    // Wait for first selection to register
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await clickObjectInList(page, 'Bin 2', { modifiers: ['Shift'] })
    await expect(page.getByText('2 objects selected')).toBeVisible()
    await clickObjectInList(page, 'Baseplate 3', { modifiers: ['Shift'] })

    await expect(page.getByText('3 objects selected')).toBeVisible()
  })
})
