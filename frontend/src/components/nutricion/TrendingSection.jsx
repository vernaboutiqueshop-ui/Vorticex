import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import API, { authFetch } from '../../config';

const FOOD_EMOJI_MAP = {
  huevo: '🥚', leche: '🥛', pollo: '🍗', carne: '🥩', pescado: '🐟', atun: '🐟',
  arroz: '🍚', pasta: '🍝', fideos: '🍝', pan: '🍞', avena: '🥣',
  tomate: '🍅', lechuga: '🥬', zanahoria: '🥕', brocoli: '🥦', espinaca: '🥬',
  manzana: '🍎', banana: '🍌', naranja: '🍊', pera: '🍐',
  queso: '🧀', yogurt: '🫙', manteca: '🧈', aceite: '🫙',
  lentejas: '🫘', garbanzos: '🫘', proteina: '💪', whey: '💪',
  salmon: '🐠', tuna: '🐟', papa: '🥔', batata: '🍠',
  cafe: '☕', mate: '🧉', agua: '💧', jugo: '🥤',
};

const getEmoji = (nombre) => {
  const lower = nombre.toLowerCase();
  return Object.entries(FOOD_EMOJI_MAP).find(([k]) => lower.includes(k))?.[1] || '🍽';
};

const BAR_COLORS = [
  'var(--color-primary)', 'var(--color-prot)', 'var(--color-kcal)',
  'var(--color-gras)', 'var(--color-carb)', 'rgba(251,146,60,0.9)',
  'rgba(236,72,153,0.9)', 'rgba(167,139,250,0.9)', 'rgba(34,211,238,0.9)', 'rgba(74,222,128,0.9)',
];

export default function TrendingSection({ onSearchFood }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(7);

  const fetchTrending = async (d = dias) => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/nutricion/trending?dias=${d}&limit=10`);
      const data = await res.json();
      if (data.trending) setTrending(data.trending);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTrending(); }, []);

  const maxVeces = trending[0]?.veces || 1;

  if (!loading && trending.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      style={{
        background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: '1rem 1.1rem',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <TrendingUp size={14} color="var(--color-primary)" /> TENDENCIAS DE LA COMUNIDAD
        </h3>
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => { setDias(d); fetchTrending(d); }}
              style={{
                padding: '0.18rem 0.45rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: dias === d ? 'rgba(0,201,255,0.15)' : 'var(--surface-2)',
                color: dias === d ? 'var(--color-primary)' : 'var(--text-muted)',
                fontSize: '0.48rem', fontWeight: 900,
              }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 28, background: 'var(--surface-2)', borderRadius: 8, opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {trending.map((item, i) => (
            <motion.button
              key={item.nombre}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 28 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSearchFood?.(item.nombre)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left', padding: 0, width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Rank */}
                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: i < 3 ? BAR_COLORS[i] : 'var(--text-muted)', minWidth: '14px', textAlign: 'right' }}>
                  {i + 1}
                </span>
                {/* Emoji */}
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{getEmoji(item.nombre)}</span>
                {/* Name + bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.18rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                      {item.nombre}
                    </span>
                    <span style={{ fontSize: '0.48rem', color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
                      {item.veces}× · {item.usuarios} {item.usuarios === 1 ? 'usuario' : 'usuarios'}
                      {item.kcal_promedio > 0 && ` · ~${Math.round(item.kcal_promedio)} kcal`}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, background: 'var(--surface-hover)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.veces / maxVeces) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 99, background: BAR_COLORS[i % BAR_COLORS.length] }}
                    />
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <div style={{ marginTop: '0.65rem', fontSize: '0.48rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
        Tocá un alimento para buscarlo • Datos anónimos de la comunidad
      </div>
    </motion.div>
  );
}
