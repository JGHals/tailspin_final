"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { WordChain } from "@/components/word-chain"
import { WordInput } from "@/components/word-input"
import { GameStatsMobile } from "@/components/game-stats-mobile"
import { TerminalWordCelebration } from "@/components/terminal-word-celebration"
import { WordWarpGrid } from "@/components/word-warp-grid"
import { HintModal } from "@/components/hint-modal"
import { PowerUpBar, type PowerUpType } from "@/components/power-up-bar"
import { DailyChallengeComplete } from "@/components/daily-challenge-complete"
import * as LucideIcons from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useDictionary } from "@/lib/contexts/dictionary-context"
import { useGame } from "@/lib/contexts/game-context"
import { useToast } from "@/components/ui/use-toast"
import type { Achievement } from "@/lib/types/user-profile"
import type { PowerUpResult, GameScore, GameState } from "@/lib/types/game"
import { usePowerUpHandler } from "@/lib/hooks/usePowerUpHandler"
import { validateWord, checkWordConnection } from "@/lib/validation/word-validation"
import { isTerminalWord } from "@/lib/validation/terminal-detection"
import { canFlipCombo, getFlippedCombo } from "@/lib/game-utils"

export function DailyChallenge() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { isReady: isDictionaryReady } = useDictionary()
  const { toast } = useToast()
  const { 
    gameState, 
    startGame,
    addWord,
    isLoading: gameLoading,
    error: gameError
  } = useGame()

  const {
    handlePowerUp,
    showHintModal,
    showWordWarpGrid,
    hintWords,
    error,
    setError,
    setShowHintModal,
    setShowWordWarpGrid
  } = usePowerUpHandler(gameState, user, profile, toast)

  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [showTerminalCelebration, setShowTerminalCelebration] = useState(false)
  const [tokensEarned, setTokensEarned] = useState(0)

  useEffect(() => {
    let mounted = true

    async function initGame() {
      if (!mounted) return

      try {
        if (!isDictionaryReady || !user || !profile) {
          return
        }

        await startGame('daily')
      } catch (err) {
        console.error("Error initializing game:", err)
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to initialize game")
      }
    }

    initGame()

    return () => {
      mounted = false
    }
  }, [isDictionaryReady, user, profile, startGame, setError])

  // Update error state when game error changes
  useEffect(() => {
    if (gameError) {
      setError(gameError)
    } else {
      setError(null)
    }
  }, [gameError, setError])

  const handleWordSubmit = async (word: string) => {
    setError(null)
    
    try {
      const result = await addWord(word)
      
      if (!result.success) {
        setError(result.error || "Invalid word")
        return
      }

      // Show validation feedback if available
      if (gameState?.ui.validationFeedback) {
        const feedback = gameState.ui.validationFeedback
        if (feedback.type === 'warning') {
          toast({
            title: "Warning",
            description: feedback.message,
            variant: "destructive"
          })
        }
      }

      // Handle game completion
      if (gameState?.isComplete && user) {
        setShowCompletionModal(true)
        
        // Show achievement notifications
        gameState.achievements?.forEach((achievement: Achievement) => {
          toast({
            title: `Achievement Unlocked: ${achievement.name}`,
            description: achievement.description,
            variant: "default"
          })
        })
      }
    } catch (error) {
      console.error("Error submitting word:", error)
      setError("Failed to submit word. Please try again.")
    }
  }

  const handleUsePowerUp = async (type: PowerUpType) => {
    if (!user || !profile) return
    await handlePowerUp(type)
  }

  // Render loading state
  if (!isDictionaryReady || !user || !profile || gameLoading || !gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
        <div className="text-lg font-medium">Loading Daily Challenge...</div>
        {!isDictionaryReady && <div className="text-sm text-muted-foreground">Initializing dictionary...</div>}
        {!user && <div className="text-sm text-muted-foreground">Checking authentication...</div>}
        {!profile && <div className="text-sm text-muted-foreground">Loading profile...</div>}
      </div>
    )
  }

  // Render the start word with highlighted last two letters
  const renderStartWord = () => {
    const word = gameState.startWord
    if (!word) return null

    return (
      <div className="text-2xl sm:text-3xl font-bold">
        <span>{word.slice(0, -2)}</span>
        <span className="text-blue-600 dark:text-blue-400">{word.slice(-2)}</span>
      </div>
    )
  }

  // Render the target word with highlighted first two letters
  const renderTargetWord = () => {
    const word = gameState.targetWord
    if (!word) return null

    return (
      <div className="text-2xl sm:text-3xl font-bold">
        <span className="text-green-600 dark:text-green-400">{word.slice(0, 2)}</span>
        <span>{word.slice(2)}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center py-4 mt-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 shadow-sm space-y-4 sm:space-y-0">
        <div className="text-center flex-1 px-2">
          <div className="text-base font-medium text-blue-600 dark:text-blue-400 mb-2">Start</div>
          {renderStartWord()}
        </div>
        <div className="hidden sm:block h-12 border-r border-gray-200 dark:border-gray-700 mx-2"></div>
        <div className="block sm:hidden w-full border-t border-gray-200 dark:border-gray-700"></div>
        <div className="text-center flex-1 px-2">
          <div className="text-base font-medium text-green-600 dark:text-green-400 mb-2">Target</div>
          {renderTargetWord()}
        </div>
      </div>

      <GameStatsMobile 
        score={gameState.score.total}
        moves={gameState.chain.length - 1}
        maxMoves={gameState.dailyPuzzle?.parMoves}
      />

      <WordChain words={gameState.chain} />

      {error && (
        <Alert variant="destructive">
          <LucideIcons.AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!gameState.isComplete && (
        <>
          <WordInput 
            onSubmit={handleWordSubmit}
            disabled={gameState.isComplete}
            lastWord={gameState.chain[gameState.chain.length - 1]}
          />

          <PowerUpBar 
            onUsePowerUp={handleUsePowerUp} 
            disabled={gameState.isComplete}
          />
        </>
      )}

      {showCompletionModal && gameState.dailyPuzzle && (
        <DailyChallengeComplete
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          words={gameState.chain}
          score={gameState.score.total}
          moves={gameState.chain.length - 1}
          maxMoves={gameState.dailyPuzzle.parMoves}
          timeTaken={Math.floor((Date.now() - gameState.startTime) / 1000)}
          tokensEarned={Math.floor(gameState.score.total / 10) + 3}
          achievements={gameState.achievements}
          stats={gameState.completionStats}
        />
      )}
    </div>
  )
}
