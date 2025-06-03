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
  "ab", "ac", "ad", "af", "ag", "ai", "al", "am", "an", "ap", "ar", "as", "at", "au", "av", "aw", "ax", "ay",
  "ba", "be", "bi", "bl", "bo", "br", "bu", "by",
  "ca", "ce", "ch", "ci", "cl", "co", "cr", "cu", "cy",
  "da", "de", "di", "do", "dr", "du", "dw", "dy",
  "ea", "ec", "ed", "ef", "eg", "ei", "el", "em", "en", "ep", "eq", "er", "es", "et", "eu", "ev", "ew", "ex", "ey",
  "fa", "fe", "fi", "fl", "fo", "fr", "fu",
  "ga", "ge", "gh", "gi", "gl", "gn", "go", "gr", "gu", "gy",
  "ha", "he", "hi", "ho", "hu", "hy",
  "ic", "id", "if", "ig", "il", "im", "in", "io", "ir", "is", "it",
  "ja", "je", "jo", "ju",
  "ka", "ke", "ki", "kn", "ko",
  "la", "le", "li", "lo", "lu", "ly",
  "ma", "me", "mi", "mn", "mo", "mu", "my",
  "na", "ne", "ni", "no", "nu", "ny",
  "oa", "ob", "oc", "od", "of", "oh", "oi", "ok", "ol", "om", "on", "oo", "op", "or", "os", "ot", "ou", "ov", "ow", "ox", "oy",
  "pa", "pe", "ph", "pi", "pl", "pn", "po", "pr", "ps", "pu", "py",
  "qu",
  "ra", "re", "rh", "ri", "ro", "ru", "ry",
  "sa", "sc", "se", "sh", "si", "sk", "sl", "sm", "sn", "so", "sp", "st", "su", "sw", "sy",
  "ta", "te", "th", "ti", "to", "tr", "tu", "tw", "ty",
  "un", "up", "ur", "us", "ut",
  "va", "ve", "vi", "vo",
  "wa", "we", "wh", "wi", "wo", "wr",
  "xe",
  "ya", "ye", "yi", "yo", "yu",
  "za", "ze", "zi", "zo"
]

// Mock dictionary for word validation
const MOCK_DICTIONARY = new Set([
  "planet",
  "technology",
  "test",
  "starting",
  "ending",
  "chain",
  "game",
  "word",
  "play",
  "score"
])

export async function validateWord(word: string): Promise<boolean> {
  // In a real app, this would call a dictionary API
  return MOCK_DICTIONARY.has(word.toLowerCase())
}

export function checkWordConnection(prevWord: string, nextWord: string): boolean {
  if (!prevWord || !nextWord) return false
  const lastTwo = prevWord.slice(-2).toLowerCase()
  return nextWord.toLowerCase().startsWith(lastTwo)
}

export function isTerminalCombo(combo: string): boolean {
  return TERMINAL_COMBOS.includes(combo.toLowerCase())
}

export function isTerminalWord(word: string): boolean {
  if (word.length < 2) return false
  return isTerminalCombo(word.slice(-2))
}

export function getRandomStartingCombo(exclude: string[] = []): string {
  const available = VALID_STARTING_COMBOS.filter(combo => !exclude.includes(combo))
  return available[Math.floor(Math.random() * available.length)]
}

export function canFlipCombo(combo: string): boolean {
  const flipped = combo.split("").reverse().join("")
  return VALID_STARTING_COMBOS.includes(flipped)
}

export function getFlippedCombo(combo: string): string | null {
  const flipped = combo.split("").reverse().join("")
  return canFlipCombo(flipped) ? flipped : null
}

export function calculateWordScore(word: string): number {
  return word.length
}

export function calculateTerminalBonus(word: string): number {
  return isTerminalWord(word) ? 10 : 0
}

export function getRandomWord(): string {
  const words = Array.from(MOCK_DICTIONARY)
  return words[Math.floor(Math.random() * words.length)]
}

export function getHintWords(prefix: string, count = 3): string[] {
  // In a real app, this would search a dictionary for words starting with the prefix
  const mockHints = [
    "test",
    "technology",
    "terminal",
    "template",
    "temporary"
  ]
  return mockHints
    .filter(word => word.startsWith(prefix.toLowerCase()))
    .slice(0, count)
} 