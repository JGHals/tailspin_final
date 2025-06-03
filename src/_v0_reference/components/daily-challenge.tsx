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
import { validateWord, isTerminalWord, checkWordConnection, canFlipCombo, getFlippedCombo } from "@/lib/game-utils"
import { AlertCircle, Trophy } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function DailyChallenge() {
  const { user, addTokens } = useAuth()
  const [words, setWords] = useState<string[]>(["starting"])
  const [targetWord, setTargetWord] = useState<string>("ending")
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [maxMoves, setMaxMoves] = useState(8)
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost" | "terminal">("playing")
  const [error, setError] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [tokensEarned, setTokensEarned] = useState(0)

  // Terminal word tracking
  const [discoveredTerminals, setDiscoveredTerminals] = useState<string[]>([])
  const [showTerminalCelebration, setShowTerminalCelebration] = useState(false)
  const [currentTerminalWord, setCurrentTerminalWord] = useState<string>("")
  const [terminalBonus, setTerminalBonus] = useState(0)
  const [isNewTerminalDiscovery, setIsNewTerminalDiscovery] = useState(false)

  // Modals
  const [showWordWarpGrid, setShowWordWarpGrid] = useState(false)
  const [showHintModal, setShowHintModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  // In a real app, this would fetch the daily challenge from an API
  useEffect(() => {
    // Simulating API fetch for daily challenge
    const dailyChallenge = {
      startWord: "planet",
      targetWord: "technology",
      maxMoves: 8,
    }

    setWords([dailyChallenge.startWord])
    setTargetWord(dailyChallenge.targetWord)
    setMaxMoves(dailyChallenge.maxMoves)
    setStartTime(Date.now())
  }, [])

  const handleWordSubmit = async (word: string) => {
    setError(null)
    const lastWord = words[words.length - 1]

    // Check if the word starts with the last two letters of the previous word
    if (!checkWordConnection(lastWord, word)) {
      setError(`Word must start with "${lastWord.slice(-2)}"`)
      return
    }

    // Check if the word is valid (would connect to a dictionary API in production)
    const isValid = await validateWord(word)
    if (!isValid) {
      setError("Not a valid word")
      return
    }

    // Check if the word is already in the chain
    if (words.includes(word)) {
      setError("Word already used in this chain")
      return
    }

    // Check if this is a terminal word - in daily challenge, terminal words are invalid
    if (isTerminalWord(word)) {
      setError("Terminal words are not allowed in Daily Challenge mode")
      return
    }

    // Add the word to the chain
    const newWords = [...words, word]
    setWords(newWords)
    setScore(score + word.length)
    setMoves(moves + 1)

    // Check if player has reached the target word
    if (word === targetWord) {
      setEndTime(Date.now())
      setGameStatus("won")

      // Calculate tokens earned
      let tokens = 3 // Base tokens for attempting
      tokens += 5 // Bonus for solving

      // Fast solve bonus (under 30 seconds)
      if (startTime && Date.now() - startTime < 30000) {
        tokens += 2
      }

      // Rare letter bonus (j, q, x, z)
      const rareLetters = ["j", "q", "x", "z"]
      const uniqueRareLetters = new Set()
      newWords.forEach((w) => {
        rareLetters.forEach((letter) => {
          if (w.includes(letter)) {
            uniqueRareLetters.add(letter)
          }
        })
      })
      tokens += uniqueRareLetters.size

      setTokensEarned(tokens)

      // Add tokens to user account
      if (user) {
        addTokens(tokens)
      }

      setShowCompletionModal(true)
      return
    }

    // Check if player has used all moves
    if (moves + 1 >= maxMoves) {
      setGameStatus("lost")

      // Add base tokens for attempting
      if (user) {
        addTokens(3)
      }
      return
    }
  }

  const handleUsePowerUp = (type: PowerUpType) => {
    switch (type) {
      case "hint":
        setShowHintModal(true)
        break
      case "undo":
        // Remove the last word if there's more than one
        if (words.length > 1) {
          setWords(words.slice(0, -1))
          setMoves(Math.max(0, moves - 1))
          setError("Last word removed from the chain.")
        } else {
          setError("Nothing to undo.")
        }
        break
      case "warp":
        setShowWordWarpGrid(true)
        break
      case "flip":
        const lastWord = words[words.length - 1]
        const lastTwoLetters = lastWord.slice(-2).toLowerCase()

        if (canFlipCombo(lastTwoLetters)) {
          const flippedCombo = getFlippedCombo(lastTwoLetters)
          setError(`Flipped '${lastTwoLetters}' to '${flippedCombo}'`)
        } else {
          setError(`Cannot flip '${lastTwoLetters}'`)
        }
        break
      case "bridge":
        // In a real app, this would add a wildcard word to bridge the chain
        setError("Bridge power-up used! Added a wildcard connector.")
        break
    }
  }

  const handleWordWarpSelection = (letters: string) => {
    setError(`Word Warp used! New starting combo: '${letters}'`)
  }

  const handleHintSelection = (word: string) => {
    handleWordSubmit(word)
  }

  const resetGame = () => {
    // In a real app, this would fetch a new challenge or reset the current one
    setWords([words[0]])
    setScore(0)
    setMoves(0)
    setGameStatus("playing")
    setError(null)
    setStartTime(Date.now())
    setEndTime(null)
    setShowCompletionModal(false)
  }

  // Highlight the last two letters of the start word
  const renderStartWord = () => {
    const word = words[0]
    if (!word) return null

    return (
      <div className="text-2xl sm:text-3xl font-bold">
        <span>{word.slice(0, -2)}</span>
        <span className="text-blue-600 dark:text-blue-400">{word.slice(-2)}</span>
      </div>
    )
  }

  // Highlight the first two letters of the target word
  const renderTargetWord = () => {
    if (!targetWord) return null

    return (
      <div className="text-2xl sm:text-3xl font-bold">
        <span className="text-green-600 dark:text-green-400">{targetWord.slice(0, 2)}</span>
        <span>{targetWord.slice(2)}</span>
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

      <GameStatsMobile score={score} moves={moves} maxMoves={maxMoves} />

      <div className="py-2 mt-6">
        <WordChain words={words} />
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {gameStatus === "playing" ? (
        <div className="space-y-4">
          <WordInput onSubmit={handleWordSubmit} lastWord={words[words.length - 1]} placeholder="Enter next word" />

          <PowerUpBar onUsePowerUp={handleUsePowerUp} disabled={gameStatus !== "playing"} />
        </div>
      ) : (
        <div className="space-y-4">
          {gameStatus === "won" && !showCompletionModal && (
            <Alert className="py-3">
              <AlertDescription>
                Congratulations! You completed the challenge in {moves} moves with a score of {score}.
              </AlertDescription>
            </Alert>
          )}

          {gameStatus === "lost" && (
            <Alert variant="destructive" className="py-3">
              <AlertDescription>Game over! You didn't reach the target word in {maxMoves} moves.</AlertDescription>
            </Alert>
          )}

          {gameStatus === "terminal" && (
            <Alert className="py-3 border-blue-500">
              <Trophy className="h-4 w-4 text-blue-500" />
              <AlertDescription>
                You found a terminal word! Your final score is {score} (including {terminalBonus} bonus points).
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={resetGame} className="w-full transition-colors hover:bg-blue-600 active:bg-blue-700">
            Play Again
          </Button>
        </div>
      )}

      {/* Terminal Word Celebration Modal */}
      <TerminalWordCelebration
        isOpen={showTerminalCelebration}
        onClose={() => setShowTerminalCelebration(false)}
        word={currentTerminalWord}
        terminalCombo={currentTerminalWord.slice(-2)}
        bonusPoints={terminalBonus}
        isNewDiscovery={isNewTerminalDiscovery}
      />

      {/* Word Warp Grid */}
      <WordWarpGrid
        isOpen={showWordWarpGrid}
        onClose={() => setShowWordWarpGrid(false)}
        onSelectLetters={handleWordWarpSelection}
      />

      {/* Hint Modal */}
      <HintModal
        isOpen={showHintModal}
        onClose={() => setShowHintModal(false)}
        prefix={words.length > 0 ? words[words.length - 1].slice(-2) : ""}
        onSelectWord={handleHintSelection}
      />

      {/* Daily Challenge Complete Modal */}
      <DailyChallengeComplete
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        words={words}
        score={score}
        moves={moves}
        maxMoves={maxMoves}
        timeTaken={startTime && endTime ? Math.floor((endTime - startTime) / 1000) : null}
        tokensEarned={tokensEarned}
      />
    </div>
  )
}
