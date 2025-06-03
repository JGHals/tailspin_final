import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { DailyChallenge } from '../daily-challenge'
import { mockUser, mockProfile, mockGameState } from '@/lib/test/mock-data'
import { TestWrapper } from '@/lib/test/test-wrapper'
import { waitForLoadingToComplete, ensureContextsReady } from '@/lib/test/loading-helpers'
import React from 'react'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loading-spinner" className="animate-spin">Loading...</div>,
  ArrowRight: () => <div data-testid="arrow-right">→</div>,
  ArrowLeft: () => <div data-testid="arrow-left">←</div>,
  Check: () => <div data-testid="check">✓</div>,
  X: () => <div data-testid="x">✗</div>,
  RefreshCw: () => <div data-testid="refresh">↻</div>
}))

// Mock the hooks and contexts
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    },
    profile: {
      id: 'test-user-123',
      displayName: 'Test User',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        notifications: true
      }
    },
    loading: false,
    error: null,
    isReady: true
  })
}))

jest.mock('@/lib/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: mockProfile,
    loading: false,
    error: null,
    isReady: true
  })
}))

jest.mock('@/lib/hooks/usePowerUpHandler', () => ({
  usePowerUpHandler: () => ({
    handlePowerUp: jest.fn(),
    showHintModal: false,
    showWordWarpGrid: false,
    hintWords: ['test', 'tent', 'term'],
    error: null,
    setError: jest.fn(),
    setShowHintModal: jest.fn(),
    setShowWordWarpGrid: jest.fn()
  })
}))

jest.mock('@/lib/contexts/dictionary-context', () => ({
  useDictionary: () => ({
    isReady: true,
    error: null,
    isLoading: false,
    dictionary: {
      isValidWord: jest.fn().mockResolvedValue(true),
      getWordsWithPrefix: jest.fn().mockResolvedValue(['test', 'tent', 'term'])
    },
    state: {
      status: 'ready',
      wordCount: 100000,
      lastUpdated: new Date().toISOString(),
      loadedPrefixes: 100,
      totalPrefixes: 100
    }
  }),
  DictionaryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

jest.mock('@/lib/contexts/GameContext', () => {
  const originalModule = jest.requireActual('@/lib/contexts/GameContext');

  // Define types inline to avoid Jest module factory limitations
  type ValidationFeedback = {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  };

  type UiState = {
    showTerminalCelebration: boolean;
    currentTerminalWord: string;
    terminalBonus: number;
    isNewTerminalDiscovery: boolean;
    letterTracking: {
      usedLetters: Set<string>;
      rareLettersUsed: Set<string>;
      uniqueLetterCount: number;
      rareLetterCount: number;
    };
    validationFeedback?: ValidationFeedback;
    chainQuality?: number;
  };

  type GameScore = {
    total: number;
    wordScores: Record<string, {
      base: number;
      length: number;
      rareLetters: number;
      streak: number;
      speed: number;
      total: number;
    }>;
    multiplier: number;
    terminalBonus: number;
    dailyBonus: number;
    penalties: number;
  };

  type MockGameState = {
    isLoading: boolean;
    chain: string[];
    startWord: string;
    targetWord: string;
    isComplete: boolean;
    ui: UiState;
    score: GameScore;
  };

  type MockStore = {
    state: {
      isInitializing: boolean;
      hasInitialized: boolean;
      gameState: MockGameState | null;
    };
  };

  // Create mock store with proper typing
  const mockStore: MockStore = {
    state: {
      isInitializing: false,
      hasInitialized: false,
      gameState: null
    }
  };

  const defaultUiState: UiState = {
    showTerminalCelebration: false,
    currentTerminalWord: '',
    terminalBonus: 0,
    isNewTerminalDiscovery: false,
    letterTracking: {
      usedLetters: new Set(),
      rareLettersUsed: new Set(),
      uniqueLetterCount: 0,
      rareLetterCount: 0
    }
  };

  const mockStartGame = jest.fn().mockImplementation(async () => {
    mockStore.state.isInitializing = true;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    mockStore.state = {
      isInitializing: false,
      hasInitialized: true,
      gameState: {
        isLoading: false,
        chain: ['planet'],
        startWord: 'planet',
        targetWord: 'technology',
        isComplete: false,
        ui: {
          ...defaultUiState,
          validationFeedback: {
            type: 'success',
            message: 'Game started'
          }
        },
        score: {
          total: 0,
          wordScores: {},
          multiplier: 1,
          terminalBonus: 0,
          dailyBonus: 0,
          penalties: 0
        }
      }
    };

    return Promise.resolve();
  });

  return {
    ...originalModule,
    useGame: () => ({
      gameState: mockStore.state.gameState,
      startGame: mockStartGame,
      addWord: jest.fn().mockImplementation((word: string) => {
        const currentState = mockStore.state.gameState;
        if (!currentState) {
          return Promise.reject(new Error('Game not initialized'));
        }

        if (word === currentState.targetWord) {
          mockStore.state.gameState = {
            ...currentState,
            chain: [...currentState.chain, word],
            isComplete: true,
            ui: {
              ...defaultUiState,
              validationFeedback: {
                type: 'success',
                message: 'Game complete!'
              }
            }
          };
          return Promise.resolve({
            success: true,
            gameComplete: true
          });
        }

        // Handle invalid word
        if (word === 'xyz') {
          return Promise.resolve({
            success: false,
            error: 'Invalid word'
          });
        }

        // Handle valid word
        mockStore.state.gameState = {
          ...currentState,
          chain: [...currentState.chain, word],
          ui: {
            ...defaultUiState,
            validationFeedback: {
              type: 'success',
              message: 'Word added successfully'
            }
          }
        };
        return Promise.resolve({
          success: true,
          gameComplete: false
        });
      }),
      useHint: jest.fn().mockResolvedValue({
        success: true,
        hints: ['test', 'tent', 'term']
      }),
      useWordWarp: jest.fn().mockResolvedValue({
        success: true,
        newWord: 'warp'
      }),
      useBridge: jest.fn().mockResolvedValue({
        success: true,
        bridgeWord: 'bridge'
      }),
      useUndo: jest.fn().mockImplementation(() => {
        const currentState = mockStore.state.gameState;
        if (!currentState || currentState.chain.length <= 1) {
          return Promise.reject(new Error('Cannot undo'));
        }
        mockStore.state.gameState = {
          ...currentState,
          chain: currentState.chain.slice(0, -1),
          isComplete: false,
          ui: {
            ...defaultUiState,
            validationFeedback: {
              type: 'info',
              message: 'Last word removed'
            }
          }
        };
        return Promise.resolve({
          success: true
        });
      })
    })
  };
})

jest.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    error: null
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock the UI components
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="alert-description">{children}</div>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  )
}))

