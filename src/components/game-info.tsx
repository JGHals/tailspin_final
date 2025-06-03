"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Info, HelpCircle, Zap, Coins } from "lucide-react"

export function GameInfo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <Info className="h-5 w-5" />
        <span className="sr-only">Game Info</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              TailSpin Game Info
            </DialogTitle>
            <DialogDescription>Learn how to play TailSpin and master the word chain game</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="rules">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="powerups">Power-Ups</TabsTrigger>
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-4 pt-4">
              <div>
                <h3 className="font-medium mb-2">How to Play</h3>
                <p className="text-sm text-muted-foreground">
                  TailSpin is a word chain game where each new word must start with the last two letters of the previous
                  word.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Game Modes</h3>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Daily Challenge:</span> Complete a specific word chain within a
                    limited number of moves.
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Endless Mode:</span> Create the longest word chain possible with no
                    move limit.
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Versus Mode:</span> Compete against another player to create the
                    highest scoring chain.
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Scoring</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Each word earns points equal to its length</li>
                  <li>Terminal words (in Endless mode) earn bonus points</li>
                  <li>Completing the Daily Challenge earns additional points</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">Terminal Words</h3>
                <p className="text-sm text-muted-foreground">
                  Terminal words end with a 2-letter combination that no valid English word starts with (like "zz" or
                  "qx"). Finding these in Endless mode earns bonus points and tokens!
                </p>
              </div>
            </TabsContent>

            <TabsContent value="powerups" className="space-y-4 pt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-2 border-b">
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-md">
                    <Zap className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Power-Ups</h3>
                    <p className="text-sm text-muted-foreground">
                      Power-ups help you overcome challenging situations in the game. Each power-up costs tokens to use.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <HelpCircle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <div className="font-medium">Hint (2 tokens)</div>
                      <p className="text-xs text-muted-foreground">Get word suggestions that follow the chain rule</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <div className="font-medium">Undo (3 tokens)</div>
                      <p className="text-xs text-muted-foreground">Remove the last word from the chain</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium">Word Warp (6 tokens)</div>
                      <p className="text-xs text-muted-foreground">Select any valid 2-letter combo to continue</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <div className="font-medium">Flip (4 tokens)</div>
                      <p className="text-xs text-muted-foreground">Invert the current 2-letter combo if valid</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <div className="font-medium">Bridge (5 tokens)</div>
                      <p className="text-xs text-muted-foreground">Place a wildcard word to continue the chain</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tokens" className="space-y-4 pt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-2 border-b">
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-md">
                    <Coins className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Token System</h3>
                    <p className="text-sm text-muted-foreground">
                      Tokens are earned by playing the game and can be used to purchase power-ups.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">How to Earn Tokens</h3>
                  <div className="space-y-2">
                    <div className="text-sm flex justify-between">
                      <span>Daily Challenge Attempt</span>
                      <span className="font-medium">3 tokens</span>
                    </div>
                    <div className="text-sm flex justify-between">
                      <span>Daily Challenge Completion</span>
                      <span className="font-medium">+5 tokens</span>
                    </div>
                    <div className="text-sm flex justify-between">
                      <span>Fast Solve Bonus (under 30s)</span>
                      <span className="font-medium">+2 tokens</span>
                    </div>
                    <div className="text-sm flex justify-between">
                      <span>Rare Letter Bonus</span>
                      <span className="font-medium">+1 per rare letter</span>
                    </div>
                    <div className="text-sm flex justify-between">
                      <span>Finding Terminal Word</span>
                      <span className="font-medium">5 tokens</span>
                    </div>
                    <div className="text-sm flex justify-between">
                      <span>Endless Mode Completion</span>
                      <span className="font-medium">2-8 tokens</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Token Limits</h3>
                  <p className="text-sm text-muted-foreground">
                    You can hold a maximum of 50 tokens at any time. Use them wisely to maximize your gameplay
                    advantage!
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
