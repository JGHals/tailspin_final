import { dailyPuzzleService } from '../game/daily-puzzle-service';
import { dictionaryAccess } from '../dictionary/dictionary-access';
import { gameStateService } from './game-state-service';

interface InitializationProgress {
  dictionary: boolean;
  cache: boolean;
  gameState: boolean;
  puzzles: boolean;
}

interface InitializationError {
  stage: keyof InitializationProgress;
  error: string;
  retryCount: number;
}

class StartupService {
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay
  
  private progress: InitializationProgress = {
    dictionary: false,
    cache: false,
    gameState: false,
    puzzles: false
  };

  private errors: InitializationError[] = [];

  private async retryOperation(
    operation: () => Promise<void>,
    stage: keyof InitializationProgress,
    maxRetries = this.MAX_RETRIES
  ): Promise<void> {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await operation();
        this.progress[stage] = true;
        // Clear any previous errors for this stage
        this.errors = this.errors.filter(e => e.stage !== stage);
        return;
      } catch (err) {
        retryCount++;
        const error = err instanceof Error ? err.message : String(err);
        console.error(`${stage} initialization attempt ${retryCount} failed:`, error);
        
        // Record the error
        this.errors = [
          ...this.errors.filter(e => e.stage !== stage),
          { stage, error, retryCount }
        ];
        
        if (retryCount < maxRetries) {
          const delay = this.RETRY_DELAY * Math.pow(2, retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`${stage} initialization failed after ${maxRetries} attempts`);
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        // 1. Initialize dictionary access
        await this.retryOperation(
          async () => {
            await dictionaryAccess.initialize();
          },
          'dictionary'
        );

        // 2. Warm up dictionary cache with common prefixes
        await this.retryOperation(
          async () => {
            const commonPrefixes = ['th', 'an', 'in', 're', 'on', 'at', 'en', 'er', 'es', 'st'];
            await Promise.all(
              commonPrefixes.map(prefix => dictionaryAccess.getWords(prefix))
            );
          },
          'cache'
        );

        // Mark dictionary as ready after cache is warmed up
        this.progress.dictionary = true;
        this.progress.cache = true;

        // 3. Clean up game states
        await this.retryOperation(
          async () => {
            await gameStateService.cleanupDailyChallenges();
          },
          'gameState'
        );
        this.progress.gameState = true;

        // 4. Verify today's puzzle exists
        await this.retryOperation(
          async () => {
            const today = new Date();
            const puzzle = await dailyPuzzleService.getDailyPuzzle(today);
            if (!puzzle) {
              throw new Error('Daily puzzle not found');
            }
          },
          'puzzles'
        );
        this.progress.puzzles = true;

        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize game services:', error);
        throw error;
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  getProgress(): { progress: InitializationProgress; errors: InitializationError[] } {
    return {
      progress: { ...this.progress },
      errors: [...this.errors]
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isDictionaryReady(): boolean {
    return this.progress.dictionary && this.progress.cache;
  }

  // Force retry of failed stages
  async retryFailedStages(): Promise<void> {
    const failedStages = Object.entries(this.progress)
      .filter(([_, success]) => !success)
      .map(([stage]) => stage as keyof InitializationProgress);

    if (failedStages.length === 0) return;

    for (const stage of failedStages) {
      await this.retryOperation(
        async () => {
          switch (stage) {
            case 'dictionary':
              await dictionaryAccess.initialize();
              break;
            case 'cache':
              const commonPrefixes = ['th', 'an', 'in', 're', 'on', 'at', 'en', 'er', 'es', 'st'];
              await Promise.all(
                commonPrefixes.map(prefix => dictionaryAccess.getWords(prefix))
              );
              break;
            case 'gameState':
              await gameStateService.cleanupDailyChallenges();
              break;
            case 'puzzles':
              // Prefetch puzzles for the next few days
              const today = new Date();
              for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                await dailyPuzzleService.getDailyPuzzle(date);
              }
              break;
          }
        },
        stage
      );
    }
  }
}

// Export singleton instance
export const startupService = new StartupService(); 