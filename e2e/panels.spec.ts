import { test, expect } from '@playwright/test'

test.describe('Panel Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('left panel is visible by default', async ({ page }) => {
    await expect(page.getByText('Objects', { exact: true })).toBeVisible()
    await expect(
      page.getByText('No objects yet. Use "Add Object" to get started.'),
    ).toBeVisible()
  })

  test('clicking left panel toggle hides the Objects panel', async ({
    page,
  }) => {
    // The left panel toggle is the first icon button (PanelLeft icon)
    const leftToggle = page.locator('button').first()
    await leftToggle.click()

    // Objects panel content should not be visible
    await expect(
      page.getByText('No objects yet. Use "Add Object" to get started.'),
    ).not.toBeVisible()
  })

  test('clicking left panel toggle twice restores the Objects panel', async ({
    page,
  }) => {
    const leftToggle = page.locator('button').first()

    // Hide
    await leftToggle.click()
    await expect(
      page.getByText('No objects yet. Use "Add Object" to get started.'),
    ).not.toBeVisible()

    // Show again
    await leftToggle.click()
    await expect(
      page.getByText('No objects yet. Use "Add Object" to get started.'),
    ).toBeVisible()
  })

  test('right panel is visible by default', async ({ page }) => {
    await expect(
      page.getByText('Properties', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText('Select an object to view its properties.'),
    ).toBeVisible()
  })

  test('clicking right panel toggle hides the Properties panel', async ({
    page,
  }) => {
    // The right panel toggle is the last button in the toolbar
    const rightToggle = page.locator('.flex.h-10 > button').last()
    await rightToggle.click()

    // Properties panel content should not be visible
    await expect(
      page.getByText('Select an object to view its properties.'),
    ).not.toBeVisible()
  })

  test('clicking right panel toggle twice restores the Properties panel', async ({
    page,
  }) => {
    const rightToggle = page.locator('.flex.h-10 > button').last()

    // Hide
    await rightToggle.click()
    await expect(
      page.getByText('Select an object to view its properties.'),
    ).not.toBeVisible()

    // Show again
    await rightToggle.click()
    await expect(
      page.getByText('Select an object to view its properties.'),
    ).toBeVisible()
  })

  test('both panels can be collapsed simultaneously', async ({ page }) => {
    const leftToggle = page.locator('button').first()
    const rightToggle = page.locator('.flex.h-10 > button').last()

    // Collapse both
    await leftToggle.click()
    await rightToggle.click()

    // Both panels' content should be hidden
    await expect(
      page.getByText('No objects yet. Use "Add Object" to get started.'),
    ).not.toBeVisible()
    await expect(
      page.getByText('Select an object to view its properties.'),
    ).not.toBeVisible()

    // Canvas should still be visible
    await expect(page.locator('canvas')).toBeVisible()
  })
})
