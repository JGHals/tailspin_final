You are an expert in TypeScript, Next.js App Router, React, and Tailwind. Follow @Next.js docs for Data Fetching, Rendering, and Routing. 

My project is already set up as a Next.js app in Replit.
The UI/theme has been imported from V0.

I want to keep the existing UI as-is — design, structure, elements, and styles — and now start building the backend and game logic for the app to support that front end. 

Important:

    Do NOT modify or re-render the UI — all logic should integrate with existing components - please update code if you have to, but please notify me first and don't create new files without asking. 

    Keep everything modular so I can scale later (e.g. with multiplayer)

Please scaffold the initial files and logic needed to support this backend flow while preserving the front-end theme.

Your job is to create a Tailspin, a word-chaining game where players build chains of words with each new word starting EXACTLY with the last two letters of the previous word (e.g., "puzzle" → "lethal" → "alliance"):

# 🌀 TailSpin – App Spec for Cursor Project

##

---

## 🎯 Concept Overview

**TailSpin** is a word-chaining game where players build chains of words, with each new word starting with the last two letters of the previous word.

### Core Goals:

* Use only valid English dictionary words
* Follow strict two-letter chaining rules (e.g., "puzzle" → "lethal" → "alliance") - words must ALWAYS start with the last two letters of the previous words. They must match EXACTLY.
* Prevent word reuse in a single session/puzzle/chain.
* Strategically navigate toward or avoid terminal words (words with no valid next options)

---

## 📦 Project Overview

* **Game Type:** Strategic word game with multiple play modes
* **Modes:** Daily Challenge, Endless, Versus (future state)
* **Core Mechanic:** Word chaining by matching the last two letters of the previous word

## 🎮 Game Modes

### 🧩 1. Daily Challenge Mode&#x20;

* Player is given a **start word** and a **target word**.
* While there is no upper limit to moves, there should be a targeted number of moves (based off the pre-generated puzzle length) that user should 'beat' to get highest possible points.
* The goal is to build a valid word chain between the two, following the rules of chaining.
* Word chaining rule: each word must start with the **last two letters** EXACTLY of the previous word.
* One solvable puzzle per day.
* All users get the same puzzle each day.
* Users can only complete the Daily Challenge once per day.
* If a terminal word is entered while playing the Daily Challenge, return that it will break the chain and do not allow it to be input. Penalize 10 points from the score.&#x20;
* Daily leaderboard

### 🔁 2. Endless Mode

* No end word; play continues until a player runs out of valid moves.
* Focuses on score maximization, vocabulary, and endurance.
* Live feedback on rare letter usage - element showing the alphabet, light up the letters and count them as they are used in the words the user inputs
* **Terminal Combos:** If a word ends in a 2-letter combo that no English word starts with, it is considered a "terminal word."
* **Terminal Word Handling in Endless Mode:**

  * Celebrate as a win (not failure): e.g. "Congratulations! You reached a terminal combo: 'RT'"
  * Bonus points awarded in Endless
  * Unlock rare achievements like "Chain Terminator" or "Dead End Detective"
  * Log all discovered terminal combos in a "Terminal Words Library"
  * Prompt users to purchase a power-up with tokens to continue their chain

### ⚔️ 3. Multiplayer Versus Mode

* Head-to-head play in real-time.
* Shared starting word. Winner is based on longest chain or best score within a time limit.
* All other rules follow Daily Challenge rules, but versus.

---

## 🧠 Core Mechanics

* **Word Validation:** All submitted words must follow the chaining rule and be valid English words found in the dictionary.
* **Terminal Combos:** If a word ends in a 2-letter combo that no English word starts with, it is considered a "terminal word."
* **Power-ups** (token-based):

  * **Flip**: invert current 2-letter combo

    * need to maintain list of valid 'Flips'

  * **Hint** (provide users a hint by showing them the first 3-4 letters, more than just the two starting letters, of valid words they could use to continue the chain)

  * **Bridge**: place random (validated) wildcard word to continue chain

  * **Undo:** Roll back the last word input to the previous word

  * **Word Warp:** Allows player to manually select any valid 2-letter combo from a visible grid. Can be used once per game (or per X turns). Empowering mechanic ("You've reached a terminal word. Use Word Warp to shift the chain into a new path!")

---

## 🧱 Project Architecture

TailSpin is built using a clean, modular architecture with the following layers:

### ✅ Layers

* **Core Layer**: Dictionary Management, Game Engine, Error Handling, Word Chain Analysis, Scoring System
* **Services Layer**: Storage ServiceWord List Service, Daily Challenge Service (puzzle generation and pathing), Game Validation Service, Analytics Service
* **Repositories**: Data access (dictionary, game state, user data)
* **UI**: Screens (login, game, profile, etc.) and reusable components, Theme System

### 🔁 Relationships & Data Flow

* Users log in (auth through firebase)
* Users loads main page → app loads dictionary + player data
* As users enter words, core engine validates:

  * Word exists in English Language
  * Word is more than 2 letters
  * Word is not a name or pro-noun
  * Chain rule is followed
  * Word isn't reused in current chain
