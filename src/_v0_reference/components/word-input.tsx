"use client"

import { type FC, useState, type FormEvent } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

interface WordInputProps {
  onSubmit: (word: string) => void
  disabled?: boolean
  lastWord?: string
  placeholder?: string
}

export const WordInput: FC<WordInputProps> = ({
  onSubmit,
  disabled = false,
  lastWord = "",
  placeholder = "Enter a word",
}) => {
  const [input, setInput] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSubmit(input.trim().toLowerCase())
      setInput("")
    }
  }

  // Get the last two letters to highlight
  const lastTwoLetters = lastWord ? lastWord.slice(-2) : ""

  return (
    <div className="space-y-2">
      {lastWord && (
        <div className="text-sm text-center">
          Your word must start with <span className="font-bold text-blue-600 dark:text-blue-400">{lastTwoLetters}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex w-full space-x-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 h-12 text-base px-4 transition-all duration-200 ${
            isFocused || input ? "border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30" : ""
          }`}
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={disabled || !input.trim()} className="h-12 w-12">
          <Send className="h-5 w-5" />
          <span className="sr-only">Submit</span>
        </Button>
      </form>
    </div>
  )
}
