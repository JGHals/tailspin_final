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
import { validateWord, checkWordConnection, isTerminalWord, calculateTerminalBonus } from "@/lib/game-utils"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function EndlessMode() {
  const { user, addTokens } = useAuth()
  const [words, setWords] = useState<string[]>([])
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [gameStatus, setGameStatus] = useState<"setup" | "playing" | "ended" | "terminal">("setup")
  const [error, setError] = useState<string | null>(null)
  const [startingWords] = useState<string[]>([
    "apple",
    "banana",
    "orange",
    "grape",
    "lemon",
    "mango",
    "cherry",
    "peach",
    "plum",
    "kiwi",
  ])

  // Terminal word tracking
  const [showTerminalCelebration, setShowTerminalCelebration] = useState(false)
  const [currentTerminalWord, setCurrentTerminalWord] = useState<string>("")
  const [terminalBonus, setTerminalBonus] = useState(0)
  const [isNewTerminalDiscovery, setIsNewTerminalDiscovery] = useState(false)

  // Modals
  const [showWordWarpGrid, setShowWordWarpGrid] = useState(false)
  const [showHintModal, setShowHintModal] = useState(false)

  const startGame = (startWord?: string) => {
    // If no word is provided, pick a random one from the list
    const word = startWord || startingWords[Math.floor(Math.random() * startingWords.length)]
    setWords([word])
    setScore(word.length)
    setMoves(0)
    setGameStatus("playing")
    setError(null)
  }

  // Start with a random word when component mounts
  useEffect(() => {
    if (gameStatus === "setup") {
      startGame()
    }
  }, [gameStatus])

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

    // Add the word to the chain
    const newWords = [...words, word]
    setWords(newWords)
    setScore(score + word.length)
    setMoves(moves + 1)

    // Check if this is a terminal word
    if (isTerminalWord(word)) {
      const terminalCombo = word.slice(-2)
      const bonus = calculateTerminalBonus(word)

      // In a real app, check if this is a new discovery for the user
      const isNewDiscovery = true // Mock for demo

      // Update state for terminal celebration
      setCurrentTerminalWord(word)
      setTerminalBonus(bonus)
      setIsNewTerminalDiscovery(isNewDiscovery)

      // Update score with bonus
      setScore(score + word.length + bonus)

      // Show celebration
      setShowTerminalCelebration(true)

      // Set game status to terminal
      setGameStatus("terminal")

      // Award tokens for finding a terminal word
      if (user) {
        addTokens(5) // Award 5 tokens for finding a terminal word
      }
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
        // In a real app, this would flip the last two letters if valid
        setError("Flip power-up used! Letters flipped if valid.")
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

  const handleContinueAfterTerminal = () => {
    // Allow the player to continue after finding a terminal word
    setGameStatus("playing")
  }

  const endGame = () => {
    setGameStatus("ended")

    // Award tokens based on performance
    if (user) {
      // Base tokens for playing
      let tokens = 2

      // Bonus tokens based on chain length
      if (words.length > 5) tokens += 1
      if (words.length > 10) tokens += 2
      if (words.length > 15) tokens += 3

      addTokens(tokens)
    }
  }

  const resetGame = () => {
    startGame()
  }

  // Render the start word with highlighted last two letters
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

  return (
    <div className="space-y-4 py-2">
      {words.length > 0 && (
        <div className="py-4 mt-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 shadow-sm text-center">
          <div className="text-base font-medium text-blue-600 dark:text-blue-400 mb-2">Start</div>
          {renderStartWord()}
        </div>
      )}

      <GameStatsMobile score={score} moves={moves} />

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

          <Button variant="outline" className="w-full" onClick={endGame}>
            End Game
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {gameStatus === "ended" && (
            <Alert className="py-3">
              <AlertDescription>
                Game over! You created a chain of {words.length} words with a score of {score}.
              </AlertDescription>
            </Alert>
          )}

          {gameStatus === "terminal" && (
            <div className="space-y-3">
              <Alert className="py-3 border-blue-500">
                <AlertDescription>
                  You found a terminal word! Your score is {score} (including {terminalBonus} bonus points).
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleContinueAfterTerminal}>
                  Continue Chain
                </Button>
                <Button onClick={endGame}>End Game</Button>
              </div>
            </div>
          )}

          {(gameStatus === "ended" || gameStatus === "setup") && (
            <Button onClick={resetGame} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              {gameStatus === "ended" ? "Play Again" : "Start Game"}
            </Button>
          )}
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
    </div>
  )
}
