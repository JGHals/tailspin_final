"use client"

import { memo, useCallback, useEffect, useState, type FC, type FormEvent } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Send } from "lucide-react"
import { useGame } from "@/lib/contexts/GameContext"

interface WordInputProps {
  onSubmit: (word: string) => Promise<void>
  disabled?: boolean
  lastWord?: string
  placeholder?: string
}

export const WordInput: FC<WordInputProps> = memo(({
  onSubmit,
  disabled = false,
  lastWord = "",
  placeholder = "Enter a word",
}) => {
  const { gameState, isLoading, error } = useGame()
  const [input, setInput] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Clear local error when global error changes or when validation feedback updates
  useEffect(() => {
    if (error) {
      setLocalError(error)
    } else if (gameState?.ui?.validationFeedback?.type === 'error') {
      setLocalError(gameState.ui.validationFeedback.message)
    } else {
      setLocalError(null)
    }
  }, [error, gameState?.ui?.validationFeedback])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled || isValidating) return

    const word = input.trim().toLowerCase()
    
    // Basic validation
    if (lastWord && !word.startsWith(lastWord.slice(-2))) {
      setLocalError(`Word must start with "${lastWord.slice(-2)}"`)
      return
    }

    setIsValidating(true)
    setLocalError(null)
    
    try {
      await onSubmit(word)
      setInput("")
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to submit word")
    } finally {
      setIsValidating(false)
    }
  }, [input, disabled, isValidating, lastWord, onSubmit])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    setLocalError(null)
  }, [])

  const handleFocus = useCallback(() => setIsFocused(true), [])
  const handleBlur = useCallback(() => setIsFocused(false), [])

  // Get the last two letters to highlight
  const lastTwoLetters = lastWord ? lastWord.slice(-2) : ""

  // Get chain quality feedback if available
  const chainQuality = gameState?.ui?.chainQuality
  const showChainQuality = chainQuality && input.length >= 2

  return (
    <div className="space-y-2">
      {lastWord && (
        <div className="text-sm text-center">
          Your word must start with <span className="font-bold text-blue-600 dark:text-blue-400">{lastTwoLetters}</span>
          {showChainQuality && (
            <span className="ml-2 text-xs text-gray-500">
              ({chainQuality.difficulty} difficulty, {chainQuality.riskLevel} risk)
            </span>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex w-full space-x-2">
        <Input
          value={input}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled || isLoading || isValidating}
          className={`flex-1 h-12 text-base px-4 transition-all duration-200 ${
            isFocused || input ? "border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30" : ""
          } ${localError ? "border-red-500 dark:border-red-500" : ""}`}
          autoComplete="off"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={disabled || !input.trim() || isLoading || isValidating} 
          className="h-12 w-12"
        >
          {isValidating || isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          <span className="sr-only">Submit</span>
        </Button>
      </form>

      {localError && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      )}

      {gameState?.ui?.validationFeedback?.suggestedWords && !localError && (
        <div className="text-xs text-gray-500 mt-1">
          Suggested words: {gameState.ui.validationFeedback.suggestedWords.slice(0, 3).join(", ")}
        </div>
      )}
    </div>
  )
})

WordInput.displayName = "WordInput"
