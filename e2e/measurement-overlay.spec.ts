import { test, expect } from '@playwright/test'
import { addBaseplate, addBin } from './fixtures'

test.describe('Measurement Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows measurement overlay when baseplate is selected', async ({ page }) => {
    await addBaseplate(page)

    // Default baseplate: 3x3 grid, Official profile
    // 3*42=126 width, 3*42=126 depth, baseplateHeight=4.65
    const overlay = page.getByTestId('measurement-overlay')
    await expect(overlay).toBeVisible()
    await expect(overlay).toContainText('126 x 126')
    await expect(overlay).toContainText('mm')
  })

  test('shows measurement overlay when bin is selected', async ({ page }) => {
    await addBin(page)

    // Default bin: 1x1 grid, 3 height units, Official profile
    // 1*42=42, 1*42=42, 3*7=21
    const overlay = page.getByTestId('measurement-overlay')
    await expect(overlay).toBeVisible()
    await expect(overlay).toContainText('42 x 42 x 21 mm')
  })

  test('measurement overlay updates when params change', async ({ page }) => {
    await addBin(page)

    // Change grid width from 1 to 2
    const widthSlider = page.getByRole('slider').first()
    await widthSlider.focus()
    await page.keyboard.press('ArrowRight')

    const overlay = page.getByTestId('measurement-overlay')
    await expect(overlay).toContainText('84 x 42 x 21 mm')
  })

  test('measurement overlay disappears when object is deselected', async ({ page }) => {
    await addBaseplate(page)
    await expect(page.getByTestId('measurement-overlay')).toBeVisible()

    // Deselect via Escape
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('measurement-overlay')).not.toBeVisible()
  })

  test('measurement overlay shows correct dimensions for different objects', async ({ page }) => {
    await addBaseplate(page)
    await addBin(page)

    // Bin is selected (last added)
    const overlay = page.getByTestId('measurement-overlay')
    await expect(overlay).toContainText('42 x 42 x 21 mm')

    // Select the baseplate
    await page.locator('.group').getByText('Baseplate 1').click()
    await expect(overlay).toContainText('126 x 126')
  })
})
