import { test, expect } from '@playwright/test'

test.describe('Viewport Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('settings button is visible in toolbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Viewport settings' })).toBeVisible()
  })

  test('opens settings dropdown with background options', async ({ page }) => {
    await page.getByRole('button', { name: 'Viewport settings' }).click()

    await expect(page.getByText('Background')).toBeVisible()
    await expect(page.getByRole('menuitemradio', { name: 'Dark' })).toBeVisible()
    await expect(page.getByRole('menuitemradio', { name: 'Light' })).toBeVisible()
    await expect(page.getByRole('menuitemradio', { name: 'Neutral' })).toBeVisible()
  })

  test('opens settings dropdown with lighting options', async ({ page }) => {
    await page.getByRole('button', { name: 'Viewport settings' }).click()

    await expect(page.getByText('Lighting')).toBeVisible()
    await expect(page.getByRole('menuitemradio', { name: 'Studio' })).toBeVisible()
    await expect(page.getByRole('menuitemradio', { name: 'Outdoor' })).toBeVisible()
    await expect(page.getByRole('menuitemradio', { name: 'Soft' })).toBeVisible()
  })

  test('dark background is selected by default', async ({ page }) => {
    await page.getByRole('button', { name: 'Viewport settings' }).click()

    const darkItem = page.getByRole('menuitemradio', { name: 'Dark' })
    await expect(darkItem).toHaveAttribute('data-state', 'checked')
  })

  test('studio lighting is selected by default', async ({ page }) => {
    await page.getByRole('button', { name: 'Viewport settings' }).click()

    const studioItem = page.getByRole('menuitemradio', { name: 'Studio' })
    await expect(studioItem).toHaveAttribute('data-state', 'checked')
  })

  test('clicking a background option selects it', async ({ page }) => {
    await page.getByRole('button', { name: 'Viewport settings' }).click()
    await page.getByRole('menuitemradio', { name: 'Light' }).click()

    // Reopen to verify selection persists
    await page.getByRole('button', { name: 'Viewport settings' }).click()
    const lightItem = page.getByRole('menuitemradio', { name: 'Light' })
    await expect(lightItem).toHaveAttribute('data-state', 'checked')
  })

  test('clicking a lighting option selects it', async ({ page }) => {
    await page.getByRole('button', { name: 'Viewport settings' }).click()
    await page.getByRole('menuitemradio', { name: 'Outdoor' }).click()

    // Reopen to verify selection persists
    await page.getByRole('button', { name: 'Viewport settings' }).click()
    const outdoorItem = page.getByRole('menuitemradio', { name: 'Outdoor' })
    await expect(outdoorItem).toHaveAttribute('data-state', 'checked')
  })
})
