export const mockWordList = [
  'puzzle',
  'lethal',
  'alliance',
  'cerebral',
  'alpha',
  'omega',
  'test',
  'best',
  'rest',
  'quest',
  'zeal',
  'xylophone',
  'jazz',
  'quick',
  'wizard',
  'stellar',
  'arcade',
  'waltz',
  'fuzz',
  'jinx',
  'sphinx'
];

// Words that end in combinations that no valid English word starts with
export const mockTerminalWords = [
  'jazz',
  'waltz',
  'fuzz',
  'jinx',
  'sphinx'
];

// Words with rare letters (Q, Z, X, J)
export const mockRareLetterWords = [
  'quick',
  'quiz',
  'jazz',
  'xylophone',
  'jinx'
];

// Sample word chains for testing
export const mockValidChains = [
  ['puzzle', 'lethal', 'alliance'],
  ['test', 'stellar', 'arcade'],
  ['best', 'stellar', 'arcade']
];

export const mockInvalidChains = [
  ['puzzle', 'castle'], // Doesn't follow chain rule
  ['test', 'invalid', 'word'], // Contains invalid word
  ['quick', 'wizard', 'test'] // Contains duplicate
]; 