import { useState } from 'react';
import { Plus } from 'lucide-react';
import { IoWater } from 'react-icons/io5';
import { motion, AnimatePresence } from 'motion/react';

const UNITS = {
  vaso:    { label: 'Vaso',     ml: 250,  emoji: '🥛', plural: 'Vasos' },
  botella: { label: 'Botella',  ml: 500,  emoji: '🍶', plural: 'Botellas' },
  litro:   { label: 'Litro',    ml: 1000, emoji: '💧', plural: 'Litros' },
};

const getMsg = (glasses, goal) => {
  if (glasses === 0) return '¡Empezá a hidratarte! 💧';
  if (glasses >= goal) return '¡Meta cumplida! 🎉';
  const pct = glasses / goal;
  if (pct < 0.25) return 'Buen comienzo, seguí así 💧';
  if (pct < 0.5)  return '¡Ya cubrís un cuarto! 💪';
  if (pct < 0.75) return '¡Vas por la mitad! 🔥';
  return '¡Casi llegás! ⚡';
};

const fmtVol = (ml) => {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace('.0', '')}L`;
  return `${ml}ml`;
};

// Drop SVG icon
const DropIcon = ({ filled, size = 18 }) => (
  <svg width={size} height={Math.round(size * 1.22)} viewBox="0 0 18 22" fill="none">
    <path d="M9 1C9 1 1 9.5 1 14a8 8 0 0016 0C17 9.5 9 1 9 1Z"
      fill={filled ? 'var(--color-primary)' : 'var(--surface-3)'}
      stroke={filled ? 'rgba(0,201,255,0.5)' : 'var(--border-default)'}
      strokeWidth="1" />
  </svg>
);

// Bottle SVG icon
const BottleIcon = ({ filled }) => (
  <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
    <rect x="4" y="1" width="6" height="3" rx="1"
      fill={filled ? 'var(--color-primary)' : 'var(--surface-3)'}
      stroke={filled ? 'rgba(0,201,255,0.5)' : 'var(--border-default)'} strokeWidth="1"/>
    <path d="M2 6 Q1 8 1 10 L1 19 Q1 21 3 21 L11 21 Q13 21 13 19 L13 10 Q13 8 12 6 Z"
      fill={filled ? 'rgba(0,201,255,0.15)' : 'var(--surface-2)'}
      stroke={filled ? 'rgba(0,201,255,0.5)' : 'var(--border-default)'} strokeWidth="1"/>
    {filled && <rect x="1" y="13" width="12" height="8" rx="0"
      fill="var(--color-primary)" opacity="0.5"/>}
  </svg>
);

export default function HidratacionSection({ waterGlasses, waterGoal, onAddWater, onGoalChange, waterUnit = 'vaso', onUnitChange }) {
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const unit = UNITS[waterUnit] || UNITS.vaso;
  const safeGoal = Math.max(2, waterGoal || 8);
  const done = waterGlasses >= safeGoal;
  const pct = Math.min((waterGlasses / safeGoal) * 100, 100);

  // Volume display
  const totalMlConsumed = waterGlasses * unit.ml;
  const totalMlGoal = safeGoal * unit.ml;
  const volDisplay = `${fmtVol(totalMlConsumed)} / ${fmtVol(totalMlGoal)}`;

  // Display mode based on goal count
  const MAX_ICONS = 10; // max individual icons shown
  const showCompact = safeGoal > MAX_ICONS; // bar + count only

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <IoWater size={14} color="var(--color-primary)" /> HIDRATACIÓN
        </h3>

        {/* Unit picker + goal stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Unit selector */}
          <div style={{ position: 'relative' }}>
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowUnitPicker(s => !s)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.2rem 0.45rem', cursor: 'pointer', fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              {unit.emoji} {unit.label} ▾
            </motion.button>
            <AnimatePresence>
              {showUnitPicker && (
                <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '10px', overflow: 'hidden', zIndex: 50, minWidth: '110px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  {Object.entries(UNITS).map(([key, u]) => (
                    <button key={key} onClick={() => { onUnitChange?.(key); setShowUnitPicker(false); }}
                      style={{ width: '100%', padding: '0.45rem 0.75rem', background: waterUnit === key ? 'rgba(0,201,255,0.1)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.65rem', fontWeight: waterUnit === key ? 900 : 700, color: waterUnit === key ? 'var(--color-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {u.emoji} {u.label}
                      <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{u.ml}ml</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Goal stepper */}
          <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700 }}>Meta:</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onGoalChange?.(Math.max(2, safeGoal - 1))}
            style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</motion.button>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: done ? 'var(--color-success)' : 'var(--color-primary)', minWidth: '32px', textAlign: 'center' }}>
            {waterGlasses}/{safeGoal}
          </span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onGoalChange?.(Math.min(30, safeGoal + 1))}
            style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</motion.button>
        </div>
      </div>

      {/* Volume total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <AnimatePresence mode="wait">
          <motion.span key={`${waterGlasses}-${safeGoal}-${waterUnit}`}
            initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontSize: '0.62rem', color: done ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: 600 }}>
            {getMsg(waterGlasses, safeGoal)}
          </motion.span>
        </AnimatePresence>
        <span style={{ fontSize: '0.58rem', fontWeight: 800, color: done ? 'var(--color-success)' : 'var(--color-primary)', background: done ? 'rgba(34,197,94,0.08)' : 'rgba(0,201,255,0.08)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>
          {volDisplay}
        </span>
      </div>

      {/* Icons OR compact display */}
      {!showCompact ? (
        /* Individual icons (≤ 10 units) */
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
            {Array.from({ length: safeGoal }, (_, i) => {
              const filled = i < waterGlasses;
              return (
                <motion.button key={i}
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.03 + i * 0.03, type: 'spring', stiffness: 500, damping: 22 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={filled ? undefined : onAddWater}
                  style={{ flex: 1, minWidth: '28px', maxWidth: '48px', height: 38, borderRadius: '10px', cursor: filled ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: filled ? '1px solid rgba(0,201,255,0.3)' : '1px solid var(--color-border)', background: filled ? 'rgba(0,201,255,0.1)' : 'var(--surface-1)' }}>
                  {waterUnit === 'botella' ? <BottleIcon filled={filled} /> : <DropIcon filled={filled} />}
                </motion.button>
              );
            })}
          </div>
          <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.05 }}
            onClick={onAddWater} disabled={done}
            style={{ background: done ? 'rgba(34,197,94,0.15)' : 'rgba(0,201,255,0.12)', border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'rgba(0,201,255,0.25)'}`, borderRadius: '10px', padding: '0.5rem 0.75rem', cursor: done ? 'default' : 'pointer', color: done ? 'var(--color-success)' : 'var(--color-primary)', fontWeight: 900, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
            {done ? '✓' : <><Plus size={14} /> 1</>}
          </motion.button>
        </div>
      ) : (
        /* Compact display (> 10 units): big count + add button */
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Big visual count */}
          <div style={{ flex: 1, display: 'flex', gap: '0.15rem', flexWrap: 'wrap', maxHeight: '90px', overflow: 'hidden' }}>
            {Array.from({ length: Math.min(safeGoal, 20) }, (_, i) => {
              const filled = i < waterGlasses;
              return (
                <motion.div key={i}
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: i * 0.015, type: 'spring', stiffness: 600, damping: 25 }}
                  style={{ width: 18, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DropIcon filled={filled} size={14} />
                </motion.div>
              );
            })}
            {safeGoal > 20 && (
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, alignSelf: 'center', marginLeft: '0.2rem' }}>
                +{safeGoal - 20}
              </div>
            )}
          </div>

          {/* Count display */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: done ? 'var(--color-success)' : 'var(--color-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {waterGlasses}
            </div>
            <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 800 }}>de {safeGoal} {unit.plural.toLowerCase()}</div>
          </div>

          {/* Add button */}
          <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.05 }}
            onClick={onAddWater} disabled={done}
            style={{ background: done ? 'rgba(34,197,94,0.15)' : 'rgba(0,201,255,0.12)', border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'rgba(0,201,255,0.25)'}`, borderRadius: '12px', padding: '0.65rem 0.9rem', cursor: done ? 'default' : 'pointer', color: done ? 'var(--color-success)' : 'var(--color-primary)', fontWeight: 900, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
            {done ? '✓' : <><Plus size={14} /> {unit.emoji}</>}
          </motion.button>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginTop: '0.6rem', height: 4, background: 'var(--surface-hover)', borderRadius: 99, overflow: 'hidden' }}>
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
