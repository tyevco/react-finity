import { test, expect } from '@playwright/test'

test.describe('Mobile Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
  })

  test('panels are hidden by default on mobile', async ({ page }) => {
    // On mobile, panels should not be visible (they are overlay sheets, closed by default)
    await expect(page.locator('canvas')).toBeVisible()
    await expect(
      page.getByText('No objects yet. Use "Add Object" to get started.'),
    ).not.toBeVisible()
    await expect(page.getByText('Select an object to view its properties.')).not.toBeVisible()
  })

  test('left panel opens as overlay sheet', async ({ page }) => {
    // Click the left panel toggle (first button in toolbar)
    const leftToggle = page.locator('[data-testid="toolbar"] > button').first()
    await leftToggle.click()

    // Object list panel should appear as an overlay
    await expect(page.getByText('No objects yet. Use "Add Object" to get started.')).toBeVisible()

    // Canvas should still exist behind the overlay
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('right panel opens as overlay sheet', async ({ page }) => {
    const rightToggle = page.locator('[data-testid="toolbar"] > button').last()
    await rightToggle.click()

    await expect(page.getByText('Select an object to view its properties.')).toBeVisible()
  })

  test('only one panel open at a time on mobile', async ({ page }) => {
    // Open right panel
    const rightToggle = page.locator('[data-testid="toolbar"] > button').last()
    await rightToggle.click()
    await expect(page.getByText('Select an object to view its properties.')).toBeVisible()

    // Close it via Escape
    await page.keyboard.press('Escape')
    await expect(page.getByText('Select an object to view its properties.')).not.toBeVisible()

    // Open left panel
    const leftToggle = page.locator('[data-testid="toolbar"] > button').first()
    await leftToggle.click()
    await expect(page.getByText('No objects yet. Use "Add Object" to get started.')).toBeVisible()

    // Right panel should still be closed
    await expect(page.getByText('Select an object to view its properties.')).not.toBeVisible()
  })

  test('sheet closes when pressing Escape', async ({ page }) => {
    // Open left panel
    const leftToggle = page.locator('[data-testid="toolbar"] > button').first()
    await leftToggle.click()
    await expect(page.getByText('No objects yet. Use "Add Object" to get started.')).toBeVisible()

    // Press Escape to close
    await page.keyboard.press('Escape')
    await expect(
      page.getByText('No objects yet. Use "Add Object" to get started.'),
    ).not.toBeVisible()
  })

  test('sheet closes when clicking overlay backdrop', async ({ page }) => {
    // Open right panel
    const rightToggle = page.locator('[data-testid="toolbar"] > button').last()
    await rightToggle.click()
    await expect(page.getByText('Select an object to view its properties.')).toBeVisible()

    // Click the overlay backdrop to close (click far left side, away from the right sheet)
    await page.mouse.click(10, 400)
    await expect(page.getByText('Select an object to view its properties.')).not.toBeVisible()
  })

  test('overflow menu is visible on mobile', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'More options' })).toBeVisible()
  })

  test('overflow menu contains camera presets', async ({ page }) => {
    await page.getByRole('button', { name: 'More options' }).click()
    await expect(page.getByRole('menuitem', { name: 'Top View' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Front View' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Side View' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Isometric View' })).toBeVisible()
  })

  test('overflow menu contains snap to grid toggle', async ({ page }) => {
    await page.getByRole('button', { name: 'More options' }).click()
    await expect(page.getByRole('menuitem', { name: /Snap to Grid/i })).toBeVisible()
  })

  test('overflow menu contains project operations', async ({ page }) => {
    await page.getByRole('button', { name: 'More options' }).click()
    await expect(page.getByRole('menuitem', { name: 'New Project' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Save Project' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Save As...' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Manage Projects...' })).toBeVisible()
  })

  test('add object works on mobile', async ({ page }) => {
    // Click Add button (mobile shows "Add" instead of "Add Object")
    await page.getByRole('button', { name: /Add/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()

    // Open right panel to see properties
    const rightToggle = page.locator('[data-testid="toolbar"] > button').last()
    await rightToggle.click()
    await expect(page.getByText('Bin 1')).toBeVisible()
  })

  test('object list delete buttons are visible without hover on mobile', async ({ page }) => {
    // Add an object first
    await page.getByRole('button', { name: /Add/i }).click()
    await page.getByRole('menuitem', { name: 'Baseplate' }).click()

    // Open left panel
    const leftToggle = page.locator('[data-testid="toolbar"] > button').first()
    await leftToggle.click()

    // The delete button should be visible without hover
    const objectItem = page.locator('.group').filter({ hasText: 'Baseplate 1' })
    await expect(objectItem).toBeVisible()
    const deleteBtn = objectItem.getByRole('button')
    await expect(deleteBtn).toBeVisible()
  })

  test('project name is hidden on mobile', async ({ page }) => {
    await expect(page.getByTestId('project-name')).not.toBeVisible()
  })

  test('camera presets are not shown as individual buttons on mobile', async ({ page }) => {
    // Camera preset buttons should not be in the toolbar on mobile
    await expect(page.getByRole('button', { name: 'Top View' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Front View' })).not.toBeVisible()
  })

  test('toolbar has taller height on mobile', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]')
    const box = await toolbar.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      // h-12 = 48px on mobile (vs h-10 = 40px on desktop)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('Desktop Responsive (unchanged behavior)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
  })

  test('panels are visible inline by default', async ({ page }) => {
    await expect(page.getByText('Objects', { exact: true })).toBeVisible()
    await expect(page.getByText('Properties', { exact: true })).toBeVisible()
  })

  test('overflow menu is not visible on desktop', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'More options' })).not.toBeVisible()
  })

  test('project name is visible on desktop', async ({ page }) => {
    await expect(page.getByTestId('project-name')).toBeVisible()
  })

  test('camera preset buttons are visible on desktop', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Top View' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Front View' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Side View' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Isometric View' })).toBeVisible()
  })

  test('project dropdown is visible on desktop', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Project/i })).toBeVisible()
  })
})
