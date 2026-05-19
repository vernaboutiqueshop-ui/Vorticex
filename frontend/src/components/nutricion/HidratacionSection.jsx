import { Plus } from 'lucide-react';
import { IoWater } from 'react-icons/io5';
import { motion, AnimatePresence } from 'motion/react';

const getMsg = (glasses, goal) => {
  if (glasses === 0) return '¡Empezá a hidratarte! 💧';
  if (glasses >= goal) return '¡Meta cumplida! 🎉';
  const pct = glasses / goal;
  if (pct < 0.25) return 'Buen comienzo, seguí así 💧';
  if (pct < 0.5)  return '¡Ya cubrís un cuarto! 💪';
  if (pct < 0.75) return '¡Vas por la mitad! 🔥';
  return '¡Casi llegás! ⚡';
};

export default function HidratacionSection({ waterGlasses, waterGoal, onAddWater, onGoalChange }) {
  const safeGoal = Math.max(2, waterGoal || 8); // never less than 2
  const pct = Math.min((waterGlasses / safeGoal) * 100, 100);
  const done = waterGlasses >= safeGoal;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <IoWater size={14} color="var(--color-primary)" /> HIDRATACIÓN
        </h3>
        {/* Inline goal stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700 }}>Meta:</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onGoalChange?.(Math.max(2, safeGoal - 1))}
            style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>-</motion.button>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: done ? 'var(--color-success)' : 'var(--color-primary)', minWidth: '32px', textAlign: 'center' }}>{waterGlasses}/{safeGoal}</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onGoalChange?.(Math.min(20, safeGoal + 1))}
            style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={`${waterGlasses}-${safeGoal}`}
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{ fontSize: '0.62rem', color: done ? 'var(--color-success)' : 'var(--text-muted)', marginBottom: '0.65rem', fontWeight: 600, margin: '0 0 0.65rem' }}>
          {getMsg(waterGlasses, safeGoal)}
        </motion.p>
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ flex: 1, display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {Array.from({ length: safeGoal }, (_, i) => {
            const filled = i < waterGlasses;
            return (
              <motion.button key={i}
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.05 + i * 0.04, type: 'spring', stiffness: 500, damping: 22 }}
                whileTap={{ scale: 0.8 }}
                onClick={filled ? undefined : onAddWater}
                style={{
                  flex: 1, height: 38, borderRadius: '10px', cursor: filled ? 'default' : 'pointer',
                  padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: filled ? '1px solid rgba(0,201,255,0.3)' : '1px solid var(--color-border)',
                  background: filled ? 'rgba(0,201,255,0.1)' : 'var(--surface-1)',
                }}>
                <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                  <path d="M9 1C9 1 1 9.5 1 14a8 8 0 0016 0C17 9.5 9 1 9 1Z"
                    fill={filled ? 'var(--color-primary)' : 'var(--surface-3)'}
                    stroke={filled ? 'rgba(0,201,255,0.5)' : 'var(--border-default)'}
                    strokeWidth="1" />
                </svg>
              </motion.button>
            );
          })}
        </div>
        <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.05 }}
          onClick={onAddWater}
          disabled={done}
          style={{
            background: done ? 'rgba(34,197,94,0.15)' : 'rgba(0,201,255,0.12)',
            border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'rgba(0,201,255,0.25)'}`,
            borderRadius: '10px', padding: '0.5rem 0.75rem', cursor: done ? 'default' : 'pointer',
            color: done ? 'var(--color-success)' : 'var(--color-primary)',
            fontWeight: 900, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0,
          }}>
          {done ? '✓' : <><Plus size={14} /> 1</>}
        </motion.button>
      </div>

      <div style={{ marginTop: '0.6rem', height: 3, background: 'var(--surface-hover)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: done ? 'var(--color-success)' : 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }}
        />
      </div>
    </motion.div>
  );
}
