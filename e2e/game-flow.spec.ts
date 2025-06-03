import { test, expect } from '@playwright/test';
import { mockAuthState, waitForGameReady, submitWord, verifyGameState } from './utils/test-utils';

test.describe('Basic Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock auth before each test
    await mockAuthState(page);
  });

  test('can play daily challenge', async ({ page }) => {
    // 1. Load homepage
    await page.goto('/');
    
    // 2. Navigate to Daily Challenge
    await page.click('[data-testid="daily-challenge-button"]');
    
    // 3. Wait for game to be ready
    await waitForGameReady(page);
    
    // 4. Submit a valid word
    await submitWord(page, 'puzzle');
    
    // 5. Verify game state updates
    await verifyGameState(page);
    
    // 6. Verify score is displayed
    const scoreElement = await page.waitForSelector('[data-testid="score-display"]');
    const scoreText = await scoreElement.textContent();
    expect(scoreText).toBeTruthy();
    
    // 7. Verify word chain is updated
    const chainElement = await page.waitForSelector('[data-testid="word-chain"]');
    const chainText = await chainElement.textContent();
    expect(chainText).toContain('puzzle');
  });
}); 