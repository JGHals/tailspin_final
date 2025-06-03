"use client"

import { memo, useMemo } from "react"
import type { FC } from "react"
import { useGame } from "@/lib/contexts/GameContext"

interface WordChainProps {
  words: string[]
  maxDisplay?: number
}

// Memoized word item component
const WordItem = memo(({ 
  word, 
  isFirst, 
  isLast, 
  isTerminal, 
  rareLetters 
}: { 
  word: string
  isFirst: boolean
  isLast: boolean
  isTerminal: boolean
  rareLetters: string[]
}) => {
  if (word === "...") {
    return <div className="border-2 p-2 text-center font-medium rounded">
      <span className="text-muted-foreground">{word}</span>
    </div>
  }

  return (
    <div
      className={`
        border-2 p-2 text-center font-medium rounded
        transition-all duration-200
        ${
          isFirst
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            : isLast
              ? isTerminal 
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                : "border-green-500 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40"
              : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40"
        }
      `}
    >
      <div className="flex flex-col">
        <span>{word.toLowerCase()}</span>
        {rareLetters.length > 0 && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Rare letters: {rareLetters.join(", ")}
          </span>
        )}
      </div>
    </div>
  )
})

WordItem.displayName = "WordItem"

export const WordChain: FC<WordChainProps> = memo(({ words, maxDisplay = 5 }) => {
  const { gameState } = useGame()
  
  // Memoize display words calculation
  const displayWords = useMemo(() => 
    words.length <= maxDisplay ? words : [...words.slice(0, 2), "...", ...words.slice(-2)],
    [words, maxDisplay]
  )

  // Memoize letter tracking info
  const rareLettersUsed = useMemo(() => 
    new Set(Array.from(gameState?.ui?.letterTracking?.rareLettersUsed || [])) as Set<string>,
    [gameState?.ui?.letterTracking?.rareLettersUsed]
  )

  return (
    <div className="grid grid-cols-1 gap-2">
      {displayWords.map((word, index) => {
        // Calculate word-specific properties
        const isFirst = index === 0
        const isLast = index === words.length - 1 && words.length > 1
        const isTerminal = gameState?.terminalWords?.has(word) || false
        const rareLetters = word === "..." ? [] : 
          Array.from(rareLettersUsed)
            .filter(letter => word.toUpperCase().includes(letter))

        return (
          <WordItem
            key={`${word}-${index}`}
            word={word}
            isFirst={isFirst}
            isLast={isLast}
            isTerminal={isTerminal}
            rareLetters={rareLetters}
          />
        )
      })}
    </div>
  )
})

WordChain.displayName = "WordChain"
