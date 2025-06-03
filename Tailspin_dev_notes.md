# 🌀 TailSpin – Developer Documentation

## 1. Project Overview
You are an expert in TypeScript, Next.js App Router, React, and Tailwind. Follow @Next.js docs for Data Fetching, Rendering, and Routing. 

My project is already set up as a Next.js app in Replit.
The UI/theme has been imported from V0. please look in directory _v0_reference for reference UI files to model our app after

I want to keep the existing UI as-is — design, structure, elements, and styles — and now start building the backend and game logic for the app to support that front end. 

Important:

    Do NOT modify or re-render the UI — all logic should integrate with existing components - please update code if you have to, but please notify me first and don't create new files without asking. 

    Keep everything modular so I can scale later (e.g. with multiplayer)

Please scaffold the initial files and logic needed to support this backend flow while preserving the front-end theme.

Your job is to create a Tailspin, a word-chaining game where players build chains of words with each new word starting EXACTLY with the last two letters of the previous word (e.g., "puzzle" → "lethal" → "alliance"):

TailSpin is a word-chaining game built with Next.js 14 App Router, TypeScript, and Tailwind CSS. The game challenges players to build chains of words where each new word must start with the last two letters of the previous word.

### Tech Stack
- **Frontend**: Next.js 14 App Router, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Firebase
- **State Management**: React Context + Custom Hooks
- **Authentication**: Firebase Auth (✅ Google, ✅ Email/Password, ✅ Facebook, ✅ Apple)
- **Database**: Firebase Firestore (✅ Security Rules, ✅ Real-time Updates)
- **Backend Security**: ✅ Firebase Admin SDK, ✅ Rate Limiting
- **Hosting**: Replit

### Project Structure
```
src/
├── app/                 # Next.js App Router pages and API routes
├── components/          # React components
└── lib/                # Core game logic and utilities
    ├── dictionary/     # Dictionary management system
    ├── game/           # Game modes and core mechanics
    ├── validation/     # Word validation system
    ├── services/       # Firebase and other services
    ├── contexts/       # React contexts
    ├── hooks/          # Custom React hooks
    └── types/          # TypeScript type definitions
```

### Authentication & Firebase Infrastructure
Currently implemented:

#### Authentication Methods
- Email/Password with verification
- Google OAuth
- Facebook OAuth
- Apple OAuth
- Password reset system
- Token-based sessions

#### Firebase Security & Configuration
- Firestore Security Rules:
  - user_profiles: Owner/admin access
  - saved_games: Owner/admin access
  - daily_challenges: Authenticated read
  - game_error_logs: User create, admin full access
  - daily_stats: User read, admin write
  - achievements: User read, admin write
- Admin SDK Integration
- Environment Variables
- Real-time Auth State
- Custom Claims for Roles

#### Firebase Services
- Authentication
  - Multi-provider support
  - Custom admin claims
  - Email verification
  - Session management
- Firestore
  - Optimized data structure
  - Secure access patterns
  - Real-time updates
  - Batch operations
- Admin SDK
  - Server-side verification
  - User management
  - Custom claims handling

## 2. Game Mechanics

### Core Word Chaining Rule
- Each word must start with the exact last two letters of the previous word
- Each word must be an english language, this is not a limitation but intended
- Each word must NOT BE a proper noun, also intended
- Example: "puzzle" → "lethal" → "alliance"

### Scoring System
Currently implemented scoring rules:

```typescript
const defaultScoringRules = {
  basePoints: 10,
  lengthBonus: 5,        // Per letter beyond 4 letters
  rareLetterBonus: 15,   // For Q, Z, X, J
  streakBonus: 10,       // For consecutive valid words
  terminalBonus: 50,     // For reaching a terminal word
  speedBonus: 20,        // For moves under 5 seconds
  dailyBonus: {
    completion: 100,
    underPar: 50,
    fastSolve: 75,
    rareLetters: 25
  },
  penalties: {
    invalidAttempt: -5,
    hintUsed: -10,
    powerUpUsed: -5
  }
};
```

### Terminal Words
- Words that end in combinations no valid English word starts with
- Handled differently per game mode:
  - Daily Challenge: Not allowed (except target word)
  - Endless Mode: Celebrated as achievements
  - Versus Mode: Counted for scoring but don't end game

### Power-Up System

### Overview
The game features five distinct power-ups that provide strategic advantages during gameplay. Each power-up costs tokens and is managed by the `PowerUpSystem` class.

### Available Power-Ups

1. **Hint** (🔍 Suggestion System)
   - **Cost**: 3 tokens
   - **Function**: Shows valid next word suggestions that follow the chain rule
   - **Implementation**: `usePowerUps.getHint()`
   - **UI**: Yellow lightbulb icon
   - **Use Case**: When stuck and need valid word options

