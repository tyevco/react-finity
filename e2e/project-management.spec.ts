import { test, expect } from '@playwright/test'

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows Project dropdown in toolbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Project/ })).toBeVisible()
  })

  test('Project dropdown shows menu items', async ({ page }) => {
    await page.getByRole('button', { name: /Project/ }).click()

    await expect(page.getByRole('menuitem', { name: /New Project/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /^Save$/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Save As/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Manage Projects/ })).toBeVisible()
  })

  test('displays project name in toolbar', async ({ page }) => {
    const projectName = page.getByTestId('project-name')
    await expect(projectName).toBeVisible()
    await expect(projectName).toHaveText('Untitled Project')
  })

  test('Save clears dirty indicator', async ({ page }) => {
    // Add an object
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()

    // Manually save immediately
    await page.getByRole('button', { name: /Project/ }).click()
    await page.getByRole('menuitem', { name: /^Save$/ }).click()

    // Dirty indicator should be gone
    const projectName = page.getByTestId('project-name')
    await expect(projectName).not.toContainText('*')
  })

  test('Save As creates a named project', async ({ page }) => {
    // Add an object
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()

    // Save As
    await page.getByRole('button', { name: /Project/ }).click()
    await page.getByRole('menuitem', { name: /Save As/ }).click()

    // Fill in the name
    const nameInput = page.getByLabel('Project name')
    await nameInput.clear()
    await nameInput.fill('My Test Project')
    await page.getByRole('button', { name: /^Save$/ }).click()

    // Project name should update
    const projectName = page.getByTestId('project-name')
    await expect(projectName).toHaveText('My Test Project')
  })

  test('New Project clears objects', async ({ page }) => {
    // Add an object
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()

    // Wait for the object to appear in the object list
    await expect(page.getByText(/Bin \d+/).first()).toBeVisible()

    // Ensure no dropdown is open before opening the Project menu
    await page.keyboard.press('Escape')

    // New Project
    await page.getByRole('button', { name: /Project/ }).click()
    await page.getByRole('menuitem', { name: /New Project/ }).click()

    // Objects should be cleared
    await expect(page.getByText('No objects yet')).toBeVisible()
    const projectName = page.getByTestId('project-name')
    await expect(projectName).toHaveText('Untitled Project')
  })

  test('Manage Projects dialog opens', async ({ page }) => {
    await page.getByRole('button', { name: /Project/ }).click()
    await page.getByRole('menuitem', { name: /Manage Projects/ }).click()

    await expect(page.getByRole('heading', { name: 'Manage Projects' })).toBeVisible()
    await expect(page.getByText('No saved projects yet')).toBeVisible()
  })

  test('Manage Projects lists saved projects', async ({ page }) => {
    // Save a project
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()
    await page.getByRole('button', { name: /Project/ }).click()
    await page.getByRole('menuitem', { name: /Save As/ }).click()
    await page.getByLabel('Project name').fill('Saved Project')
    await page.getByRole('button', { name: /^Save$/ }).click()

    // Open manage dialog
    await page.getByRole('button', { name: /Project/ }).click()
    await page.getByRole('menuitem', { name: /Manage Projects/ }).click()

    // Should show the saved project in the dialog using a more specific locator
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Saved Project', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Current')).toBeVisible()
  })

  test('Ctrl+S saves the project', async ({ page }) => {
    // Press Ctrl+S on empty project
    await page.keyboard.press('Control+s')

    // Should have created a saved project
    const projectName = page.getByTestId('project-name')
    // After save, project name should not have dirty indicator
    await expect(projectName).toHaveText('Untitled Project')

    // Verify a project ID was assigned by checking that saving works
    await page.getByRole('button', { name: /Project/ }).click()
    await page.getByRole('menuitem', { name: /Manage Projects/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Untitled Project', { exact: true })).toBeVisible()
  })

  test('project persists across page reload', async ({ page }) => {
    // Add an object and save
    await page.getByRole('button', { name: /Add Object/i }).click()
    await page.getByRole('menuitem', { name: 'Bin' }).click()
    await page.getByRole('button', { name: /Project/ }).click()
    await page.getByRole('menuitem', { name: /Save As/ }).click()
    await page.getByLabel('Project name').fill('Persist Test')
    await page.getByRole('button', { name: /^Save$/ }).click()

    // Wait for project name to confirm save completed
    await expect(page.getByTestId('project-name')).toHaveText('Persist Test')

    // Reload the page
    await page.reload()

    // Project name should be restored (extra timeout for hydration)
    const projectName = page.getByTestId('project-name')
    await expect(projectName).toHaveText('Persist Test', { timeout: 7000 })

    // Objects should be restored in the object list
    await expect(page.getByText(/Bin \d+/).first()).toBeVisible({ timeout: 7000 })
  })
})
