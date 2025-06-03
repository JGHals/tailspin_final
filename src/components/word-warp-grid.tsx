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
import { Wand2 } from "lucide-react"

interface WordWarpGridProps {
  onSelect: (letters: string) => void
  onClose: () => void
}

export function WordWarpGrid({ onSelect, onClose }: WordWarpGridProps) {
  const [selectedLetters, setSelectedLetters] = useState<string[]>([])
  const [grid, setGrid] = useState<string[][]>([])
  const [isOpen, setIsOpen] = useState(true)

  // Generate a 5x5 grid of random letters when the modal opens
  useEffect(() => {
    if (isOpen) {
      generateGrid()
      setSelectedLetters([])
    }
  }, [isOpen])

  const generateGrid = () => {
    const alphabet = "abcdefghijklmnopqrstuvwxyz"
    const newGrid: string[][] = []

    // Generate 5x5 grid of random letters
    for (let i = 0; i < 5; i++) {
      const row: string[] = []
      for (let j = 0; j < 5; j++) {
        const randomIndex = Math.floor(Math.random() * alphabet.length)
        row.push(alphabet[randomIndex])
      }
      newGrid.push(row)
    }

    // Make sure exactly two letters are selectable (randomly positioned)
    const selectablePositions: [number, number][] = []
    while (selectablePositions.length < 2) {
      const row = Math.floor(Math.random() * 5)
      const col = Math.floor(Math.random() * 5)

      // Check if this position is already selected
      if (!selectablePositions.some((pos) => pos[0] === row && pos[1] === col)) {
        selectablePositions.push([row, col])
      }
    }

    setGrid(newGrid)

    // Store the selectable positions in a data attribute
    setTimeout(() => {
      const cells = document.querySelectorAll(".warp-grid-cell")
      cells.forEach((cell, index) => {
        const row = Math.floor(index / 5)
        const col = index % 5

        if (selectablePositions.some((pos) => pos[0] === row && pos[1] === col)) {
          cell.setAttribute("data-selectable", "true")
        } else {
          cell.setAttribute("data-selectable", "false")
        }
      })
    }, 0)
  }

  const handleLetterClick = (letter: string, row: number, col: number) => {
    // Check if this cell is selectable
    const cell = document.querySelector(`.warp-grid-cell[data-row="${row}"][data-col="${col}"]`)
    if (cell?.getAttribute("data-selectable") !== "true") {
      return
    }

    // Add or remove letter from selection
    if (selectedLetters.includes(letter)) {
      setSelectedLetters(selectedLetters.filter((l) => l !== letter))
    } else if (selectedLetters.length < 2) {
      setSelectedLetters([...selectedLetters, letter])
    }
  }

  const handleConfirm = () => {
    if (selectedLetters.length === 2) {
      onSelect(selectedLetters.join(""))
      handleClose()
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Wand2 className="h-5 w-5 mr-2 text-blue-500" />
            Word Warp
          </DialogTitle>
          <DialogDescription>Select two letters to form your next starting combo.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
            {grid.map((row, rowIndex) =>
              row.map((letter, colIndex) => (
                <Button
                  key={`${rowIndex}-${colIndex}`}
                  variant={
                    selectedLetters.includes(letter) &&
                    document
                      .querySelector(`.warp-grid-cell[data-row="${rowIndex}"][data-col="${colIndex}"]`)
                      ?.getAttribute("data-selectable") === "true"
                      ? "default"
                      : "outline"
                  }
                  size="lg"
                  className={`warp-grid-cell h-12 w-12 p-0 text-lg font-bold`}
                  data-row={rowIndex}
                  data-col={colIndex}
                  onClick={() => handleLetterClick(letter, rowIndex, colIndex)}
                >
                  {letter}
                </Button>
              )),
            )}
          </div>

          <div className="mt-4 text-center">
            <div className="text-sm mb-2">
              Selected: <span className="font-bold">{selectedLetters.join("")}</span>
            </div>
            <Button onClick={handleConfirm} disabled={selectedLetters.length !== 2} className="px-8">
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
