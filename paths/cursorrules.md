# ⚙️ Cursor Coding Rules for TailSpin (Best Practices)

This file provides enforced rules and practices to help Cursor write clean, non-redundant, and maintainable code for the TailSpin project.

---

## ✅ General Coding Guidelines

### 1. **Avoid Redundancy**

* Don’t repeat logic already present in shared functions or utilities 
* Use helper functions whenever possible

### 2. **Respect File Responsibilities**

* Keep business logic in `lib/`
* Keep API request handlers in `pages/api/`
* Keep component state and layout in `components/` and `pages/`

### 3. **Don't Modify UI Without Prompt**

* Do not change any JSX or Tailwind styling unless specifically asked.
* Avoid inserting handlers or logic directly into UI files—call imported functions instead.

### 4. **Follow Functional Boundaries**

| Folder        | Responsibility                            |
| ------------- | ----------------------------------------- |
| `lib/`        | Dictionary, validation, scoring, powerups |
| `api/`        | Route handlers and backend logic          |
| `components/` | Reusable React components and views       |
| `pages/`      | Top-level routes and layout               |

---

## 🧼 Code Quality Rules

### 5. **Use Pure Functions Where Possible**

* Avoid side effects in helpers
* Make scoring, validation, and analysis deterministic

### 6. **Keep Functions Small**

* Break logic into clearly named helper functions if it exceeds \~30 lines
* Each function should do one thing well

### 7. **Type Everything (TypeScript)**

* Always use interfaces or types for:

  * Game session state
  * Validation results
  * Scoring summaries

---

## 🔁 Safe Integration with Existing Code

### 8. **Don’t Overwrite**

* Never overwrite existing logic without explanation
* If updating a function, wrap new logic in `if/else` blocks with fallback

### 9. **Guard Against Undefined**

* Always check `undefined` values before using `.length`, `.map`, or accessors
* Use nullish coalescing (`??`) and optional chaining (`?.`) carefully

---

## 🔍 Naming & Structure

### 10. **Consistent Naming**

| Concept         | Naming Convention        |
| --------------- | ------------------------ |
| Word Validator  | `validateWordChain()`    |
| Dictionary Load | `loadDictionary()`       |
| Game Result     | `GameResult` (interface) |
| Chain Score     | `calculateScore()`       |

### 11. **Use Folder Naming to Your Advantage**

* Prefer `lib/validation.ts` to hold all rule logic
* Use `lib/scoring.ts` for all point calculation

---

## 💬 Prompt Cursor with Clear Instructions

When editing or generating code:

```ts
// Only modify the logic below
// Use validateWord and calculateScore from lib
```

Or

```text
Don’t touch JSX. Only add a handler using the imported validator.
```

---

## 🚨 Anti-Patterns to Avoid

* Logic duplication across routes and lib
* Putting validation logic inside `pages/index.tsx`
* Relying on `any` instead of explicit types
* Skipping dictionary existence check before chaining logic

---

## 🧩 TailSpin-Specific Helpers to Prefer

* `isValidWord(word)` from `lib/dictionary.ts`
* `followsChainRule(prev, next)` from `lib/validation.ts`
* `isTerminalWord(word)` from `lib/validation.ts`
* `calculateScore(chain)` from `lib/scoring.ts`

---

> Use this file as a coding ruleset when building with Cursor.
> All logic should remain modular, testable, and safely extendable.
