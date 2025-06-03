"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"
import { getHintWords } from "@/lib/game-utils"

interface HintModalProps {
  isOpen: boolean
  onClose: () => void
  prefix: string
  onSelectWord: (word: string) => void
}

export function HintModal({ isOpen, onClose, prefix, onSelectWord }: HintModalProps) {
  // Get hint words that start with the prefix
  const hintWords = getHintWords(prefix)

  const handleSelectWord = (word: string) => {
    onSelectWord(word)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            Word Hints
          </DialogTitle>
          <DialogDescription>Here are some words that start with "{prefix}":</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {hintWords.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {hintWords.map((word) => (
                <Button
                  key={word}
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleSelectWord(word)}
                >
                  <span className="font-bold text-blue-600 dark:text-blue-400">{prefix}</span>
                  <span>{word.slice(prefix.length)}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No hint words available for this prefix.</div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
