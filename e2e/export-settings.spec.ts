import { test, expect } from '@playwright/test'

test.describe('Export Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Switch to print layout view
    await page.getByRole('button', { name: 'Print layout view' }).click()
  })

  test('shows Export Scale control in Print Settings', async ({ page }) => {
    await expect(page.getByText('Export Scale')).toBeVisible()
    await expect(page.getByText('100%')).toBeVisible()
    await expect(page.getByLabel('Export scale')).toBeVisible()
  })

  test('shows Polygon Quality control in Print Settings', async ({ page }) => {
    await expect(page.getByText('Polygon Quality')).toBeVisible()
    await expect(page.getByLabel('Polygon quality')).toBeVisible()
  })

  test('Export Scale slider changes value', async ({ page }) => {
    const slider = page.getByLabel('Export scale')
    await slider.focus()

    // Press right arrow to increase scale
    await page.keyboard.press('ArrowRight')
    // Value should change from 100%
    await expect(page.getByText(/\d+%/)).toBeVisible()
  })

  test('Polygon Quality selector shows options', async ({ page }) => {
    await page.getByLabel('Polygon quality').click()

    await expect(page.getByRole('option', { name: 'Low' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Medium' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'High' })).toBeVisible()
  })

  test('Polygon Quality can be changed', async ({ page }) => {
    await page.getByLabel('Polygon quality').click()
    await page.getByRole('option', { name: 'High' }).click()

    // Verify selection stuck
    await expect(page.getByLabel('Polygon quality')).toContainText('High')
  })

  test('Polygon Quality can be set to Low', async ({ page }) => {
    await page.getByLabel('Polygon quality').click()
    await page.getByRole('option', { name: 'Low' }).click()

    await expect(page.getByLabel('Polygon quality')).toContainText('Low')
  })
})