* Scoring and token tracking updated player profile
* When session ends, achievements trigger and data is saved

### 🧠 Dictionary System

* Core dictionary with 25,000-30,000 words
* Word length: 2-15 characters
* O(1) lookups using two-letter prefix maps
* Stored as local asset, with optional cloud refresh capability
* Performance benchmarks:

  * Word validation: <0.1ms

  * Next word lookup: <0.5ms

  * Cache operations: <0.05ms

  * Chain validation: <1ms

  * Dictionary loading: <100ms
    Terminal word detection via suffix-to-prefix analysis

### 🔍 Word Chain Analysis

* Finds valid chains between two words using bidirectional search
* Evaluates chain difficulty based on depth and branching
* Can suggest hints based on future word paths

### 🧪 Validation System

* Checks:

  * Dictionary presence
  * Chain rule compliance
  * No duplicates in session
  * Terminal word detection (and handling if hit)

### 🛠 Planned Enhancements

* Multiplayer matchmaking and real-time sync

### 🛠 Technology Stack (Updated)

* **Frontend:** Next.js with React (for scalable web-first and progressive web app capability)
* **Backend:** Node.js with Express or Next.js API routes; optional use of Firebase for real-time data, authentication, and storage
* **Database:** Cloud-based storage for puzzles, user profiles, achievements, tokens
* **Deployment:** Vercel (Next.js native) or Firebase Hosting
* **Authentication:** Firebase Auth&#x20;

## ✅ Scoring System

### Global Scoring Rules

| Event                     | Points                |
| ------------------------- | --------------------- |
| Valid word                | +10                   |
| Word length > 5           | +1 per extra letter   |
| Use of rare letters       | +5 (Q, Z, X, J, etc.) |
| Speed bonus               | +3 (if under 5 sec)   |
| Every 5-word streak       | +10                   |
| 10-word streak multiplier | +1x multiplier        |
| Terminal word             | +20                   |

### Daily Challenge Puzzle-Specific Scoring

| Event                    | Points             |
| ------------------------ | ------------------ |
| Each correct move        | +10                |
| Solve under move 'limit' | +5 per unused move |
| Solve under 2 mins       | +15                |
| Use rare letter          | +10                |
| Hint used                | -10                |
| Invalid word             | -5                 |

### Endless Mode Bonuses

* Score focused on chain length and streak multipliers
* Token use tracked (penalties or no-bonus if used)

### Multiplayer Bonuses

* Bonus for faster play than opponent
* Bonus for rarer or longer words
* Combo-breaker bonus for disrupting opponent

---

## 🏅 Achievements System

### Global Achievements

* Wordsmith – Use a 7+ letter word
* Rare Collector – Use Q, Z, X, or J
* Alphabet Explorer – Use 13+ unique starting letters
* Vault Builder – 250 unique words used

### Daily Challenge Achievements

* Puzzle Rookie – Solve your first puzzle
* Par Buster – Solve with minimum moves
* Streak Builder – Solve 7 days in a row
* No Help Needed – Solve 5 without hints
* Fast Thinker – Solve in under 2 mins

### Endless Mode Achievements

* Chain Master – Reach a 25-word chain
* Perfect Run – No mistakes in 20+ chain
* Dead-End Survivor – Recover from 5 terminal combos
* Combo Fiend – 3x multiplier or higher
* Chain Terminator – Reach a valid terminal combo
* Dead End Collector – Log all 2-letter terminal endings

### Multiplayer Achievements

* First Victory – Win your first match
* Streak Breaker – End a 3-win opponent streak
* Word Duelist – Win 3 in a row
* Speed Demon – Fastest win (under 60s)

---

## 🧩 UI & UX Elements

### 🎨 Visual Style & Theme

* Use code provided from v0

### Suggested Core Screens:

* Home (Daily Challenge front and center)
* Endless Mode
* Versus Mode
* Profile (stats, achievements, letter tracker)

  * Puzzle Vault (archive of completed daily puzzles)
* Leaderboards (Daily, Weekly, All-time)

### Sticky Features:

* Daily streak tracker with milestones (3, 7, 14, 30 days) - ie. how many days in a row have you solved the Daily Challenge

* Terminal Words Library – track discovered terminal endings

* Post-game summary for Endless: score, speed, chain quality, letters used

  * Example: "You used 18/26 letters"
  * "Letters never used: C, F, K, U, V, X"
  * Prompt: "Try again and complete the alphabet?"

* Post-game summary for Daily Challenge: score, speed, under par, letters used

  * Example: "You used 18/26 letters"
  * Prompt: "Well done! Share your results with others"

* Social Share: show off achievement, score, or daily challenge success

* Future State: Cosmetic Unlocks: earn trail effects, avatars, themes by achievements

---

## 🛠 Token Features & Future Monetization

### 🎯 Token Economy Overview

TailSpin uses tokens as a soft currency to reward consistent play and enable optional strategic enhancements. The system is designed to reward:

* Daily engagement
* Skillful chain building
* Exploration of advanced features

### 🔑 Token Earning System

#### 🧩 Daily Challenge

