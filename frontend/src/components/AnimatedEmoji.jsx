import { Player } from '@lottiefiles/react-lottie-player';
import { useState } from 'react';

const NOTO_CDN = 'https://fonts.gstatic.com/s/e/notoemoji/latest';

// Codepoints for Google Noto Animated Emojis CDN
// Some emojis need _fe0f (variation selector) or _200d compound sequences
const EMOJI_CODEPOINTS = {
  '⚽': '26bd',
  '🏊': '1f3ca',
  '🏃': '1f3c3',
  '🚴': '1f6b4',
  '🎾': '1f3be',
  '🏀': '1f3c0',
  '🥊': '1f94a',
  '🏉': '1f3c9',
  '🧘': '1f9d8',
  '🏓': '1f3d3',
  '🏋️': '1f3cb_fe0f',
  '🚶': '1f6b6',
  '🏒': '1f3d2',
  '🏐': '1f3d0',
  '🏄': '1f3c4',
  '🧗': '1f9d7',
  '🥾': '1f97e',
  '💃': '1f483',
  '🥋': '1f94b',
  '⛸️': '26f8_fe0f',
  '🚣': '1f6a3',
  '⛷️': '26f7_fe0f',
  '⛳': '26f3',
  '🎯': '1f3af',
  '🏹': '1f3f9',
  '🤸': '1f938',
  '🏇': '1f3c7',
  '🤾': '1f93e',
  '🏌️': '1f3cc_fe0f',
  '🎿': '1f3bf',
  '⚡': '26a1',
  '🔥': '1f525',
  '⭐': '2b50',
  '💪': '1f4aa',
  '🏆': '1f3c6',
  '✅': '2705',
  '❤️': '2764_fe0f',
  '🍎': '1f34e',
  '🥗': '1f957',
  '🥩': '1f969',
};

export function getAnimatedEmojiUrl(emoji, format = 'lottie') {
  const code = EMOJI_CODEPOINTS[emoji];
  if (!code) return null;
  if (format === 'lottie') return `${NOTO_CDN}/${code}/lottie.json`;
  if (format === 'webp') return `${NOTO_CDN}/${code}/512.webp`;
  return null;
}

export default function AnimatedEmoji({ emoji, size = 32, loop = true, autoplay = true, style = {} }) {
  const [format, setFormat] = useState('lottie');
  const [failed, setFailed] = useState(false);
  const url = getAnimatedEmojiUrl(emoji, format);

  if (!url || failed) {
    return (
      <span style={{ fontSize: size * 0.75, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, ...style }}>
        {emoji}
      </span>
    );
  }

  // Try lottie first, fallback to webp, then static
  if (format === 'webp') {
    return (
      <img
        src={url}
        alt={emoji}
        width={size}
        height={size}
        style={{ objectFit: 'contain', ...style }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Player
      src={url}
      autoplay={autoplay}
      loop={loop}
      style={{ width: size, height: size, ...style }}
      onEvent={(event) => {
        if (event === 'error') setFormat('webp');
      }}
    />
  );
}
