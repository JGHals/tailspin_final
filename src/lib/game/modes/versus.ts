import { db } from '../../firebase/firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as firebaseLimit,
  Timestamp,
  DocumentReference,
  QueryDocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { chainValidator } from '../chain-validator';
import { scoringSystem } from '../scoring';
import { tokenManager } from '../token-manager';

export type GameStatus = 'waiting' | 'in_progress' | 'completed';
export type PlayerStatus = 'active' | 'inactive' | 'disconnected';

export interface Player {
  id: string;
  name: string;
  status: PlayerStatus;
  chain: string[];
  score: number;
  lastMoveTime: Timestamp;
}

export interface VersusGame {
  id: string;
  status: GameStatus;
  startWord: string;
  players: { [key: string]: Player };
  startTime?: Timestamp;
  endTime?: Timestamp;
  timeLimit: number; // in seconds
  winner?: string; // player ID
}

export interface GameUpdate {
  type: 'player_joined' | 'game_started' | 'move_made' | 'game_ended';
  game: VersusGame;
  playerId?: string;
  move?: string;
}

interface PlayerPresence {
  lastActive: Timestamp;
  status: PlayerStatus;
  gameId: string;
  playerId: string;
}

class VersusModeManager {
  private static readonly COLLECTION_GAMES = 'versus_games';
  private static readonly COLLECTION_PRESENCE = 'player_presence';
  private static readonly DEFAULT_TIME_LIMIT = 300; // 5 minutes
  private static readonly INACTIVE_TIMEOUT = 30; // 30 seconds
  private gameSubscriptions: Map<string, () => void> = new Map();
  private presenceSubscriptions: Map<string, () => void> = new Map();

  async createGame(
    hostId: string, 
    hostName: string,
    startWord: string,
    timeLimit: number = VersusModeManager.DEFAULT_TIME_LIMIT
  ): Promise<string> {
    const gameRef = doc(collection(db, VersusModeManager.COLLECTION_GAMES));
    
    const game: VersusGame = {
      id: gameRef.id,
      status: 'waiting',
      startWord,
      timeLimit,
      players: {
        [hostId]: {
          id: hostId,
          name: hostName,
          status: 'active',
          chain: [startWord],
          score: 0,
          lastMoveTime: Timestamp.now()
        }
      }
    };

    await setDoc(gameRef, game);
    return gameRef.id;
  }

  async joinGame(
    gameId: string, 
    playerId: string, 
    playerName: string
  ): Promise<boolean> {
    const gameRef = doc(collection(db, VersusModeManager.COLLECTION_GAMES), gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) return false;

    const game = gameDoc.data() as VersusGame;
    if (game.status !== 'waiting') return false;

    // Add player to game
    game.players[playerId] = {
      id: playerId,
      name: playerName,
      status: 'active',
      chain: [game.startWord],
      score: 0,
      lastMoveTime: Timestamp.now()
    };

    // If we have 2 players, start the game
    if (Object.keys(game.players).length === 2) {
      game.status = 'in_progress';
      game.startTime = Timestamp.now();
    }

    await setDoc(gameRef, game);

    // Start presence tracking
    const unsubscribe = await this.startPresenceTracking(gameId, playerId);
    this.presenceSubscriptions.set(`${gameId}_${playerId}`, unsubscribe);

    return true;
  }

  async submitMove(
    gameId: string, 
    playerId: string, 
    word: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const gameRef = doc(collection(db, VersusModeManager.COLLECTION_GAMES), gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      return { success: false, error: 'Game not found' };
    }

    const game = gameDoc.data() as VersusGame;
    const player = game.players[playerId];

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (game.status !== 'in_progress') {
      return { success: false, error: 'Game is not in progress' };
    }

    // Validate word
    const validation = await chainValidator.validateNextWord(
      player.chain,
      word
    );

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Check if word was already used by any player
    for (const p of Object.values(game.players)) {
      if (p.chain.includes(word)) {
        return { success: false, error: 'Word already used in this game' };
      }
    }

    // Update player's chain and score
    player.chain.push(word);
    const timeForWord = Timestamp.now().seconds - player.lastMoveTime.seconds;
    const wordScore = scoringSystem.calculateWordScore(
      word,
      timeForWord,
      false, // terminal words don't give bonus in versus
      player.chain.length - 1 // current streak (chain length minus 1)
    );
    player.score += wordScore.total;
    player.lastMoveTime = Timestamp.now();

    // Check for game end conditions
    const now = Timestamp.now();
    const gameTimeElapsed = now.seconds - (game.startTime?.seconds || now.seconds);
    
    if (gameTimeElapsed >= game.timeLimit) {
      game.status = 'completed';
      game.endTime = now;
      game.winner = await this.determineWinner(game);
    }

    await setDoc(gameRef, game);
    return { success: true };
  }

