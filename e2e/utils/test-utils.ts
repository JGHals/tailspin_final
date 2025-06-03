import { Page } from '@playwright/test';

// Mock user data for testing
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

// Mock auth state without touching Firebase
export async function mockAuthState(page: Page) {
  await page.addInitScript(`
    window.mockAuthUser = ${JSON.stringify(mockUser)};
    // Intercept auth state changes without modifying app code
    Object.defineProperty(window, '__authStateListener', {
      writable: true,
      value: (user) => user
    });
  `);
}

// Helper to wait for game state to be ready
export async function waitForGameReady(page: Page) {
  await page.waitForSelector('[data-testid="game-board"]', { state: 'visible' });
}

// Helper to submit a word in the game
export async function submitWord(page: Page, word: string) {
  await page.fill('[data-testid="word-input"]', word);
  await page.click('[data-testid="submit-button"]');
}

// Helper to verify game state updates
export async function verifyGameState(page: Page) {
  await page.waitForSelector('[data-testid="word-chain"]', { state: 'visible' });
  await page.waitForSelector('[data-testid="score-display"]', { state: 'visible' });
} 