"use client"

import type { FC } from "react"

interface WordChainProps {
  words: string[]
  maxDisplay?: number
}

export const WordChain: FC<WordChainProps> = ({ words, maxDisplay = 5 }) => {
  // If we have more words than maxDisplay, show the first and last few
  const displayWords = words.length <= maxDisplay ? words : [...words.slice(0, 2), "...", ...words.slice(-2)]

  return (
    <div className="grid grid-cols-1 gap-2">
      {displayWords.map((word, index) => (
        <div
          key={index}
          className={`
            border-2 p-2 text-center font-medium rounded
            transition-all duration-200
            ${
              index === 0
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                : index === words.length - 1 && words.length > 1
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40"
                  : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40"
            }
          `}
        >
          {word === "..." ? <span className="text-muted-foreground">{word}</span> : <span>{word.toLowerCase()}</span>}
        </div>
      ))}
    </div>
  )
}
