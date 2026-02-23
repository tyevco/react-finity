import type { Page } from '@playwright/test'

export async function addBaseplate(page: Page) {
  await page.getByRole('button', { name: /Add Object/i }).click()
  await page.getByRole('menuitem', { name: 'Baseplate' }).click()
}

export async function addBin(page: Page) {
  await page.getByRole('button', { name: /Add Object/i }).click()
  await page.getByRole('menuitem', { name: 'Bin' }).click()
}

/**
 * Click an object in the object list panel by its displayed name.
 * Uses force:true to bypass Playwright stability checks that can fail
 * when the WebGL canvas causes continuous layout recalculations.
 */
export async function clickObjectInList(
  page: Page,
  name: string,
  options?: { modifiers?: ('Shift' | 'Control' | 'Meta')[] },
) {
  await page
    .locator('.group')
    .getByText(name)
    .click({ force: true, ...options })
}
