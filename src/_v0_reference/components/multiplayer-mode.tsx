"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { WordChain } from "@/components/word-chain"
import { WordInput } from "@/components/word-input"
import { GameStatsMobile } from "@/components/game-stats-mobile"
import { PowerUpBar, type PowerUpType } from "@/components/power-up-bar"
import { validateWord, checkWordConnection } from "@/lib/game-utils"
import { AlertCircle, Users } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { WordWarpGrid } from "@/components/word-warp-grid"
import { HintModal } from "@/components/hint-modal"

export function MultiplayerMode() {
  const { user } = useAuth()
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "ended">("waiting")
  const [words, setWords] = useState<string[]>([])
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes
  const [error, setError] = useState<string | null>(null)
  const [opponent, setOpponent] = useState({
    name: "Opponent",
    score: 0,
    moves: 0,
  })

  // Modals
  const [showWordWarpGrid, setShowWordWarpGrid] = useState(false)
  const [showHintModal, setShowHintModal] = useState(false)

  // In a real app, this would connect to a multiplayer server
  const findMatch = () => {
    // Simulate finding a match
    setGameStatus("waiting")
    setTimeout(() => {
      setWords(["challenge"])
      setScore("challenge".length)
      setMoves(0)
      setTimeLeft(120)
      setGameStatus("playing")
      setError(null)

      // Simulate opponent data
      setOpponent({
        name: "WordMaster",
        score: "challenge".length,
        moves: 0,
      })
    }, 2000)
  }

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameStatus === "playing" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setGameStatus("ended")
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [gameStatus, timeLeft])

  // Simulate opponent moves
  useEffect(() => {
    let opponentTimer: NodeJS.Timeout

    if (gameStatus === "playing") {
      opponentTimer = setInterval(() => {
        // Simulate opponent making a move every 5-15 seconds
        const randomTime = Math.floor(Math.random() * 10000) + 5000
        setTimeout(() => {
          if (gameStatus === "playing") {
            setOpponent((prev) => ({
              ...prev,
              score: prev.score + Math.floor(Math.random() * 5) + 3,
              moves: prev.moves + 1,
            }))
          }
        }, randomTime)
      }, 10000)
    }

    return () => {
      if (opponentTimer) clearInterval(opponentTimer)
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
      {gameStatus === "waiting" ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Users className="h-8 w-8 text-muted-foreground animate-pulse" />
          <div className="text-center">
            <h3 className="font-medium">Finding an opponent...</h3>
            <p className="text-sm text-muted-foreground">This won't take long</p>
          </div>
          <Progress value={45} className="w-48" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center border-b pb-2">
            <div>
              <div className="text-sm font-medium">You: {score}</div>
            </div>
            <div className="text-sm font-medium">VS</div>
            <div>
              <div className="text-sm font-medium">
                {opponent.name}: {opponent.score}
              </div>
            </div>
          </div>

          <GameStatsMobile score={score} moves={moves} timeLeft={timeLeft} />

          {words.length > 0 && (
            <div className="py-4 mt-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 shadow-sm text-center">
              <div className="text-base font-medium text-blue-600 dark:text-blue-400 mb-2">Start</div>
              {renderStartWord()}
            </div>
          )}

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
              <Alert className="py-3">
                <AlertDescription>
                  Game over!{" "}
                  {score > opponent.score
                    ? "You won!"
                    : score === opponent.score
                      ? "It's a tie!"
                      : "Your opponent won."}
                </AlertDescription>
              </Alert>

              <Button onClick={findMatch} className="w-full">
                Play Again
              </Button>
            </div>
          )}
        </>
      )}

      {gameStatus === "waiting" && (
        <Button variant="outline" onClick={() => setGameStatus("ended")} className="w-full">
          Cancel
        </Button>
      )}

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
