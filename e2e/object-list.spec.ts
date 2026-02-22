import { test, expect } from '@playwright/test'
import { addBaseplate, addBin } from './fixtures'

test.describe('Object List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('clicking an object in the list selects it and shows properties', async ({ page }) => {
    await addBaseplate(page)

    // The first baseplate is auto-selected, so properties should already show
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await expect(page.getByText('Grid Width')).toBeVisible()
  })

  test('clicking a different object switches selection', async ({ page }) => {
    await addBaseplate(page)
    await addBaseplate(page)

    // Click on Baseplate 1 in the object list
    await page.locator('.group').filter({ hasText: 'Baseplate 1' }).click({ force: true })
    // Properties panel should show Baseplate 1
    await expect(page.locator('.text-sm.font-medium', { hasText: 'Baseplate 1' })).toBeVisible()

    // Click on Baseplate 2
    await page.locator('.group').filter({ hasText: 'Baseplate 2' }).click({ force: true })
    await expect(page.locator('.text-sm.font-medium', { hasText: 'Baseplate 2' })).toBeVisible()
  })

  test('delete button removes an object from the list', async ({ page }) => {
    await addBaseplate(page)
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()

    // The delete button has opacity-0 by default and group-hover:opacity-100
    // Force click by making it visible
    const deleteButton = page
      .locator('.group')
      .filter({ hasText: 'Baseplate 1' })
      .getByRole('button')
    await deleteButton.click({ force: true })

    // Object should be removed
    await expect(page.locator('.group').getByText('Baseplate 1')).not.toBeVisible()
    // Should show empty state
    await expect(page.getByText('No objects yet. Use "Add Object" to get started.')).toBeVisible()
  })

  test('deleting the selected object clears properties panel', async ({ page }) => {
    await addBaseplate(page)
    await expect(page.getByText('(baseplate)')).toBeVisible()

    // Delete the selected object
    const deleteButton = page
      .locator('.group')
      .filter({ hasText: 'Baseplate 1' })
      .getByRole('button')
    await deleteButton.click({ force: true })

    // Properties panel should show empty state
    await expect(page.getByText('Select an object to view its properties.')).toBeVisible()
  })

  test('deleting one of multiple objects leaves others intact', async ({ page }) => {
    await addBaseplate(page)
    await addBaseplate(page)

    // Delete Baseplate 1
    const deleteButton = page
      .locator('.group')
      .filter({ hasText: 'Baseplate 1' })
      .getByRole('button')
    await deleteButton.click({ force: true })

    // Baseplate 1 gone, Baseplate 2 still present
    await expect(page.locator('.group').getByText('Baseplate 1')).not.toBeVisible()
    await expect(page.locator('.group').getByText('Baseplate 2')).toBeVisible()
  })

  test('deleting all objects returns to empty state', async ({ page }) => {
    await addBaseplate(page)
    await addBaseplate(page)

    // Delete both baseplates
    const deleteBtn1 = page.locator('.group').filter({ hasText: 'Baseplate 1' }).getByRole('button')
    await deleteBtn1.click({ force: true })

    const deleteBtn2 = page.locator('.group').filter({ hasText: 'Baseplate 2' }).getByRole('button')
    await deleteBtn2.click({ force: true })

    await expect(page.getByText('No objects yet. Use "Add Object" to get started.')).toBeVisible()
  })

  test('switching selection between baseplates and bins shows correct properties', async ({
    page,
  }) => {
    await addBaseplate(page)
    await addBin(page)

    // Bin is auto-selected (last added), should show bin properties
    await expect(page.getByText('(bin)')).toBeVisible()
    await expect(page.getByText('Stacking Lip')).toBeVisible()

    // Click on the baseplate in the object list
    await page.locator('.group').getByText('Baseplate 1').click()
    await expect(page.getByText('(baseplate)')).toBeVisible()
    await expect(page.getByText('Magnet Holes')).toBeVisible()

    // Click back on the bin
    await page.locator('.group').getByText('Bin 2').click()
    await expect(page.getByText('(bin)')).toBeVisible()
    await expect(page.getByText('Stacking Lip')).toBeVisible()
  })

  test('deleting a bin from a mixed list leaves baseplate intact', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    // Delete the bin
    const deleteBinBtn = page.locator('.group').filter({ hasText: 'Bin 2' }).getByRole('button')
    await deleteBinBtn.click({ force: true })

    // Bin is gone, baseplate remains
    await expect(page.locator('.group').getByText('Bin 2')).not.toBeVisible()
    await expect(page.locator('.group').getByText('Baseplate 1')).toBeVisible()
  })
})
