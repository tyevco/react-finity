import { test, expect } from '@playwright/test'

test.describe('App Loading & Initial State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders the project name in the toolbar', async ({ page }) => {
    await expect(page.getByTestId('project-name')).toBeVisible()
  })

  test('shows the Add Object button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Add Object/i }),
    ).toBeVisible()
  })

  test('shows the Objects panel with empty state', async ({ page }) => {
    await expect(page.getByText('Objects', { exact: true })).toBeVisible()
    await expect(
      page.getByText('No objects yet. Use "Add Object" to get started.'),
    ).toBeVisible()
  })

  test('shows the Properties panel with empty state', async ({ page }) => {
    await expect(page.getByText('Properties', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Select an object to view its properties.'),
    ).toBeVisible()
  })

  test('renders the 3D viewport canvas', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible()
  })
})
