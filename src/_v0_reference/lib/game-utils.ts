// This is a mock implementation - in a real app, these functions would connect to a dictionary API
// and have more sophisticated word validation logic

// List of terminal letter combinations (no valid words start with these)
export const TERMINAL_COMBOS = [
  "zz",
  "qz",
  "qx",
  "jx",
  "jz",
  "vx",
  "vz",
  "wx",
  "wz",
  "kq",
  "kz",
  "xz",
  "xx",
  "fq",
  "fz",
  "pq",
  "pz",
]

// List of valid 2-letter starting combinations for English words
export const VALID_STARTING_COMBOS = [
  "ab",
  "ac",
  "ad",
  "af",
  "ag",
  "ai",
  "al",
  "am",
  "an",
  "ap",
  "ar",
  "as",
  "at",
  "au",
  "av",
  "aw",
  "ax",
  "ay",
  "ba",
  "be",
  "bi",
  "bl",
  "bo",
  "br",
  "bu",
  "by",
  "ca",
  "ce",
  "ch",
  "ci",
  "cl",
  "co",
  "cr",
  "cu",
  "cy",
  "da",
  "de",
  "di",
  "do",
  "dr",
  "du",
  "dw",
  "dy",
  "ea",
  "ec",
  "ed",
  "ef",
  "eg",
  "ei",
  "el",
  "em",
  "en",
  "ep",
  "eq",
  "er",
  "es",
  "et",
  "eu",
  "ev",
  "ew",
  "ex",
  "ey",
  "fa",
  "fe",
  "fi",
  "fl",
  "fo",
  "fr",
  "fu",
  "ga",
  "ge",
  "gh",
  "gi",
  "gl",
  "gn",
  "go",
  "gr",
  "gu",
  "gy",
  "ha",
  "he",
  "hi",
  "ho",
  "hu",
  "hy",
  "ic",
  "id",
  "if",
  "ig",
  "il",
  "im",
  "in",
  "io",
  "ir",
  "is",
  "it",
  "ja",
  "je",
  "jo",
  "ju",
  "ka",
  "ke",
  "ki",
  "kn",
  "ko",
  "la",
  "le",
  "li",
  "lo",
  "lu",
  "ly",
  "ma",
  "me",
  "mi",
  "mn",
  "mo",
  "mu",
  "my",
  "na",
  "ne",
  "ni",
  "no",
  "nu",
  "ny",
  "oa",
  "ob",
  "oc",
  "od",
  "of",
  "oh",
  "oi",
  "ok",
  "ol",
  "om",
  "on",
  "oo",
  "op",
  "or",
  "os",
  "ot",
  "ou",
  "ov",
  "ow",
  "ox",
  "oy",
  "pa",
  "pe",
  "ph",
  "pi",
  "pl",
  "pn",
  "po",
  "pr",
  "ps",
  "pu",
  "py",
  "qu",
  "ra",
  "re",
  "rh",
  "ri",
  "ro",
  "ru",
  "ry",
  "sa",
  "sc",
  "se",
  "sh",
  "si",
  "sk",
  "sl",
  "sm",
  "sn",
  "so",
  "sp",
  "sq",
  "st",
  "su",
  "sw",
  "sy",
  "ta",
  "te",
  "th",
  "ti",
  "to",
  "tr",
  "tu",
  "tw",
  "ty",
  "ug",
  "ul",
  "um",
  "un",
  "up",
  "ur",
  "us",
  "ut",
  "va",
  "ve",
  "vi",
  "vo",
  "vu",
  "wa",
  "we",
  "wh",
  "wi",
  "wo",
  "wr",
  "xe",
  "xi",
  "ya",
  "ye",
  "yi",
  "yo",
  "yu",
  "za",
  "ze",
  "zi",
  "zo",
]

// Valid flip combinations (can be flipped and still form valid words)
export const VALID_FLIPS: Record<string, string> = {
  an: "na",
  at: "ta",
  in: "ni",
  on: "no",
  re: "er",
  to: "ot",
  ar: "ra",
  al: "la",
  en: "ne",
  or: "ro",
  it: "ti",
  is: "si",
  am: "ma",
  as: "sa",
  et: "te",
  el: "le",
}

/**
 * Validates if a word exists in the dictionary
 */