2. **Undo** (↩️ Rewind)
   - **Cost**: 4 tokens
   - **Function**: Removes the last word from the chain
   - **Implementation**: `usePowerUps.performUndo()`
   - **UI**: Orange undo icon
   - **Use Case**: Correct mistakes or try different paths

3. **Word Warp** (🪄 Combo Selector)
   - **Cost**: 10 tokens
   - **Function**: Select any valid 2-letter combo to continue chain
   - **Implementation**: `usePowerUps.performWordWarp()`
   - **UI**: Blue wand icon
   - **Use Case**: Strategic path changes in challenging situations

4. **Flip** (↔️ Letter Reversal)
   - **Cost**: 5 tokens
   - **Function**: Inverts the current 2-letter combo if valid
   - **Implementation**: `usePowerUps.performFlip()`
   - **UI**: Purple flip icon
   - **Use Case**: Quick exploration of reversed letter combinations

5. **Bridge** (🌉 Wildcard Word)
   - **Cost**: 7 tokens
   - **Function**: Places a validated wildcard word to continue chain
   - **Implementation**: `usePowerUps.performBridge()`
   - **UI**: Amber brackets icon
   - **Use Case**: Particularly useful in Daily Challenge for reaching target words

### Implementation Details

#### Core Components
- `PowerUpSystem` class (`src/lib/game/power-up-system.ts`)
  - Manages costs and validation
  - Handles user inventory
  - Integrates with game state
  - Provides error handling

#### UI Components
- `PowerUpBar`: Main game interface component
- `PowerUpInfoModal`: Detailed descriptions and costs
- `PowerUpMenu`: Alternative compact view

#### Integration Points
- Firebase persistence
- User profile management
- Token economy system
- Achievement tracking

#### Usage Flow
1. User selects power-up from UI
2. System validates:
   - Token balance
   - Power-up availability
   - Usage conditions
3. If valid:
   - Apply power-up effect
   - Deduct tokens
   - Update game state
   - Provide feedback
4. If invalid:
   - Show error message
   - Maintain current state

### Token Costs
```typescript
const powerUpCosts = {
  hint: 3,
  undo: 4,
  wordWarp: 10,
  flip: 5,
  bridge: 7
};
```

### Error Handling
- Insufficient tokens
- Invalid game state
- Usage restrictions
- Network issues
- State conflicts

### Game Mode Interactions

#### Daily Challenge
- All power-ups available
- Higher strategic value for Bridge
- Cost/benefit important for scoring

#### Endless Mode
- All power-ups available
- Focus on chain continuation
- Terminal word recovery

#### Versus Mode (Future)
- Power-up usage affects scoring
- Tactical advantages in competition
- Real-time effects on opponent

## 3. Game Modes

### Daily Challenge
- **Status**: ✅ Fully Implemented
- Start word and target word provided
- Par moves system for scoring
- One attempt per day per user
- Leaderboard integration

### Endless Mode
- **Status**: ✅ Fully Implemented
- Random start word generation
- Terminal word discovery tracking
- Progressive difficulty
- Achievement system integration

### Versus Mode
- **Status**: 🚧 Partially Implemented
- Real-time multiplayer via Firebase
- Shared start word
- Time-limited matches
- Score-based winning condition

## 4. Dictionary Management System

### Architecture
The dictionary system uses a dual-layer approach:

1. **Local Dictionary (DictionaryService)**
```typescript
class DictionaryService {
  private dictionary: Set<string>;
  private prefixMap: Map<string, string[]>;
  private validPrefixes: Set<string>;
}
```

2. **Firebase Dictionary (FirebaseDictionaryOptimized)**
```typescript
class FirebaseDictionaryOptimized {
  private metadata: DictionaryMetadata;
  private chunkCache: Map<string, WordChunk[]>;
}
```

### Initialization Flow
1. Load core dictionary on app start
2. Build prefix/suffix maps
3. Cache common prefixes
4. Sync with Firebase for multiplayer support

### Performance Optimizations
- In-memory prefix mapping
- Chunk-based loading from Firebase
- Local caching of frequent lookups
- Async validation for large operations

## 5. Word Validation System

### Validation Pipeline
```typescript
async function validateWord(
  word: string,
  chain: string[],
  gameMode?: GameMode
): Promise<WordValidationResult>
```

1. Basic Validation
   - Length check
   - Character validity

2. Dictionary Check
   - Word existence
   - Prefix/suffix validation

3. Chain Rule Validation
   - Last two letters matching
   - No duplicates in chain

4. Mode-Specific Validation
   - Terminal word handling
   - Daily challenge constraints
   - Versus mode rules

