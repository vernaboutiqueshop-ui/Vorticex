import { useState, useEffect } from 'react';
import { Target, History } from 'lucide-react';
import { GiTargetArrows } from 'react-icons/gi';
import { motion, AnimatePresence } from 'motion/react';

const DIET_PRESETS = {
  balanceada: { label: 'Balanceada', emoji: '⚖️', cal_goal: 2200, prot_goal: 150, carb_goal: 200, fat_goal: 70 },
  keto:    { label: 'Keto',     emoji: '🥑', cal_goal: 1800, prot_goal: 130, carb_goal: 30,  fat_goal: 140 },
  low_carb:{ label: 'Low Carb', emoji: '🥩', cal_goal: 2000, prot_goal: 160, carb_goal: 80,  fat_goal: 100 },
  volumen: { label: 'Volumen',  emoji: '💪', cal_goal: 2800, prot_goal: 200, carb_goal: 350, fat_goal: 80 },
  paleo:   { label: 'Paleo',    emoji: '🍖', cal_goal: 2100, prot_goal: 170, carb_goal: 100, fat_goal: 110 },
  mediterranea:{ label: 'Mediterránea', emoji: '🥗', cal_goal: 2100, prot_goal: 140, carb_goal: 200, fat_goal: 80 },
  if:      { label: 'Ayuno IF', emoji: '⏱',  cal_goal: null, prot_goal: null, carb_goal: null, fat_goal: null },
  sinTACC: { label: 'Sin TACC', emoji: '🌾',  cal_goal: null, prot_goal: null, carb_goal: null, fat_goal: null },
  vegana:  { label: 'Vegana',   emoji: '🌿',  cal_goal: null, prot_goal: null, carb_goal: null, fat_goal: null },
};

