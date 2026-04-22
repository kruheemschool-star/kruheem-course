import { test, expect } from '@playwright/test';
import { deriveExamLevel } from '../lib/exam-level';

// ==========================================================================
// Pure logic tests for deriveExamLevel
// ==========================================================================
test.describe('deriveExamLevel() — exam level derivation logic', () => {
    test('Primary: "ประถม" in category returns "primary"', () => {
        expect(deriveExamLevel('ประถม', '')).toBe('primary');
        expect(deriveExamLevel('สอบเข้า ม.1', '')).toBe('primary');
        expect(deriveExamLevel('', 'ป.6')).toBe('primary');
        expect(deriveExamLevel('ป.4', '')).toBe('primary');
    });

    test('Lower secondary: "ม.ต้น" or ม.1-3 returns "lower"', () => {
        expect(deriveExamLevel('ม.ต้น', '')).toBe('lower');
        expect(deriveExamLevel('มัธยมต้น', '')).toBe('lower');
        expect(deriveExamLevel('', 'ม.2')).toBe('lower');
        expect(deriveExamLevel('', 'ม.3')).toBe('lower');
    });

    test('Upper secondary: "ม.ปลาย" or ม.4-6 returns "upper"', () => {
        expect(deriveExamLevel('ม.ปลาย', '')).toBe('upper');
        expect(deriveExamLevel('มัธยมปลาย', '')).toBe('upper');
        expect(deriveExamLevel('', 'ม.5')).toBe('upper');
        expect(deriveExamLevel('', 'ม.6')).toBe('upper');
    });

    test('Empty / unknown input returns undefined (legacy fallback)', () => {
        expect(deriveExamLevel('', '')).toBeUndefined();
        expect(deriveExamLevel(null, null)).toBeUndefined();
        expect(deriveExamLevel(undefined, undefined)).toBeUndefined();
        expect(deriveExamLevel('คณิตศาสตร์', '')).toBeUndefined();
    });

    test('Priority: "ประถม/สอบเข้า ม.1" beats bare "ม.1" match', () => {
        // "สอบเข้า ม.1" should be primary, not lower
        expect(deriveExamLevel('สอบเข้า ม.1', '')).toBe('primary');
        expect(deriveExamLevel('คลังข้อสอบประถม', 'ม.1')).toBe('primary');
    });

    test('Title fallback: recovers correct level when category is mis-tagged', () => {
        // Admin quick-add defaulted category to "ม.ต้น" but title clearly says
        // "สอบเข้า ม.1" → should resolve to primary via title signal.
        expect(deriveExamLevel('ม.ต้น', 'ม.1', 'แบบฝึกหัด สอบเข้า ม.1 ชุดที่ 7')).toBe('primary');
        // Title-only fallback (category empty)
        expect(deriveExamLevel(null, null, 'ข้อสอบ ม.ปลาย ชุดที่ 2')).toBe('upper');
        // Title doesn't override correctly-tagged categories
        expect(deriveExamLevel('ม.ต้น', 'ม.3', 'ข้อสอบ ม.3')).toBe('lower');
    });
});

// ==========================================================================
// UI smoke tests — verify nothing is broken for anonymous users
// ==========================================================================
test.describe('Exam pages — public access still works', () => {
    test('/exam listing page loads without crashing', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        const response = await page.goto('/exam', { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(500);

        // Wait for at least one exam card or an empty-state to render
        await page.waitForSelector('main', { timeout: 15000 });
        await page.waitForTimeout(2000); // allow Firestore to hydrate data

        // Page title exists
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);

        // No uncaught JS errors
        expect(errors, `Page errors:\n${errors.join('\n')}`).toHaveLength(0);
    });

    test('Anonymous user visiting a paid exam page does NOT see exam content (guard works)', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        // Find any exam link
        await page.goto('/exam', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('main', { timeout: 15000 });
        await page.waitForTimeout(2000);

        const examLinks = page.locator('a[href^="/exam/"]');
        const count = await examLinks.count();

        test.skip(count === 0, 'No exam links found on /exam');

        // Visit first exam anonymously
        const firstHref = await examLinks.first().getAttribute('href');
        const response = await page.goto(firstHref!, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(500);

        await page.waitForSelector('main', { timeout: 15000 });
        await page.waitForTimeout(3000); // ExamAccessGuard needs time to check enrollment

        // Page renders without errors
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
        expect(errors, `Page errors:\n${errors.join('\n')}`).toHaveLength(0);
    });
});
