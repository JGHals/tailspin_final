"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DynamicIcon } from "lucide-react/dynamic"
import { VALID_STARTING_COMBOS } from "@/lib/validation/constants"

interface WordWarpModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectCombo: (combo: string) => void
}

export function WordWarpModal({ isOpen, onClose, onSelectCombo }: WordWarpModalProps) {
  const [selectedCombo, setSelectedCombo] = useState<string | null>(null)

  // Group combos by first letter for better organization
  const groupedCombos: Record<string, string[]> = {}

  // Use the imported valid starting combos
  const validCombos = VALID_STARTING_COMBOS

  validCombos.forEach((combo) => {
    const firstLetter = combo[0]
    if (!groupedCombos[firstLetter]) {
      groupedCombos[firstLetter] = []
    }
    groupedCombos[firstLetter].push(combo)
  })

  const handleSelect = (combo: string) => {
    setSelectedCombo(combo)
  }

  const handleConfirm = () => {
    if (selectedCombo) {
      onSelectCombo(selectedCombo)
      setSelectedCombo(null)
      onClose()
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        setSelectedCombo(null)
        onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <DynamicIcon name="sparkles" className="h-5 w-5 mr-2 text-blue-500" />
            Word Warp
          </DialogTitle>
          <DialogDescription>Select any valid 2-letter combo to continue your word chain.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto">
          {Object.keys(groupedCombos)
            .sort()
            .map((letter) => (
              <div key={letter} className="mb-4">
                <div className="text-sm font-medium mb-1 text-muted-foreground">{letter.toUpperCase()}</div>
                <div className="flex flex-wrap gap-1">
                  {groupedCombos[letter].map((combo) => (
                    <Button
                      key={combo}
                      variant={selectedCombo === combo ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleSelect(combo)}
                    >
                      {combo}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCombo(null)
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button disabled={!selectedCombo} onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