  private async determineWinner(game: VersusGame): Promise<string> {
    let winner = '';
    let highestScore = -1;

    for (const [playerId, player] of Object.entries(game.players)) {
      if (player.score > highestScore) {
        highestScore = player.score;
        winner = playerId;
      }
    }

    // Award tokens to players
    for (const [playerId, player] of Object.entries(game.players)) {
      const isWinner = playerId === winner;
      
      // Get player's current win streak if they won
      let winStreak = 0;
      if (isWinner) {
        const recentGames = await this.getRecentGames(playerId, 5);
        winStreak = this.calculateWinStreak(recentGames, playerId);
      }

      const tokenReward = tokenManager.getVersusReward(isWinner, winStreak);
      
      if (tokenReward > 0) {
        await tokenManager.addTokens(
          playerId,
          tokenReward,
          `Versus mode ${isWinner ? 'victory' : 'participation'}`,
          'versus',
          game.id
        );
      }
    }

    return winner;
  }

  private async getRecentGames(
    playerId: string,
    limit: number
  ): Promise<VersusGame[]> {
    const gamesRef = collection(db, VersusModeManager.COLLECTION_GAMES);
    const q = query(
      gamesRef,
      where('status', '==', 'completed'),
      where(`players.${playerId}`, '!=', null),
      orderBy('endTime', 'desc'),
      firebaseLimit(limit)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as VersusGame);
  }

  private calculateWinStreak(games: VersusGame[], playerId: string): number {
    let streak = 0;
    
    for (const game of games) {
      if (game.winner === playerId) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  subscribeToGame(
    gameId: string, 
    callback: (update: GameUpdate) => void
  ): () => void {
    const gameRef = doc(collection(db, VersusModeManager.COLLECTION_GAMES), gameId);
    
    // Unsubscribe from previous subscription if exists
    this.unsubscribeFromGame(gameId);

    // Create new subscription
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback({
          type: 'game_ended',
          game: null as any,
          playerId: null as any
        });
        return;
      }

      const game = snapshot.data() as VersusGame;
      const update: GameUpdate = {
        type: this.determineUpdateType(game),
        game
      };

      callback(update);
    });

    this.gameSubscriptions.set(gameId, unsubscribe);
    return unsubscribe;
  }

  private determineUpdateType(game: VersusGame): GameUpdate['type'] {
    if (game.status === 'completed') return 'game_ended';
    if (game.status === 'in_progress' && game.startTime) return 'game_started';
    return 'player_joined';
  }

  private async updatePresence(playerId: string, gameId: string): Promise<void> {
    const presenceRef = doc(collection(db, VersusModeManager.COLLECTION_PRESENCE), `${gameId}_${playerId}`);
    await setDoc(presenceRef, {
      lastActive: serverTimestamp(),
      status: 'active',
      gameId,
      playerId
    });
  }

  private async startPresenceTracking(gameId: string, playerId: string): Promise<() => void> {
    // Update presence immediately
    await this.updatePresence(playerId, gameId);

    // Set up interval to update presence
    const interval = setInterval(() => {
      this.updatePresence(playerId, gameId);
    }, 15000); // Update every 15 seconds

    // Set up listener for other player's presence
    const presenceQuery = query(
      collection(db, VersusModeManager.COLLECTION_PRESENCE),
      where('gameId', '==', gameId)
    );

    const unsubscribe = onSnapshot(presenceQuery, async (snapshot) => {
      const now = Timestamp.now();
      
      for (const doc of snapshot.docs) {
        const presence = doc.data() as PlayerPresence;
        const lastActive = presence.lastActive as Timestamp;
        
        if (lastActive && 
            now.seconds - lastActive.seconds > VersusModeManager.INACTIVE_TIMEOUT) {
          // Player is inactive, update game state
          await this.updatePlayerStatus(gameId, presence.playerId, 'inactive');
        }
      }
    });

    // Return cleanup function
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }

  unsubscribeFromGame(gameId: string): void {
    // Unsubscribe from game updates
    const unsubscribe = this.gameSubscriptions.get(gameId);
    if (unsubscribe) {
      unsubscribe();
      this.gameSubscriptions.delete(gameId);
    }

    // Unsubscribe from all presence subscriptions for this game
    Array.from(this.presenceSubscriptions.entries()).forEach(([key, unsubPresence]) => {
      if (key.startsWith(gameId)) {
        unsubPresence();
        this.presenceSubscriptions.delete(key);
      }
    });
  }

  async getActiveGames(maxResults: number = 10): Promise<VersusGame[]> {
    const gamesRef = collection(db, VersusModeManager.COLLECTION_GAMES);
    const q = query(
      gamesRef,
      where('status', '==', 'waiting'),
      orderBy('startTime', 'desc'),
      firebaseLimit(maxResults)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as VersusGame);
  }

  async updatePlayerStatus(
    gameId: string,
    playerId: string,
    status: PlayerStatus
  ): Promise<void> {
    const gameRef = doc(collection(db, VersusModeManager.COLLECTION_GAMES), gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) return;

    const game = gameDoc.data() as VersusGame;
    if (!game.players[playerId]) return;

    game.players[playerId].status = status;

    // If all players are inactive/disconnected, end the game
    const activePlayers = Object.values(game.players)
      .filter(p => p.status === 'active');

    if (activePlayers.length === 0) {
      game.status = 'completed';
      game.endTime = Timestamp.now();
      game.winner = await this.determineWinner(game);
    }

    await setDoc(gameRef, game);
  }
}

// Export singleton instance
export const versusModeManager = new VersusModeManager(); 