### Validation Result Structure
```typescript
interface WordValidationResult {
  isValid: boolean;
  word: string;
  errors?: ValidationError[];
  isTerminalWord: boolean;
  matchesLastWord?: boolean;
  stats?: WordStats;
  suggestedWords?: string[];
}
```

## 6. Game Session Management

### State Management
Core game state is managed by `GameStateManager`:

```typescript
interface GameState {
  mode: GameMode;
  chain: string[];
  startWord: string;
  targetWord?: string;
  isComplete: boolean;
  score: GameScore;
  wordTimings: Map<string, number>;
  terminalWords: Set<string>;
  powerUpsUsed: Set<string>;
  rareLettersUsed: Set<string>;
  // ... additional state fields
}
```

### Session Persistence
- Auto-save every 30 seconds
- Save on significant state changes
- Resume capability for incomplete games
- Daily challenge progress tracking

## 7. Achievement System

Currently implemented achievements:

### Daily Challenge
- Under Par: Complete below par moves
- Speed Demon: Complete under 2 minutes
- Perfect Line: No mistakes or hints
- Rare Letter Master: Use 3+ rare letters

### Endless Mode
- Chain Master: 25+ word chain
- Word Wizard: 50+ word chain
- Dead End Collector: Find 5 terminal words
- Alphabet Explorer: Use 20+ unique letters

## 8. Current Limitations & TODOs

### Known Limitations
1. Dictionary
   - Limited to English words
   - No proper noun support
   - Some valid compounds missing

2. Performance
   - Initial dictionary load time
   - Firebase sync delays
   - Large chain validation overhead

### Planned Features
1. Multiplayer
   - Tournament mode
   - Team play
   - Global leaderboards

2. Power-ups
   - Word flip system
   - Chain branching
   - Time manipulation

3. Social Features
   - Friend challenges
   - Custom rooms
   - Achievement sharing

## 9. API Routes

### Implemented Routes
```typescript
// Authentication & User Management
POST /api/auth/register    // Email registration
POST /api/auth/login      // Email & OAuth login
POST /api/auth/reset-password  // Password reset
POST /api/user/profile
GET  /api/user/stats
POST /api/user/achievements

// Game Management
POST /api/game/start
POST /api/game/save
GET  /api/game/load/:id
POST /api/game/submit-word

// Daily Challenge
GET  /api/daily/current
POST /api/daily/submit
GET  /api/daily/leaderboard
```

### Security Implementation
- ✅ Rate limiting on auth endpoints
- ✅ Email verification requirement
- ✅ Multiple auth providers
- ✅ Password reset flow
- ✅ OAuth security best practices
- ✅ Granular Firestore security rules
- ✅ User-based document access
- ✅ Admin role management
- ✅ Data validation rules

### Authentication & Data Flow
1. Registration Flow
   - Provider selection
   - Profile creation
   - Email verification
   - Initial setup

2. Authentication Flow
   - Multi-provider login
   - Session management
   - Profile sync
   - Rate limiting

3. Data Security Flow
   - Rule-based access
   - Real-time updates
   - Admin operations
   - Error handling

## 10. User Journey & Data Flow

### Game Session Flow
1. **Initialization**
   ```typescript
   // 1. Load dictionary
   await dictionaryAccess.initialize();
   
   // 2. Start game session
   const gameManager = new GameManager();
   await gameManager.startGame({
     mode: 'daily',
     startWord: 'puzzle'
   });
   ```

2. **Word Submission**
   ```typescript
   // 3. Submit and validate word
   const result = await gameManager.submitWord('lethal');
   
   // 4. Update game state
   if (result.valid) {
     updateUI(result.score, result.stats);
     checkAchievements(result.chain);
   }
   ```

3. **Game Completion**
   ```typescript
   // 5. Handle game end
   if (result.gameComplete) {
     saveStats(result.score);
     updateLeaderboard(result.score);
     showAchievements(result.achievements);
   }
   ```

### Data Persistence Flow
1. **User Data**
   - Profile in Firebase Auth
   - Stats in Firestore
   - Achievements tracked per user

2. **Game State**
   - Auto-save to Firestore
   - Local state in React context
   - Session recovery system

3. **Dictionary Updates**
   - Daily sync with Firebase
   - Local cache management
   - Prefix map updates

---

## Changelog

### 2024-03-XX - Major Infrastructure & Testing Update

This update focuses on robust infrastructure implementation, including connection management, caching systems, and comprehensive testing.

#### Phase 1: Connection Management ✅
- Added ConnectionManager service for online/offline handling
- Created useConnection hook for React components
- Implemented ConnectionStatus component
- Added LeaderboardErrorBoundary
- Implemented health check API endpoint
- Status: Complete with full test coverage

