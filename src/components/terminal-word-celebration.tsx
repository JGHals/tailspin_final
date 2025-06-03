"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, Star, BookOpen } from "lucide-react"
import confetti from "canvas-confetti"

interface TerminalWordCelebrationProps {
  isOpen: boolean
  onClose: () => void
  word: string
  terminalCombo: string
  bonusPoints: number
  isNewDiscovery: boolean
}

export function TerminalWordCelebration({
  isOpen,
  onClose,
  word,
  terminalCombo,
  bonusPoints,
  isNewDiscovery,
}: TerminalWordCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen && !showConfetti) {
      setShowConfetti(true)

      // Trigger confetti
      const duration = 2000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#3b82f6", "#10b981"],
        })

        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#3b82f6", "#10b981"],
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }

      frame()
    }

    if (!isOpen) {
      setShowConfetti(false)
    }
  }, [isOpen, showConfetti])

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center text-xl">
            <Trophy className="h-6 w-6 text-yellow-500 mr-2" />
            Terminal Word Discovered!
          </DialogTitle>
          <DialogDescription className="text-center">
            You've reached a terminal combination that no word starts with.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="text-3xl font-bold">{word}</div>
          <div className="flex items-center space-x-2">
            <div className="text-sm">Terminal combo:</div>
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-md font-bold">{terminalCombo}</div>
          </div>

          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <Star className="h-5 w-5" />
            <div className="font-medium">+{bonusPoints} bonus points!</div>
          </div>

          {isNewDiscovery && (
            <div className="mt-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-md text-center">
              <div className="font-medium text-yellow-800 dark:text-yellow-300">New Discovery!</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                This terminal combo has been added to your End Words Library
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="sm:flex-1" onClick={onClose}>
            <BookOpen className="h-4 w-4 mr-2" />
            View Library
          </Button>
          <Button className="sm:flex-1" onClick={onClose}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
