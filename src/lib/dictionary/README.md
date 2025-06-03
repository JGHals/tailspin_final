# Dictionary System Architecture

## Overview
The TailSpin dictionary system uses a dual-implementation approach to optimize for both performance and functionality:

1. **Firebase Dictionary** (`firebase-dictionary.ts`)
   - Primary implementation for game operations
   - Handles persistent storage and async operations
   - Provides real-time updates and multiplayer support
   - Used for game state, daily puzzles, and leaderboards

2. **Local Dictionary Service** (`dictionary.service.ts`)
   - Performance-focused implementation
   - Provides synchronous operations for UI responsiveness
   - Handles client-side caching and offline support
   - Used for rapid validation and user feedback

## Integration Points

### Game Mode Manager
- Uses `dictionaryAccess` for:
  - Word validation
  - Getting words with specific prefixes
  - Random word generation (endless mode)
  - Chain validation

### Daily Puzzle Generation
- Uses both implementations:
  - Firebase: Puzzle storage and validation paths
  - Local: Quick word validation during generation
- Handles path finding and difficulty calculation

### Chain Validation
- Firebase: Main game operations and persistence
- Local: Real-time validation and terminal detection

## Performance Optimization

### Caching Strategy
- Firebase Dictionary:
  - Chunk-based prefix caching
  - Metadata caching
  - Real-time updates
- Local Dictionary:
  - In-memory word set
  - Prefix map for quick lookups
  - Valid prefix set

### When to Use Each Service

#### Use Firebase Dictionary For:
- Game state persistence
- Daily puzzle operations
- Multiplayer features
- Leaderboard operations

#### Use Local Dictionary For:
- UI feedback
- Word validation during typing
- Quick prefix lookups
- Offline support

## File Structure
```
src/lib/dictionary/
├── firebase-dictionary.ts    # Primary implementation
├── dictionary-access.ts      # Singleton access point
├── types.ts                 # Shared type definitions
└── unified-cache.ts         # Shared caching utilities
```

## Usage Examples

### Game Operations
```typescript
// Initialize both services
await dictionaryAccess.initialize();
const localDict = new DictionaryService();

// Game move validation
const isValidMove = await dictionaryAccess.isValidWord(word);
const isValidChain = dictionaryAccess.isValidChain(prevWord, word);

// Quick UI feedback
const isValidInstant = localDict.isValidWord(word);
const hasValidMoves = localDict.hasWordsWithPrefix(prefix);
```

### Daily Puzzle Generation
```typescript
// Generate new puzzle
const puzzle = await generateDailyPuzzle({
  validateWord: (word) => dictionaryAccess.isValidWord(word),
  findPaths: async (start, target) => {
    // Use local dict for quick path exploration
    const quickPaths = localDict.findPossiblePaths(start, target);
    // Validate final paths with Firebase
    return dictionaryAccess.validatePaths(quickPaths);
  }
});
```

## Performance Considerations

1. **Initialization**
   - Load local dictionary early in app lifecycle
   - Initialize Firebase dictionary for game features
   - Cache frequently used prefixes

2. **Operation Selection**
   - Use local service for < 100ms operations
   - Use Firebase for persistent operations
   - Combine both for complex operations

3. **Caching**
   - Implement prefix-based chunk loading
   - Cache validation results
   - Store common word paths

## Error Handling

Both services implement robust error handling:
- Network failures (Firebase)
- Invalid word submissions
- Dictionary initialization errors
- Cache invalidation 