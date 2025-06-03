import { db } from '../firebase/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  increment, 
  Timestamp,
  DocumentReference 
} from 'firebase/firestore';

export interface TokenTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  timestamp: Timestamp;
  gameMode?: 'daily' | 'endless' | 'versus';
  gameId?: string;
}

export interface TokenBalance {
  userId: string;
  balance: number;
  lastUpdated: Timestamp;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface PowerUpCost {
  hint: number;
  undo: number;
  wordWarp: number;
  bridge: number;
}

class TokenManager {
  private static readonly COLLECTION_BALANCES = 'token_balances';
  private static readonly COLLECTION_TRANSACTIONS = 'token_transactions';
  
  private static readonly POWER_UP_COSTS: PowerUpCost = {
    hint: 5,
    undo: 3,
    wordWarp: 8,
    bridge: 10
  };

  private static readonly DAILY_REWARDS = {
    completion: 3,
    underPar: 5,
    speedBonus: 2,
    rareLetterBonus: 1
  };

  private static readonly ENDLESS_REWARDS = {
    baseChain: 1, // per 10 words
    terminalWord: 2,
    longSession: 2, // 15+ minutes
    noPowerUps: 3 // 10+ chain without power-ups
  };

  private static readonly VERSUS_REWARDS = {
    participation: 2,
    victory: 5,
    winStreak: 3 // 3+ wins
  };

  async getBalance(userId: string): Promise<TokenBalance> {
    const balanceRef = doc(collection(db, TokenManager.COLLECTION_BALANCES), userId);
    const balanceDoc = await getDoc(balanceRef);

    if (!balanceDoc.exists()) {
      // Initialize new balance for user
      const initialBalance: TokenBalance = {
        userId,
        balance: 0,
        lastUpdated: Timestamp.now(),
        lifetimeEarned: 0,
        lifetimeSpent: 0
      };
      await setDoc(balanceRef, initialBalance);
      return initialBalance;
    }

    return balanceDoc.data() as TokenBalance;
  }

  async addTokens(
    userId: string,
    amount: number,
    reason: string,
    gameMode?: 'daily' | 'endless' | 'versus',
    gameId?: string
  ): Promise<TokenBalance> {
    if (amount <= 0) throw new Error('Token amount must be positive');

    const balanceRef = doc(collection(db, TokenManager.COLLECTION_BALANCES), userId);
    const transactionRef = doc(collection(db, TokenManager.COLLECTION_TRANSACTIONS));

    // Record transaction
    const transaction: TokenTransaction = {
      id: transactionRef.id,
      userId,
      amount,
      reason,
      timestamp: Timestamp.now(),
      gameMode,
      gameId
    };

    // Update balance atomically
    await setDoc(balanceRef, {
      balance: increment(amount),
      lastUpdated: Timestamp.now(),
      lifetimeEarned: increment(amount)
    }, { merge: true });

    // Save transaction
    await setDoc(transactionRef, transaction);

    // Return updated balance
    return this.getBalance(userId);
  }

  async spendTokens(
    userId: string,
    amount: number,
    reason: string
  ): Promise<{
    success: boolean;
    balance?: TokenBalance;
    error?: string;
  }> {
    if (amount <= 0) throw new Error('Token amount must be positive');

    const balance = await this.getBalance(userId);
    if (balance.balance < amount) {
      return {
        success: false,
        error: 'Insufficient tokens'
      };
    }

    const balanceRef = doc(collection(db, TokenManager.COLLECTION_BALANCES), userId);
    const transactionRef = doc(collection(db, TokenManager.COLLECTION_TRANSACTIONS));

    // Record transaction
    const transaction: TokenTransaction = {
      id: transactionRef.id,
      userId,
      amount: -amount,
      reason,
      timestamp: Timestamp.now()
    };

    // Update balance atomically
    await setDoc(balanceRef, {
      balance: increment(-amount),
      lastUpdated: Timestamp.now(),
      lifetimeSpent: increment(amount)
    }, { merge: true });

    // Save transaction
    await setDoc(transactionRef, transaction);

    // Return updated balance
    const updatedBalance = await this.getBalance(userId);
    return {
      success: true,
      balance: updatedBalance
    };
  }

  async canUsePowerUp(userId: string, powerUpType: keyof PowerUpCost): Promise<boolean> {
    const cost = TokenManager.POWER_UP_COSTS[powerUpType];
    const balance = await this.getBalance(userId);
    return balance.balance >= cost;
  }

  async usePowerUp(
    userId: string,
    powerUpType: keyof PowerUpCost
  ): Promise<{
    success: boolean;
    balance?: TokenBalance;
    error?: string;
  }> {
    const cost = TokenManager.POWER_UP_COSTS[powerUpType];
    return this.spendTokens(
      userId,
      cost,
      `Used ${powerUpType} power-up`
    );
  }

  getPowerUpCost(powerUpType: keyof PowerUpCost): number {
    return TokenManager.POWER_UP_COSTS[powerUpType];
  }

  getDailyReward(
    underPar: boolean,
    fastSolve: boolean,
    rareLetters: number
  ): number {
    let reward = TokenManager.DAILY_REWARDS.completion;
    if (underPar) reward += TokenManager.DAILY_REWARDS.underPar;
    if (fastSolve) reward += TokenManager.DAILY_REWARDS.speedBonus;
    reward += rareLetters * TokenManager.DAILY_REWARDS.rareLetterBonus;
    return reward;
  }

  getEndlessReward(
    chainLength: number,
    terminalWords: number,
    duration: number,
    powerUpsUsed: number
  ): number {
    let reward = Math.floor(chainLength / 10) * TokenManager.ENDLESS_REWARDS.baseChain;
    reward += terminalWords * TokenManager.ENDLESS_REWARDS.terminalWord;
    if (duration >= 900) reward += TokenManager.ENDLESS_REWARDS.longSession; // 15 minutes
    if (chainLength >= 10 && powerUpsUsed === 0) reward += TokenManager.ENDLESS_REWARDS.noPowerUps;
    return reward;
  }

  getVersusReward(
    isVictory: boolean,
    currentWinStreak: number
  ): number {
    let reward = TokenManager.VERSUS_REWARDS.participation;
    if (isVictory) {
      reward += TokenManager.VERSUS_REWARDS.victory;
      if (currentWinStreak >= 3) reward += TokenManager.VERSUS_REWARDS.winStreak;
    }
    return reward;
  }
}

// Export singleton instance
export const tokenManager = new TokenManager(); 