export default function BrujulaSection({ macrosHoy, metas, onSaveMetas, onNavigateTo, dietMode, onDietModeChange }) {
  const [showMetasEditor, setShowMetasEditor] = useState(false);
  const [localMetas, setLocalMetas] = useState(metas);

  useEffect(() => { setLocalMetas(metas); }, [metas]);

  const rings = [
    { label: 'KCAL', value: macrosHoy.calorias, goal: metas.cal_goal, color: 'var(--color-kcal)', colorHex: '#F59E0B', radius: 52 },
    { label: 'PROT', value: macrosHoy.proteinas, goal: metas.prot_goal, color: 'var(--color-prot)', colorHex: '#22C55E', radius: 42 },
    { label: 'CARB', value: macrosHoy.carbos,    goal: metas.carb_goal, color: 'var(--color-carb)', colorHex: '#00C9FF', radius: 32 },
    { label: 'GRAS', value: macrosHoy.grasas,    goal: metas.fat_goal,  color: 'var(--color-gras)', colorHex: '#A78BFA', radius: 22 },
  ];
  const nutriScore = Math.round(rings.reduce((sum, r) => {
    const pct = r.goal > 0 ? r.value / r.goal : 0;
    return sum + Math.max(0, 100 - Math.abs(1 - pct) * 100);
  }, 0) / rings.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <h3 style={{ color: 'var(--color-primary)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <GiTargetArrows size={14} /> BRÚJULA METABÓLICA
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {onNavigateTo && (
            <button onClick={() => onNavigateTo('graficos')}
              style={{ background: 'var(--surface-2)', border: 'none', color: 'var(--text-secondary)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.5rem', fontWeight: 800 }}>
              <History size={10} /> HISTORIAL
            </button>
          )}
          <button onClick={() => setShowMetasEditor(s => !s)}
            style={{ background: showMetasEditor ? 'rgba(0,201,255,0.12)' : 'var(--surface-2)', border: showMetasEditor ? '1px solid rgba(0,201,255,0.3)' : 'none', color: showMetasEditor ? 'var(--color-primary)' : 'var(--text-muted)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.5rem', fontWeight: 800 }}>
            <Target size={10} /> METAS
          </button>
        </div>
      </div>

      {/* Diet mode chips — estilo Gym tabs */}
      {/* Diet mode chips — estilo Gym tabs */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '14px', padding: '0.35rem', marginBottom: '0.85rem', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', scrollbarWidth: 'none', marginBottom: '0.4rem' }}>
          {Object.entries(DIET_PRESETS).map(([key, preset]) => {
            const active = dietMode === key;
            return (
              <motion.button key={key} whileTap={{ scale: 0.93 }}
                onClick={() => onDietModeChange(active ? null : key, preset)}
                style={{
                  flexShrink: 0, padding: '0.4rem 0.75rem', borderRadius: '10px', cursor: 'pointer', border: 'none',
                  fontSize: '0.62rem', fontWeight: 800, whiteSpace: 'nowrap',
                  background: active ? 'var(--color-primary)' : 'var(--surface-3)',
                  color: active ? '#000' : 'var(--text-muted)',
                  boxShadow: active ? '0 4px 12px rgba(6, 182, 212, 0.25)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                {preset.emoji} {preset.label}
              </motion.button>
            );
          })}
        </div>
        
        <AnimatePresence mode="wait">
          {dietMode && (
            <motion.div 
              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.4rem', 
                padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' 
              }}>
              <span style={{ fontSize: '0.68rem' }}>{DIET_PRESETS[dietMode]?.emoji}</span>
              <span style={{ fontSize: '0.58rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                Modo {DIET_PRESETS[dietMode]?.label}:
              </span>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {dietMode === 'balanceada' && 'Estilo de vida sostenible y equilibrado ⚖️'}
                {dietMode === 'keto' && 'Maximizando quema de grasas y cetosis 🥑'}
                {dietMode === 'low_carb' && 'Control de glucemia y saciedad activa 🥩'}
                {dietMode === 'volumen' && 'Superávit calórico para construcción muscular 💪'}
                {dietMode === 'paleo' && 'Alimentación basada en raíces ancestrales 🍖'}
                {dietMode === 'if' && 'Respetando ventanas de ayuno intermitente ⏱'}
                {dietMode === 'sinTACC' && 'Garantizando una dieta 100% libre de gluten 🌾'}
                {dietMode === 'vegana' && 'Energía pura a base de plantas y semillas 🌿'}
                {dietMode === 'mediterranea' && 'Salud cardiovascular con grasas buenas 🥗'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Metas editor */}
      {showMetasEditor && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem', overflow: 'hidden' }}>
          {[
            { key: 'cal_goal',  label: 'Kcal',      unit: 'kcal' },
            { key: 'prot_goal', label: 'Proteínas', unit: 'g' },
            { key: 'carb_goal', label: 'Carbos',    unit: 'g' },
            { key: 'fat_goal',  label: 'Grasas',    unit: 'g' },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, width: '70px' }}>{f.label}</span>
              <input type="number" value={localMetas[f.key]}
                onChange={e => setLocalMetas(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                className="premium-input" style={{ flex: 1, height: '2rem', fontSize: '0.75rem', textAlign: 'center' }} />
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', width: '25px' }}>{f.unit}</span>
            </div>
          ))}
          <button onClick={() => { onSaveMetas(localMetas); setShowMetasEditor(false); }}
            className="btn-elite" style={{ width: '100%', height: '2rem', fontSize: '0.7rem', marginTop: '0.3rem' }}>
            GUARDAR METAS
          </button>
        </motion.div>
      )}

      {/* Tip cuando metas son default y sin datos */}
      {metas.cal_goal === 2200 && metas.prot_goal === 150 && !showMetasEditor && macrosHoy.calorias === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => setShowMetasEditor(true)}
          style={{ background: 'rgba(0,201,255,0.06)', border: '1px dashed rgba(0,201,255,0.2)', borderRadius: '10px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={14} color="var(--color-primary)" />
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-primary)' }}>Configurá tus metas diarias</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Tocá para ajustar kcal, proteína, carbos y grasas según tu objetivo</div>
          </div>
        </motion.div>
      )}

      {/* Rings + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            {rings.map((r, i) => {
              const circ = 2 * Math.PI * r.radius;
              const pct = r.goal > 0 ? Math.min(r.value / r.goal, 1.5) : 0;
              return (
                <g key={i}>
                  <circle cx="60" cy="60" r={r.radius} fill="none" stroke="var(--surface-hover)" strokeWidth="6" />
                  <motion.circle
                    cx="60" cy="60" r={r.radius} fill="none" stroke={r.color} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ * (1 - pct) }}
                    transition={{ duration: 1.2, delay: 0.2 + i * 0.15, ease: 'easeOut' }}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', filter: `drop-shadow(0 0 5px ${r.colorHex}60)` }}
                  />
                </g>
              );
            })}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }}
              style={{ fontSize: '1.3rem', fontWeight: 900, color: nutriScore >= 80 ? 'var(--color-prot)' : nutriScore >= 50 ? 'var(--color-kcal)' : '#ef4444', lineHeight: 1 }}>
              {nutriScore}
            </motion.div>
            <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 800, marginTop: '0.1rem' }}>SCORE</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {rings.map((r, i) => {
            const pct = r.goal > 0 ? Math.round((r.value / r.goal) * 100) : 0;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, width: '30px' }}>{r.label}</span>
                <div style={{ flex: 1, height: 4, background: 'var(--surface-hover)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    style={{ height: '100%', borderRadius: 99, background: r.color }} />
                </div>
                <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 900, width: '35px', textAlign: 'right' }}>
                  {r.label === 'KCAL' ? Math.round(r.value) : `${Math.round(r.value)}g`}
                </span>
                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
