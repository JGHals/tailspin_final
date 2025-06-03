/**
 * Constants used for word validation and terminal word detection
 */

export const TERMINAL_COMBOS = [
  "zz", "qz", "qx", "jx", "jz", "vx", "vz", "wx",
  "wz", "kq", "kz", "xz", "xx", "fq", "fz", "pq", "pz",
] as const;

// Valid flips for two-letter combinations
export const VALID_FLIPS = {
  "th": "ht",
  "ch": "hc",
  "sh": "hs",
  "ph": "hp",
  // Add more valid flips as needed
} as const;

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
  "sa", "sc", "se", "sh", "si", "sk", "sl", "sm", "sn", "so", "sp", "sq", "st", "su",
  "ta", "te", "th", "ti", "to", "tr", "tu", "tw", "ty",
  "ug", "ul", "um", "un", "up", "ur", "us", "ut",
  "va", "ve", "vi", "vo", "vu",
  "wa", "we", "wh", "wi", "wo", "wr",
  "xe", "xi",
  "ya", "ye", "yi", "yo", "yu",
  "za", "ze", "zi", "zo", "zu"
] as const; 