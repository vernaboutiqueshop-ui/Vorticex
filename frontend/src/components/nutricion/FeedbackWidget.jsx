import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../../config';

/**
 * Reusable +1 / -1 feedback widget for any AI-generated content.
 * Props:
 *   perfil      - current user
 *   itemType    - 'recipe' | 'food_search' | 'photo' | 'chat'
 *   itemKey     - unique name/id for the item being rated
 *   context     - optional metadata object (diet_mode, ingredients, etc)
 *   size        - 'sm' | 'md' (default 'sm')
 *   onFeedback  - optional callback(score) after rating
 */
export default function FeedbackWidget({ perfil, itemType, itemKey, context, size = 'sm', onFeedback }) {
  const [vote, setVote] = useState(null); // null | 1 | -1
  const [submitting, setSubmitting] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  const iconSize = size === 'md' ? 14 : 11;
  const btnStyle = (v) => ({
    background: vote === v
      ? (v === 1 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)')
      : 'var(--surface-1)',
    border: vote === v
      ? `1px solid ${v === 1 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.35)'}`
      : '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: size === 'md' ? '0.3rem 0.5rem' : '0.2rem 0.4rem',
    cursor: submitting ? 'default' : 'pointer',
    color: vote === v
      ? (v === 1 ? 'var(--color-prot)' : '#ef4444')
      : 'var(--text-muted)',
    display: 'flex', alignItems: 'center', gap: '0.2rem',
    fontSize: size === 'md' ? '0.6rem' : '0.5rem',
    fontWeight: 800,
    transition: 'all 0.15s',
    opacity: submitting ? 0.6 : 1,
  });

  const submit = async (score) => {
    if (submitting || vote === score) return;
    setSubmitting(true);
    try {
      await authFetch(`${API}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, item_type: itemType, item_key: itemKey, score, context: context || {} }),
      });
      setVote(score);
      setShowThanks(true);
      onFeedback?.(score);
      setTimeout(() => setShowThanks(false), 1800);
    } catch {}
    setSubmitting(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <AnimatePresence>
        {showThanks && (
          <motion.span
            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            style={{ fontSize: '0.5rem', color: vote === 1 ? 'var(--color-prot)' : '#ef4444', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {vote === 1 ? '¡Gracias! 👍' : 'Anotado 👎'}
          </motion.span>
        )}
      </AnimatePresence>
      <motion.button whileTap={{ scale: 0.88 }} onClick={() => submit(1)} style={btnStyle(1)} disabled={submitting}>
        <ThumbsUp size={iconSize} />
        {size === 'md' && <span>Útil</span>}
      </motion.button>
      <motion.button whileTap={{ scale: 0.88 }} onClick={() => submit(-1)} style={btnStyle(-1)} disabled={submitting}>
        <ThumbsDown size={iconSize} />
        {size === 'md' && <span>No sirvió</span>}
      </motion.button>
    </div>
  );
}
