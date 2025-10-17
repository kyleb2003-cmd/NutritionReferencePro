import { test, expect } from '@playwright/test'
import { gotoAndWait, expectUrl, homeHeading, clickRole } from './utils'

test('home loads and sign-in link works', async ({ page }) => {
  await gotoAndWait(page, '/')
  await expect(homeHeading(page)).toBeVisible()
  await clickRole(page, 'link', /sign in/i)
  await expectUrl(page, /\/auth\/sign-in/)
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})

test('redirects to sign-in when visiting /dashboard signed out', async ({ page }) => {
  await gotoAndWait(page, '/dashboard')
  await expectUrl(page, /\/auth\/sign-in/)
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})

test('redirects to sign-in when visiting /dashboard/branding signed out', async ({ page }) => {
  await gotoAndWait(page, '/dashboard/branding')
  await expectUrl(page, /\/auth\/sign-in/)
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})
