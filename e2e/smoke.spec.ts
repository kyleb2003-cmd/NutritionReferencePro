import { test, expect } from '@playwright/test'

test('home loads and sign-in link works', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /nutrition reference pro/i })).toBeVisible()
  await page.getByRole('link', { name: /sign in/i }).first().click()
  await expect(page).toHaveURL(/\/auth\/sign-in/)
})

test('redirects to sign-in when visiting /dashboard signed out', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/auth\/sign-in/)
})