export async function validateWord(word: string): Promise<boolean> {
  // In a real app, this would check against a dictionary API
  // For demo purposes, we'll accept any word with 3+ characters
  return word.length >= 3
}

/**
 * Checks if a word starts with the last two letters of the previous word
 */
export function checkWordConnection(prevWord: string, nextWord: string): boolean {
  if (!prevWord || !nextWord) return false

  const lastTwoLetters = prevWord.slice(-2).toLowerCase()
  return nextWord.toLowerCase().startsWith(lastTwoLetters)
}

/**
 * Checks if a word ends with a terminal combination
 * (a combination that no valid English word starts with)
 */
export function isTerminalCombo(combo: string): boolean {
  return TERMINAL_COMBOS.includes(combo.toLowerCase())
}

/**
 * Checks if a word is terminal (ends with a combination that no valid word starts with)
 */
export function isTerminalWord(word: string): boolean {
  if (word.length < 2) return false
  const lastTwoLetters = word.slice(-2).toLowerCase()
  return isTerminalCombo(lastTwoLetters)
}

/**
 * Get a random valid 2-letter starting combination
 * Optionally exclude certain combinations
 */
export function getRandomStartingCombo(exclude: string[] = []): string {
  const validCombos = VALID_STARTING_COMBOS.filter((combo) => !exclude.includes(combo))
  return validCombos[Math.floor(Math.random() * validCombos.length)]
}

/**
 * Check if a 2-letter combo can be flipped
 */
export function canFlipCombo(combo: string): boolean {
  return combo.toLowerCase() in VALID_FLIPS
}

/**
 * Get the flipped version of a 2-letter combo
 */
export function getFlippedCombo(combo: string): string | null {
  const lowerCombo = combo.toLowerCase()
  return VALID_FLIPS[lowerCombo] || null
}

/**
 * Calculate score for a word
 */
export function calculateWordScore(word: string): number {
  // Basic scoring: 1 point per letter
  // In a real game, you might have more complex scoring based on letter rarity
  return word.length
}

/**
 * Calculate bonus points for terminal words
 */
export function calculateTerminalBonus(word: string): number {
  // Bonus points for finding terminal words
  // Base bonus + length of word
  return 10 + word.length
}

/**
 * Get a random word from a predefined list
 */
export function getRandomWord(): string {
  const words = [
    "apple",
    "banana",
    "orange",
    "grape",
    "lemon",
    "mango",
    "cherry",
    "peach",
    "plum",
    "kiwi",
    "planet",
    "garden",
    "window",
    "market",
    "system",
    "travel",
    "design",
    "coffee",
    "music",
    "forest",
  ]

  return words[Math.floor(Math.random() * words.length)]
}

/**
 * Get hint words that start with a specific prefix
 */
export function getHintWords(prefix: string, count = 3): string[] {
  // In a real app, this would query a dictionary API
  // For demo purposes, we'll return mock words
  const mockDictionary: Record<string, string[]> = {
    ap: ["apple", "application", "approach", "approve", "apricot"],
    ba: ["banana", "baseball", "basket", "battery", "balance"],
    ch: ["cherry", "challenge", "change", "chapter", "choice"],
    de: ["design", "develop", "detail", "decide", "deliver"],
    en: ["enjoy", "enter", "energy", "engine", "entire"],
    fo: ["forest", "follow", "focus", "forward", "forget"],
    ga: ["garden", "gather", "galaxy", "garage", "gateway"],
    le: ["lemon", "learn", "leader", "leave", "level"],
    ma: ["mango", "market", "machine", "manage", "matter"],
    pl: ["planet", "plum", "place", "plan", "play"],
    sy: ["system", "symbol", "syntax", "symphony", "synergy"],
    tr: ["travel", "train", "track", "trade", "trust"],
    wi: ["window", "winter", "wisdom", "winner", "wireless"],
  }

  // If we have words for this prefix, return a subset
  if (prefix.length >= 2 && mockDictionary[prefix.slice(0, 2)]) {
    const words = mockDictionary[prefix.slice(0, 2)].filter((word) => word.startsWith(prefix) && word.length >= 3)
    return words.slice(0, count)
  }

  // Otherwise return empty array
  return []
}
