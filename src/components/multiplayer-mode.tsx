"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { WordChain } from "@/components/word-chain"
import { WordInput } from "@/components/word-input"
import { GameStatsMobile } from "@/components/game-stats-mobile"
import { PowerUpBar, type PowerUpType } from "@/components/power-up-bar"
import { AlertCircle, User, RefreshCw } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { gameModeManager } from "@/lib/game/game-mode-manager"
import { versusModeManager } from "@/lib/game/modes/versus"
import { chainValidator } from "@/lib/game/chain-validator"
import { WordWarpGrid } from "@/components/word-warp-grid"
import { HintModal } from "@/components/hint-modal"
import type { VersusGame, GameUpdate } from "@/lib/game/modes/versus"
import { RARE_LETTERS } from "@/lib/game/scoring"
import { validateWord, checkWordConnection } from "@/lib/validation/word-validation"

// Add LetterTracker component
function LetterTracker({ usedLetters, rareLettersUsed }: { usedLetters: Set<string>, rareLettersUsed: Set<string> }) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  return (
    <div className="grid grid-cols-13 gap-1 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
      {alphabet.map(letter => (
        <div
          key={letter}
          className={`
            w-6 h-6 flex items-center justify-center rounded text-sm font-medium
            ${usedLetters.has(letter) 
              ? rareLettersUsed.has(letter)
                ? 'bg-yellow-500 text-white'
                : 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
            }
          `}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

export function MultiplayerMode() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [gameId, setGameId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<VersusGame | null>(null)
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "ended">("waiting")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [error, setError] = useState<string | null>(null)
  const [showWordWarpGrid, setShowWordWarpGrid] = useState(false)
  const [showHintModal, setShowHintModal] = useState(false)
  const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set())
  const [rareLettersUsed, setRareLettersUsed] = useState<Set<string>>(new Set())

  // Handle game updates
  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = versusModeManager.subscribeToGame(gameId, (update: GameUpdate) => {
      const { type, game } = update;
      setGameState(game);

      switch (type) {
        case 'game_started':
          setGameStatus("playing");
          if (game.startTime) {
            const elapsed = (Date.now() - game.startTime.toMillis()) / 1000;
            setTimeLeft(Math.max(0, game.timeLimit - elapsed));
          }
          break;
        case 'game_ended':
          setGameStatus("ended");
          break;
      }
    });

    return () => {
      versusModeManager.unsubscribeFromGame(gameId);
      unsubscribe();
    };
  }, [gameId]);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (gameStatus === "playing" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameStatus, timeLeft]);

  // Update letter tracking when game state changes
  useEffect(() => {
    if (gameState?.players && user?.id && gameState.players[user.id]) {
      const currentPlayer = gameState.players[user.id];
      if (currentPlayer && currentPlayer.chain && currentPlayer.chain.length > 0) {
        const letters = new Set<string>();
        const rare = new Set<string>();
        
        currentPlayer.chain.forEach(word => {
          word.toUpperCase().split('').forEach(letter => {
            letters.add(letter);
            if (RARE_LETTERS.has(letter)) {
              rare.add(letter);
            }
          });
        });
        
        setUsedLetters(letters);
        setRareLettersUsed(rare);
      }
    }
  }, [gameState?.players, user?.id]);

  const findMatch = async () => {
    if (!user || !profile) return;

    setGameStatus("waiting");
    setError(null);

    try {
      // First check for available games
      const activeGames = await versusModeManager.getActiveGames();
      
      if (activeGames.length > 0) {
        // Join existing game
        const success = await versusModeManager.joinGame(
          activeGames[0].id,
          user.id,
          profile.displayName || 'Anonymous Player'
        );
        
        if (success) {
          setGameId(activeGames[0].id);
          return;
        }
      }
      
      // Create new game if no joinable games found
      const newGameId = await versusModeManager.createGame(
        user.id,
        profile.displayName || 'Anonymous Player',
        "challenge" // You might want to randomize this
      );
      
      setGameId(newGameId);
    } catch (err) {
      setError("Failed to find or create game");
      setGameStatus("ended");
    }
  };

  const handleWordSubmit = async (word: string) => {
    if (!gameId || !user) return;

    try {
      const result = await versusModeManager.submitMove(gameId, user.id, word);
      if (!result.success) {
        setError(result.error || "Invalid move");
      }
    } catch (error) {
      setError("Failed to submit move");
    }
  };

  const handleUsePowerUp = async (type: PowerUpType) => {
    if (!user || !profile) return;

    let result;
    switch (type) {
      case "hint":
        result = await gameModeManager.useHint()
        if (result.length > 0) {
          setShowHintModal(true)
        } else {
          setError("Could not get hints at this time")
        }
        break

      case "undo":
        result = await gameModeManager.useUndo()
        if (result.success) {
          // GameContext will update state automatically
        } else {
          setError(result.error || "Could not undo")
        }
        break

      case "wordWarp":
        result = await gameModeManager.useWordWarp()
        if (result.success) {
          setShowWordWarpGrid(true)
        } else {
          setError(result.error || "Could not use Word Warp")
        }
        break

      case "flip":
        result = await gameModeManager.useFlip()
        if (result.success && result.data) {
          const { originalPrefix, flippedPrefix } = result.data
          setError(`Flipped '${originalPrefix}' to '${flippedPrefix}'`)
        } else {
          setError(result.error || "Could not use Flip")
        }
        break

      case "bridge":
        result = await gameModeManager.useBridge()
        if (result.success && result.data?.bridgeWord) {
          handleWordSubmit(result.data.bridgeWord)
        } else {
          setError(result.error || "Could not use Bridge")
        }
        break
    }
  }

  const handleWordWarpSelection = async (letters: string) => {
    try {
      const result = await gameModeManager.useWordWarp()
      if (result.success && result.data?.words) {
        const words = result.data.words
        if (words.length > 0) {
          // Select a random word from the possible words
          const randomWord = words[Math.floor(Math.random() * words.length)]
          handleWordSubmit(randomWord)
          setShowWordWarpGrid(false)
        } else {
          setError("No valid words found starting with those letters. Try another combination.")
        }
      } else {
        setError("No valid words found starting with those letters. Try another combination.")
      }
    } catch (err) {
      setError("Failed to process word warp selection")
    }
  }

  const getCurrentPlayer = () => {
    if (!gameState?.players || !user?.id) return null;
    return gameState.players[user.id];
  };

  const getOpponent = () => {
    if (!gameState?.players || !user?.id) return null;
    const opponentId = Object.keys(gameState.players).find(id => id !== user.id);
    return opponentId ? gameState.players[opponentId] : null;
  };

  // Render the start word with highlighted last two letters
  const renderStartWord = () => {
    if (!gameState?.startWord) return null;

    return (
      <div className="text-2xl sm:text-3xl font-bold">
        <span>{gameState.startWord}</span>
      </div>
    );
  };

  const currentPlayer = gameState?.players?.[user?.id || ''];
  const opponent = user?.id ? Object.values(gameState?.players || {}).find(p => p.id !== user.id) : null;

  // Update letter tracking when game state changes
  useEffect(() => {
    const chain = currentPlayer?.chain;
    if (!chain || !chain.length) return;

    const letters = new Set<string>();
    const rare = new Set<string>();
    
    chain.forEach(word => {
      word.toUpperCase().split('').forEach(letter => {
        letters.add(letter);
        if (RARE_LETTERS.has(letter)) {
          rare.add(letter);
        }
      });
    });
    
    setUsedLetters(letters);
    setRareLettersUsed(rare);
  }, [currentPlayer?.chain]);

  const getLastWord = () => {
    const chain = currentPlayer?.chain;
    if (!chain || !chain.length) return gameState?.startWord || "";
    return chain[chain.length - 1];
  };

  const lastWord = getLastWord();

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {gameStatus === "waiting" ? (
        <div className="text-center space-y-4">
          <Button onClick={findMatch} className="w-full">
            <User className="h-4 w-4 mr-2" />
            Find Match
          </Button>
          <p className="text-sm text-muted-foreground">
            Waiting for opponent...
          </p>
        </div>
      ) : gameState ? (
        <>
          <div className="flex justify-between items-center">
            <div className="text-sm">
              Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>
            <Progress value={(timeLeft / 300) * 100} className="w-1/2" />
          </div>

          <div className="flex flex-col items-center space-y-2">
            {renderStartWord()}
            <div className="text-sm text-muted-foreground">Start Word</div>
          </div>

          <GameStatsMobile
            score={getCurrentPlayer()?.score || 0}
            moves={getCurrentPlayer()?.chain?.length || 0}
          />

          <LetterTracker usedLetters={usedLetters} rareLettersUsed={rareLettersUsed} />

          <WordChain words={getCurrentPlayer()?.chain || []} />

          {gameStatus === "playing" && (
            <>
              <WordInput onSubmit={handleWordSubmit} lastWord={getLastWord()} />
              <PowerUpBar onUsePowerUp={handleUsePowerUp} disabled={gameStatus !== "playing"} />
            </>
          )}

          {gameStatus === "ended" && (
            <Button onClick={findMatch} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
          )}
        </>
      ) : null}

      {showWordWarpGrid && (
        <WordWarpGrid
          onSelect={handleWordWarpSelection}
          onClose={() => setShowWordWarpGrid(false)}
        />
      )}

      {showHintModal && (
        <HintModal
          open={showHintModal}
          onOpenChange={(open) => setShowHintModal(open)}
        />
      )}
    </div>
  );
}
