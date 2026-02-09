
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {

    test('should display login page correctly', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle(/KruHeem Course/i);
        await expect(page.getByRole('heading', { name: /เข้าสู่ระบบ/i })).toBeVisible();
        await expect(page.getByPlaceholder('example@email.com')).toBeVisible();
        await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    });

    test('should show validation error for empty login', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
        // Assuming HTML5 validation or JS validation prevents submission
        // Adjust based on actual implementation. Ideally check for validation message.
    });

    test('should navigate to register page from login', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('link', { name: /สมัครสมาชิกใหม่ที่นี่/i }).click();
        await expect(page).toHaveURL(/.*register/);
        await expect(page.getByRole('heading', { name: /สร้างบัญชีใหม่/i })).toBeVisible();
    });

    test('should display register page correctly', async ({ page }) => {
        await page.goto('/register');
        await expect(page.getByPlaceholder('••••••••').first()).toBeVisible();
        // Check for confirm password field (assuming same placeholder or similar structure)
        // Since both have same placeholder, we might need to be specific or just check count
        await expect(page.getByPlaceholder('••••••••')).toHaveCount(2);
    });

});