| Action               | Tokens Earned |
| -------------------- | ------------- |
| Attempt              | 3             |
| Solve (within limit) | +5            |
| Solve under 30s      | +2            |
| Use rare letters     | +1 per letter |

#### 🔁 Endless Mode

| Action                        | Tokens Earned |
| ----------------------------- | ------------- |
| Reach 10-word chain           | 1             |
| Every 5 words after           | +1            |
| Survive terminal word         | +2            |
| 15+ minute session            | +2            |
| No power-up bonus (10+ chain) | +3            |

#### ⚔️ Multiplayer

| Action          | Tokens Earned |
| --------------- | ------------- |
| Win a match     | 5             |
| Win streak (3+) | +3            |
| First win bonus | +2            |

---

### How to Earn Tokens

* Daily challenge completion
* Streak milestones
* Achievement unlocks
* Sharing score to socials
* Watching short ad (free users)
* Leveling up via XP

### Monetization Options

* One-time purchases for power-ups
* "Play on" credits if chain ends
* Token packs (bulk buy)
* Cosmetic unlocks (themes, avatars, badges)
* Token subscriptions (daily bonuses)

### Bonus Gameplay Modes

* ✨ Target Word Round: spend token to try to hit a rare combo (e.g., ends in "qh")
* 🎨 Theme Packs: unlock custom vocabulary lists (e.g., Nature, Fantasy, Tech)

---

## User Journey and Data Flow

### 🧑‍💻 User Login/Start

* Open app → Auto-authenticate with Firebase if token exists

  * Create new account if necessary
* Load daily puzzle data, cached dictionary, and user profile
* Fetch streak status and available tokens, historical and profile data
* Display Daily Challenge prominently, with ability to access Endless and Versus modes

### 🎮 Game Session

* Player selects a game mode (Daily, Endless, Multiplayer)
* Initialize game session based on mode
* Load dictionary, user state, token inventory, and any cached puzzles
* Display starting word and target word (Daily/Multiplayer), or generate single random starting word for start (Endless)

### 🔁 Gameplay Loop

* User submits a word
* **Validation Sequence:**

  * Check word is valid (exists in English dictionary)
  * Check chain rule (exactly matches last two letters of previous word)
  * Check word hasn't been reused in current session
  * If invalid, provide feedback and score penalty if applicable
* **On Valid Move:**

  * Update chain and score
  * Add to user's "used words"
  * Highlight any rare letters or combos used
  * Light up letters used on visual letter tracker, if applicable
* **Token Events:**

  * Track milestones (5-word chain, 10-word bonus, rare letter used, etc.)
  * Award tokens accordingly and show toast/modal feedback
* **Achievements:**

  * Check for unlock conditions (no hint run, terminal discovery, time limit win)
  * Update badge/progress UI if unlocked

### 🛠 Power-Up Usage

* Player taps power-up → Verify token balance or available inventory
* Apply effect:

  * Hint → Suggest valid next options
  * Flip → Attempt valid reversed prefix
  * Word Warp → Allow grid-based selection of new prefix
  * Undo → Restore to previous state (remove latest input from chain)
  * Bridge → Inject a wildcard word from valid curated list
* Deduct tokens or use from starter count
* Refresh chain UI and update feedback accordingly

### 🏁 Game Completion

* Trigger final scoring logic based on mode

* Display:

  * Chain summary
  * Speed stats
  * Letters used vs. total
  * Bonus tokens earned

* Submit Daily Challenge result to backend leaderboard

* Sync any unlocked achievements

* Prompt user with post-game options:

  * Share results
  * Play another mode
  * Return to home

*


Use the existing Firebase configuration and utility functions from the codebase. 

## 📝 Development Progress

### 2024-03-21: Achievement System Expansion

#### 🎯 Overview
Enhanced the achievement system with a focus on strategic gameplay elements and player skill progression.

#### ✨ New Features Added

1. **Daily Challenge Achievements**
   - Under Par: Complete challenges more efficiently than par
   - Perfect Line: Complete without mistakes or hints
   - Efficiency Expert: Multiple under-par completions
   - Optimization Master: Quick, accurate moves
   - Speed AND Precision: Fast completion without mistakes

2. **Endless Mode Achievements**
   - Branching Master: Strategic path choices (high branching factor)
   - Explorer: Letter variety in chains
   - Speed Demon: Fast moves in long chains
   - Recovery Expert: Handling terminal words

3. **Technical Improvements**
   - Enhanced GameResult type with wordTimings and pathAnalysis
   - Added new UserStats fields for achievement tracking
   - Improved achievement progress calculation
   - Integrated with existing UI components

#### 🔄 System Updates
- Added branching factor analysis
- Enhanced terminal word handling
- Improved performance tracking
- Added speed-precision balance metrics

#### 🎮 Strategic Elements
The new achievements emphasize:
- Strategic path choices (branching options)
- Efficiency in solving
- Speed-accuracy balance
- Recovery from challenging situations

#### 🛠 Technical Implementation
- Updated types in `game.ts` and `user-profile.ts`
- Enhanced `achievement-service.ts` with new achievements
- Added stats tracking in `user-profile-service.ts`
- Integrated with existing UI components

---