jest.mock('@/components/word-chain', () => ({
  WordChain: ({ words }: { words: string[] }) => (
    <div data-testid="word-chain">
      {words.map((word) => (
        <div key={word} className="border-2 p-2 text-center font-medium rounded">
          <div className="flex flex-col">
            <span>{word.toLowerCase()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}))

jest.mock('@/components/word-input', () => ({
  WordInput: ({ onSubmit }: { onSubmit: (word: string) => void }) => (
    <input 
      type="text" 
      data-testid="word-input"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSubmit((e.target as HTMLInputElement).value)
        }
      }}
    />
  )
}))

jest.mock('@/components/game-stats-mobile', () => ({
  GameStatsMobile: () => <div data-testid="game-stats">Game Stats</div>
}))

jest.mock('@/components/terminal-word-celebration', () => ({
  TerminalWordCelebration: () => <div data-testid="celebration">Congratulations!</div>
}))

jest.mock('@/components/daily-challenge-complete', () => ({
  DailyChallengeComplete: () => <div data-testid="complete">Congratulations!</div>
}))

jest.mock('@/components/power-up-bar', () => ({
  PowerUpBar: () => (
    <div data-testid="power-up-bar">
      <button>hint</button>
      <button>flip</button>
      <button>bridge</button>
      <button>undo</button>
      <button>word-warp</button>
    </div>
  )
}))

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock Firebase services
jest.mock('@/lib/services/game-persistence', () => {
  const mockPersistence = {
    loadGameState: jest.fn().mockResolvedValue({
      chain: ['planet'],
      startWord: 'planet',
      targetWord: 'technology',
      isComplete: false,
      isLoading: false,
      ui: {
        validationFeedback: {
          type: 'success',
          message: 'Game started'
        }
      }
    }),
    saveGameState: jest.fn().mockResolvedValue(undefined),
    startAutoSave: jest.fn(),
    stopAutoSave: jest.fn()
  };

  return {
    GamePersistenceService: jest.fn().mockImplementation(() => mockPersistence),
    createGamePersistence: jest.fn().mockImplementation(() => mockPersistence)
  };
});

jest.mock('@/lib/services/startup-service', () => ({
  startupService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    retryFailedStages: jest.fn().mockResolvedValue(undefined),
    isDictionaryReady: jest.fn().mockReturnValue(true),
    getProgress: jest.fn().mockReturnValue({
      progress: {
        dictionary: true,
        cache: true,
        gameState: true
      },
      errors: []
    })
  }
}))

describe('Daily Challenge', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    mockGameState.chain = ['planet']
    mockGameState.startWord = 'planet'
    mockGameState.targetWord = 'technology'
    mockGameState.isComplete = false
    mockGameState.ui.validationFeedback = {
      type: 'success',
      message: 'Game started'
    }
  })

  it('should load the daily challenge page', async () => {
    const contextsReady = jest.fn()
    const { container } = render(
      <TestWrapper onContextsReady={contextsReady}>
        <DailyChallenge />
      </TestWrapper>
    )

    // Wait for contexts to be ready
    await waitFor(() => expect(contextsReady).toHaveBeenCalled())
    
    // Wait for loading states to resolve
    await waitFor(() => {
      expect(screen.queryByText('Loading Daily Challenge...')).not.toBeInTheDocument()
      expect(screen.queryByText('Initializing dictionary...')).not.toBeInTheDocument()
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument()
      expect(screen.queryByText('Loading profile...')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Check if the game loads with the starting word
    await waitFor(() => {
      expect(screen.getByTestId('word-chain')).toBeInTheDocument()
      expect(screen.getByText('planet')).toBeInTheDocument()
      expect(screen.getByTestId('game-stats')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should allow submitting a word', async () => {
    const contextsReady = jest.fn()
    render(
      <TestWrapper onContextsReady={contextsReady}>
        <DailyChallenge />
      </TestWrapper>
    )

    // Wait for contexts and loading
    await waitFor(() => expect(contextsReady).toHaveBeenCalled())
    await waitFor(() => {
      expect(screen.queryByText('Loading Daily Challenge...')).not.toBeInTheDocument()
      expect(screen.queryByText('Initializing dictionary...')).not.toBeInTheDocument()
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument()
      expect(screen.queryByText('Loading profile...')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Wait for the game to load
    await waitFor(() => {
      expect(screen.getByTestId('word-chain')).toBeInTheDocument()
      expect(screen.getByText('planet')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Submit a word
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'test')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    // Check if the word was added
    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument()
    })
  })

  it('should show validation feedback', async () => {
    const contextsReady = jest.fn()
    render(
      <TestWrapper onContextsReady={contextsReady}>
        <DailyChallenge />
      </TestWrapper>
    )

    // Wait for contexts and loading
    await waitFor(() => expect(contextsReady).toHaveBeenCalled())
    await waitFor(() => {
      expect(screen.queryByText('Loading Daily Challenge...')).not.toBeInTheDocument()
      expect(screen.queryByText('Initializing dictionary...')).not.toBeInTheDocument()
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument()
      expect(screen.queryByText('Loading profile...')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Submit an invalid word
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'xyz')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    // Check if validation feedback is shown
    await waitFor(() => {
      expect(screen.getByText('Invalid word')).toBeInTheDocument()
    })
  })

  it('should complete the game when target word is reached', async () => {
    const contextsReady = jest.fn()
    render(
      <TestWrapper onContextsReady={contextsReady}>
        <DailyChallenge />
      </TestWrapper>
    )

    // Wait for contexts and loading
    await waitFor(() => expect(contextsReady).toHaveBeenCalled())
    await waitFor(() => {
      expect(screen.queryByText('Loading Daily Challenge...')).not.toBeInTheDocument()
      expect(screen.queryByText('Initializing dictionary...')).not.toBeInTheDocument()
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument()
      expect(screen.queryByText('Loading profile...')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Submit the target word
    const input = screen.getByRole('textbox')
    await userEvent.type(input, mockGameState.targetWord || '')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    // Check if the game is complete
    await waitFor(() => {
      expect(screen.getByText('Game complete!')).toBeInTheDocument()
    })
  })

  it('should allow using power-ups', async () => {
    const contextsReady = jest.fn()
    render(
      <TestWrapper onContextsReady={contextsReady}>
        <DailyChallenge />
      </TestWrapper>
    )

    // Wait for contexts and loading
    await waitFor(() => expect(contextsReady).toHaveBeenCalled())
    await waitFor(() => {
      expect(screen.queryByText('Loading Daily Challenge...')).not.toBeInTheDocument()
      expect(screen.queryByText('Initializing dictionary...')).not.toBeInTheDocument()
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument()
      expect(screen.queryByText('Loading profile...')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Wait for the game to load
    await waitFor(() => {
      expect(screen.getByTestId('word-chain')).toBeInTheDocument()
      expect(screen.getByText('planet')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Use a power-up
    await userEvent.click(screen.getByRole('button', { name: /hint/i }))

    // Check if the hint modal is shown
    await waitFor(() => {
      expect(screen.getByText('Suggested Words')).toBeInTheDocument()
    })
  })
}) 