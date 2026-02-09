
import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    // NOTE: For proper testing, set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables
    // with valid Firebase test account credentials.

    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    if (!testEmail || !testPassword) {
        console.log('⚠️  No test credentials provided. Creating empty auth state.');
        console.log('   To enable authenticated tests, set TEST_USER_EMAIL and TEST_USER_PASSWORD.');

        // Create minimal auth file to allow tests to run (unauthenticated)
        const emptyState = { cookies: [], origins: [] };
        fs.mkdirSync(path.dirname(authFile), { recursive: true });
        fs.writeFileSync(authFile, JSON.stringify(emptyState));
        return;
    }

    // Go to login page
    await page.goto('/login');

    // Fill in credentials
    await page.getByPlaceholder('example@email.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);

    // Click login button
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();

    // Wait for successful navigation
    await page.waitForURL('/', { timeout: 15000 });

    // Store the authenticated state
    await page.context().storageState({ path: authFile });
    console.log('✅ Authentication successful. State saved.');
});