#### Phase 2: Online/Offline Infrastructure ✅
- Created connection-context.tsx for state management
- Updated leaderboard types for online focus
- Implemented LeaderboardManagerV2 with Firebase
- Added real-time subscription capabilities
- Updated useLeaderboard hook
- Added online/offline UI indicators
- Status: Complete with Firebase integration

#### Phase 3: Dictionary & Caching System ✅
- Implemented tiered caching system:
  - memory-cache.ts: In-memory LRU cache
  - indexed-db-cache.ts: Persistent storage
  - tiered-cache.ts: Cache orchestration
- Enhanced service worker:
  - Network-first strategy
  - Cache-first strategy
  - Offline fallback
- Status: Complete with performance optimization

#### Phase 4: Game State Persistence ✅
- Created GamePersistenceService:
  - Auto-saving (30-second intervals)
  - Firebase + localStorage backup
  - State reconstruction
  - Type-safe data handling
- Status: Complete with error handling

#### Phase 5: Error Recovery System ✅
- Implemented ErrorRecoveryService:
  - Multiple recovery strategies
  - Chain validation
  - UI state recovery
  - Timing data reconstruction
- Integrated with GameManager
- Status: Complete with test coverage

#### Phase 6: Testing Infrastructure ✅
- Created comprehensive integration tests:
  - Game state management
  - Power-up system integration
  - Terminal word handling
  - State persistence
  - Error recovery validation
  - Achievement system integration

### Test Coverage Status
✅ Core Game Flow
✅ Error Recovery
✅ State Persistence
✅ Power-up System
✅ Terminal Words
✅ Achievement System
✅ Firebase Integration
✅ Dictionary Caching
✅ Online/Offline Handling
❌ Daily Challenge Mode
❌ Versus Mode
❌ Cross-Mode Integration

### Breaking Changes
None. All changes are backward compatible and enhance existing functionality.

### Performance Improvements
- Implemented tiered caching for dictionary access
- Optimized Firebase real-time updates
- Enhanced state persistence with backup strategies
- Improved error recovery with minimal state reconstruction
- Optimized online/offline transitions

### Next Steps
1. Daily Challenge Mode Testing
2. Versus Mode Testing
3. Cross-Mode Integration Testing
4. Performance Testing Suite
5. Load Testing Implementation

### Migration Notes
No migration needed. All changes are additive and maintain backward compatibility with existing game states and user data.

### Contributors
- Infrastructure & Testing Implementation: Claude
- Code Review & Architecture: Human

### 2024-03-XX - TypeScript Type Safety, Documentation, and Code Quality Improvements

This update focuses on enhancing type safety, improving documentation, eliminating code duplication, and improving test suite organization, particularly in the game state management system.

#### Documentation and Code Quality ✅
- Comprehensive analysis of reference vs. active code
- Verified no direct imports from `_v0_reference`
- Documented and validated toast system architecture:
  - Core toast hook in `src/components/ui/use-toast.ts`
  - Radix UI primitive integration
  - Custom achievement toast implementation
- Confirmed proper architectural separation
- Status: Complete with improved documentation

#### Code Duplication Analysis ✅
- Analyzed potential duplication in:
  - Toast implementations
  - Game state management
  - Firebase interactions
- Confirmed distinct responsibilities:
  - Reference code serves as documentation
  - Active code implements current features
  - No redundant functionality
- Status: Complete with clean separation

#### Type System Improvements ✅
- Fixed SavedGameState interface implementation in test suites
- Properly nested game state properties under the state property
- Corrected Map and Set type usage in test fixtures
- Improved type safety in game state service
- Status: Complete with full type coverage

#### Test Suite Enhancements ✅
- Reorganized endless mode test suite
- Added comprehensive test cases for:
  - Game state corruption recovery
  - Terminal word handling
  - Achievement tracking
  - Power-up system integration
  - Score calculation and persistence
- Improved test fixture data structures
- Added error condition coverage
- Status: Complete with improved test organization

### Breaking Changes
None. All changes are type-system improvements and documentation updates that maintain runtime behavior.

### Performance Improvements
- Optimized test suite execution
- Improved type checking performance
- Enhanced IDE support through better type definitions
- Reduced cognitive overhead through better documentation
- Improved maintainability through confirmed separation of concerns

### Next Steps
1. Complete Daily Challenge Mode Testing
2. Implement Versus Mode Test Suite
3. Add Cross-Mode Integration Tests
4. Enhance Performance Testing Coverage
5. Implement Load Testing Suite
6. Continue documentation improvements
7. Regular duplication checks

### Migration Notes
No migration needed. Changes are focused on type system improvements, documentation, and code organization.

### Contributors
- Type System Improvements: Claude
- Test Suite Organization: Claude
- Documentation & Analysis: Claude
- Code Review: Human

---
> Last updated: March 2024 