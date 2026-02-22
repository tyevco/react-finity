import { test, expect } from '@playwright/test'

test.describe('App Loading & Initial State', () => {
  test('renders toolbar, panels, and viewport on load', async ({ page }) => {
    await page.goto('/')

    // Toolbar
    await expect(page.getByTestId('project-name')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Object/i })).toBeVisible()

    // Left panel - Objects
    await expect(page.getByText('Objects', { exact: true })).toBeVisible()
    await expect(page.getByText('No objects yet. Use "Add Object" to get started.')).toBeVisible()

    // Right panel - Properties
    await expect(page.getByText('Properties', { exact: true })).toBeVisible()
    await expect(page.getByText('Select an object to view its properties.')).toBeVisible()

    // 3D Viewport
    await expect(page.locator('canvas')).toBeVisible()
  })
})
