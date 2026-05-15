import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { GiCookingPot, GiMeal } from 'react-icons/gi';
import { motion } from 'motion/react';
import API, { authFetch } from '../../config';

const FOOD_EMOJI_MAP = {
  huevo: '🥚', leche: '🥛', pollo: '🍗', carne: '🥩', pescado: '🐟', atun: '🐟', salmon: '🐠',
  papa: '🥔', arroz: '🍚', pasta: '🍝', fideos: '🍝', pan: '🍞', harina: '🌾', avena: '🥣',
  tomate: '🍅', lechuga: '🥬', zanahoria: '🥕', brocoli: '🥦', espinaca: '🥬', zapallo: '🎃',
  manzana: '🍎', banana: '🍌', naranja: '🍊', limon: '🍋', pera: '🍐', frutilla: '🍓',
  queso: '🧀', yogurt: '🫙', manteca: '🧈', crema: '🥛', aceite: '🫙', aceitunas: '🫒',
  ajo: '🧄', cebolla: '🧅', pimiento: '🫑', choclo: '🌽', lechuga: '🥗',
  lentejas: '🫘', porotos: '🫘', garbanzos: '🫘', soja: '🌿',
  proteina: '💪', whey: '💪', creatina: '💊', suplemento: '💊',
};

const getEmoji = (nombre) => {
  const lower = nombre.toLowerCase();
  return Object.entries(FOOD_EMOJI_MAP).find(([k]) => lower.includes(k))?.[1] || '🛒';
};

export default function AlacenaSection({ perfil, alacena, onRefresh, onSearchIngrediente, onShowToast, dietMode }) {
  const [newIngrediente, setNewIngrediente] = useState('');
  const [receta, setReceta] = useState('');
  const [loadingReceta, setLoadingReceta] = useState(false);

  const agregarAlacena = async () => {
    if (!newIngrediente.trim()) return;
    await authFetch(`${API}/api/alacena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfil, ingrediente: newIngrediente, cantidad: '' }),
    });
    setNewIngrediente('');
    onRefresh();
  };

  const eliminarAlacena = async (id) => {
    await authFetch(`${API}/api/alacena/${id}?perfil=${perfil}`, { method: 'DELETE' });
    onRefresh();
  };

  const pedirReceta = async () => {
    setLoadingReceta(true);
    setReceta('');
    try {
      const res = await authFetch(`${API}/api/alacena/receta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, diet_mode: dietMode }),
      });
      const data = await res.json();
      if (data.receta) setReceta(data.receta);
    } catch {}
    setLoadingReceta(false);
  };

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '1rem 1.1rem', borderLeft: '3px solid var(--color-kcal)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-kcal)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <GiCookingPot size={14} color="var(--color-kcal)" /> ALACENA
        </h3>
        {alacena.length > 0 && (
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button className="btn-elite"
              style={{ height: '1.8rem', padding: '0 0.6rem', fontSize: '0.58rem', background: 'rgba(245,158,11,0.12)', color: 'var(--color-kcal)', border: '1px solid rgba(245,158,11,0.25)' }}
              onClick={pedirReceta} disabled={loadingReceta}>
              {loadingReceta ? <Loader2 size={12} className="spin" /> : <><GiMeal size={12} /> RECETA</>}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <GiCookingPot size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }} />
          <input
            value={newIngrediente}
            onChange={e => setNewIngrediente(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarAlacena()}
            className="premium-input"
            placeholder="Agregar ingrediente..."
            style={{ width: '100%', height: '2.6rem', fontSize: '0.82rem', paddingLeft: '2.1rem' }}
          />
        </div>
        <motion.button whileTap={{ scale: 0.9 }} className="btn-elite"
          style={{ width: '2.6rem', height: '2.6rem', padding: 0, flexShrink: 0 }}
          onClick={agregarAlacena}>
          <Plus size={16} />
        </motion.button>
      </div>

      {alacena.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
          Agregá ingredientes — la IA te sugerirá recetas y qué comprar
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {alacena.map((item, aIdx) => (
            <motion.div key={item.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: aIdx * 0.03, type: 'spring', stiffness: 500, damping: 28 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface-3)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0.5rem 0.7rem' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{getEmoji(item.ingrediente)}</span>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => onSearchIngrediente?.(item.ingrediente)}
                style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', padding: 0 }}>
                {item.ingrediente}
              </motion.button>
              <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>BUSCAR →</span>
              <button onClick={() => eliminarAlacena(item.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.15rem', lineHeight: 1, flexShrink: 0 }}>
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {receta && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: '0.75rem', background: 'var(--surface-3)', padding: '0.85rem', borderRadius: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', borderLeft: '2px solid var(--color-kcal)' }}>
          {receta}
        </motion.div>
      )}
    </div>
  );
}
