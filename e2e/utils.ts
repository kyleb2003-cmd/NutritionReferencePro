import { expect, type Page } from '@playwright/test'

type RoleName = Parameters<Page['getByRole']>[0]

export async function gotoAndWait(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

export async function clickRole(page: Page, role: RoleName, name: string | RegExp) {
  await page.getByRole(role, { name }).first().click()
}

export async function expectUrl(page: Page, regex: RegExp) {
  await expect(page).toHaveURL(regex)
}

export function homeHeading(page: Page) {
  return page.getByRole('heading', { name: /nutrition handouts/i })
}
