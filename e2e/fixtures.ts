import type { Page } from '@playwright/test'

export async function addBaseplate(page: Page) {
  await page.getByRole('button', { name: /Add Object/i }).click()
  await page.getByRole('menuitem', { name: 'Baseplate' }).click()
}

export async function addBin(page: Page) {
  await page.getByRole('button', { name: /Add Object/i }).click()
  await page.getByRole('menuitem', { name: 'Bin' }).click()
}
