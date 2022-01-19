export const emojis = [
  '🐭',
  '🐹',
  '🐰',
  '🐶',
  '🦊',
  '🐯',
  '🦁',
  '🐮',
  '🐷',
  '🐽',
  '🐻',
  '🐼',
  '🐸',
  '🐲',
  '🦄',
  '🐵',
  '🙈',
  '🙉',
  '🙊',
  '🐱',
  '😸',
  '😹',
  '😺',
  '😼',
  '😻',
  '😽',
  '🐒',
  '🐨',
  '🦖',
  '🦕',
  '🐕',
  '🐇',
  '🐿',
  '🐦',
  '🦉',
  '🦜',
  '🕊',
  '🦩',
  '🐧',
  '🦚',
  '🦢',
  '🦆',
  '🐓',
  '🐔',
  '🐣',
  '🐤',
  '🐥',
  '🐋',
  '🐳',
  '🐬',
  '🦈',
  '🐟',
  '🐠',
  '🐙',
  '🦑',
  '🦐',
  '🦀',
  '🐚',
  '🐌',
  '🦞',
  '🦪',
  '🐢',
  '🐞',
  '🌸',
  '🌷',
  '🌹',
  '🌺',
  '🌻',
  '🌼',
  '🌵',
  '🌴',
  '🎋',
  '🎄',
  '🌲',
  '🌳',
  '🦋',
];

const count = emojis.length;

export function genEmoji() {
  const index = Math.floor(Math.random() * count);
  return emojis[index];
}

export function genColor() {
  return 'hsl(' + 360 * Math.random() + ',' + (25 + 70 * Math.random()) + '%,' + (85 + 10 * Math.random()) + '%)';
}
