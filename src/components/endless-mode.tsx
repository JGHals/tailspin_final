"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { WordChain } from "@/components/word-chain"
import { WordInput } from "@/components/word-input"
import { GameStatsMobile } from "@/components/game-stats-mobile"
import { PowerUpBar, type PowerUpType } from "@/components/power-up-bar"
import { TerminalWordCelebration } from "@/components/terminal-word-celebration"
import { WordWarpGrid } from "@/components/word-warp-grid"
import { HintModal } from "@/components/hint-modal"
import * as LucideIcons from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useGame } from "@/lib/contexts/GameContext"
import { RARE_LETTERS } from "@/lib/game/scoring"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useDictionary } from "@/lib/contexts/dictionary-context"
import type { GameScore } from "@/lib/game/scoring"
import { useToast } from "@/components/ui/use-toast"
import { usePowerUps } from "@/lib/hooks/usePowerUps"
import { validateWord, checkWordConnection } from "@/lib/validation/word-validation"
import { isTerminalWord } from "@/lib/validation/terminal-detection"

function LetterTracker({ usedLetters, rareLettersUsed }: { usedLetters: Set<string>, rareLettersUsed: Set<string> }) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  return (
    <div className="grid grid-cols-13 gap-1 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
      {alphabet.map(letter => (
        <div
          key={letter}
          className={`
            w-6 h-6 flex items-center justify-center rounded text-sm font-medium
            ${usedLetters.has(letter) 
              ? rareLettersUsed.has(letter)
                ? 'bg-yellow-500 text-white'
                : 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
            }
          `}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

export function EndlessMode() {
  const { user, signInWithGoogle, isLoading: authLoading } = useAuth()
  const { profile, updateTokens, loading: profileLoading } = useUserProfile()
  const { isReady: isDictionaryReady, error: dictionaryError, isLoading: dictionaryLoading } = useDictionary()
  const { toast } = useToast()
  const { 
    gameState, 
    startGame, 
    addWord,
    isLoading: gameLoading,
    error: gameError
  } = useGame()
  
  // Add power-up hooks
  const {
    getHint,
    performUndo,
    performWordWarp,
    performFlip,
    performBridge
  } = usePowerUps(gameState?.chain || [])
  
  const [showTerminalCelebration, setShowTerminalCelebration] = useState(false)
  const [showWordWarpGrid, setShowWordWarpGrid] = useState(false)
  const [showHintModal, setShowHintModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTerminalWord, setCurrentTerminalWord] = useState("")
  const [terminalBonus, setTerminalBonus] = useState(0)
  const [isNewTerminalDiscovery, setIsNewTerminalDiscovery] = useState(false)
  const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set())
  const [rareLettersUsed, setRareLettersUsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let mounted = true;
    let initializeTimeout: NodeJS.Timeout;

    async function initializeGame() {
      if (!mounted) return;

      try {
        // Only proceed if all dependencies are ready
        if (!isDictionaryReady || !user || !profile || profileLoading || dictionaryLoading) {
          return;
        }

        // Add a small delay to prevent potential race conditions
        initializeTimeout = setTimeout(async () => {
          if (mounted) {
            await startGame('endless');
          }
        }, 100);
      } catch (err) {
        console.error("Error initializing game:", err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to initialize game");
      }
    }

    initializeGame();

    return () => {
      mounted = false;
      if (initializeTimeout) {
        clearTimeout(initializeTimeout);
      }
    };
  }, [isDictionaryReady, user, profile, profileLoading, dictionaryLoading, startGame]);

  // Update letter tracking when game state changes
  useEffect(() => {
    if (!gameState?.chain?.length) {
      setUsedLetters(new Set());
      setRareLettersUsed(new Set());
      return;
    }
    
    const letters = new Set<string>();
    const rare = new Set<string>();
    
    try {
      gameState.chain.forEach(word => {
        if (typeof word === 'string') {
          word.toUpperCase().split('').forEach(letter => {
            letters.add(letter);
            if (RARE_LETTERS.has(letter)) {
              rare.add(letter);
            }
          });
        }
      });
    } catch (err) {
      console.error("Error processing letters:", err);
      // Don't show error to user as it's not critical to gameplay
    }
    
    setUsedLetters(letters);
    setRareLettersUsed(rare);
  }, [gameState?.chain]);

  // Update error state when game error changes
  useEffect(() => {
    if (gameError) {
      setError(gameError);
    } else {
      setError(null);
    }
  }, [gameError]);

  const handleWordSubmit = async (word: string) => {
    if (!gameState) {
      setError("Game not initialized");
      return;
    }

    if (!word || typeof word !== 'string') {
      setError("Invalid word");
      return;
    }

    setError(null);
    try {
      const result = await addWord(word);
      
      if (!result?.success) {
        setError(result?.error || "Invalid word");
        return;
      }

      // Terminal word handling is now managed by GameState
      if (result.gameComplete && user && profile) {
        // Award tokens for finding a terminal word
        const tokens = gameState.ui?.isNewTerminalDiscovery ? 10 : 5;
        try {
          await updateTokens(tokens);
        } catch (err) {
          console.error("Failed to update tokens:", err);
          // Don't show error to user as it's not critical to gameplay
        }
      }

      // Show terminal celebration if applicable
      if (gameState.ui?.showTerminalCelebration) {
        setShowTerminalCelebration(true);
      }
    } catch (err) {
      console.error("Error submitting word:", err);
      setError("Failed to submit word. Please try again.");
    }
  }

  const handleUsePowerUp = async (type: PowerUpType) => {
    if (!user || !profile || !gameState) {
      setError("Please sign in to use power-ups");
      return;
    }

    try {
      let result;
      switch (type) {
        case "hint":
          const hints = await getHint();
          if (hints && hints.length > 0) {
            setShowHintModal(true);
          } else {
            setError("Could not get hints at this time");
          }
          break;

        case "undo":
          result = await performUndo();
          if (result?.success) {
            // Chain will be updated automatically by the hook
          } else {
            setError(result?.error || "Could not undo");
          }
          break;

        case "wordWarp":
          result = await performWordWarp();
          if (result?.success) {
            setShowWordWarpGrid(true);
          } else {
            setError(result?.error || "Could not use Word Warp");
          }
          break;

        case "flip":
          result = await performFlip();
          if (result?.success && result.data) {
            const { originalPrefix, flippedPrefix } = result.data;
            toast({
              description: `Flipped '${originalPrefix}' to '${flippedPrefix}'`,
              variant: "default"
            });
          } else {
            setError(result?.error || "Could not use Flip");
          }
          break;

        case "bridge":
          result = await performBridge();
          if (result?.success && result.data?.bridgeWord) {
            await handleWordSubmit(result.data.bridgeWord);
          } else {
            setError(result?.error || "Could not use Bridge");
          }
          break;
      }
    } catch (err) {
      console.error("Error using power-up:", err);
      setError("Failed to use power-up. Please try again.");
    }
  }

  const handleWordWarpSelection = async (letters: string) => {
    try {
      const result = await performWordWarp();
      if (!result?.success || !result.data?.words) {
        setError("No valid words available for word warp");
        return;
      }

      const words = result.data.words;
      if (words.length > 0) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        await handleWordSubmit(randomWord);
        setShowWordWarpGrid(false);
      } else {
        setError("No valid words found starting with those letters. Try another combination.");
      }
    } catch (err) {
      console.error("Error processing word warp selection:", err);
      setError("Failed to process word warp selection");
    }
  }

  const handleContinueAfterTerminal = () => {
    setShowTerminalCelebration(false);
  }

  const resetGame = async () => {
    try {
      await startGame('endless');
      setError(null);
    } catch (err) {
      console.error("Failed to reset game:", err);
      setError("Failed to start new game. Please try again.");
    }
  }

  // Render the start word with highlighted last two letters
  const renderStartWord = () => {
    if (!gameState?.chain?.[0]) return null;

    const word = gameState.chain[0];
    const lastTwo = word.slice(-2);
    
    return (
      <div className="text-xl font-bold">
        {word.slice(0, -2)}
        <span className="text-blue-600 dark:text-blue-400">{lastTwo}</span>
      </div>
    );
  }

  // Early return for loading state
  if (authLoading || profileLoading || dictionaryLoading || gameLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
        <Alert variant="destructive" className="max-w-md">
          <LucideIcons.AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={resetGame}
        >
          <LucideIcons.RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Early return if game state is not initialized
  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Button onClick={() => startGame('endless')}>
          Start Game
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {gameState?.chain?.length > 0 && (
        <>
          <div className="flex flex-col items-center space-y-2">
            {renderStartWord()}
            <div className="text-sm text-muted-foreground">Start Word</div>
          </div>

          <GameStatsMobile
            score={gameState.score?.total ?? 0}
            moves={(gameState.chain?.length ?? 1) - 1}
          />

          <LetterTracker 
            usedLetters={usedLetters ?? new Set()} 
            rareLettersUsed={rareLettersUsed ?? new Set()} 
          />

          <WordChain words={gameState.chain ?? []} />

          {error && (
            <Alert variant="destructive">
              <LucideIcons.AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {gameState.isComplete ? (
            <Button onClick={resetGame} className="w-full">
              <LucideIcons.RefreshCw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
          ) : (
            <>
              <WordInput 
                onSubmit={handleWordSubmit} 
                lastWord={gameState.chain?.[gameState.chain.length - 1] ?? ''} 
                disabled={!!gameState.isComplete}
              />
              {user && profile && (
                <PowerUpBar
                  onUsePowerUp={handleUsePowerUp}
                  disabled={!!gameState.isComplete}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Modals */}
      {showTerminalCelebration && gameState?.ui?.showTerminalCelebration && (
        <TerminalWordCelebration
          isOpen={!!showTerminalCelebration}
          onClose={() => setShowTerminalCelebration(false)}
          word={gameState.ui?.currentTerminalWord ?? ''}
          terminalCombo={gameState.ui?.currentTerminalWord?.slice(-2) ?? ''}
          bonusPoints={gameState.ui?.terminalBonus ?? 0}
          isNewDiscovery={!!gameState.ui?.isNewTerminalDiscovery}
        />
      )}

      {showWordWarpGrid && (
        <WordWarpGrid
          onSelect={handleWordWarpSelection}
          onClose={() => setShowWordWarpGrid(false)}
        />
      )}

      {showHintModal && (
        <HintModal
          open={showHintModal}
          onOpenChange={(open) => setShowHintModal(open)}
        />
      )}
    </div>
  );
}
