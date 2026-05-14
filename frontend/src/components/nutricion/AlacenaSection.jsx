import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { GiCookingPot, GiMeal } from 'react-icons/gi';
import { motion } from 'motion/react';
import API, { authFetch } from '../../config';

export default function AlacenaSection({ perfil, alacena, onRefresh, onSearchIngrediente, onShowToast }) {
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
        body: JSON.stringify({ perfil }),
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
          <button className="btn-elite"
            style={{ height: '1.8rem', padding: '0 0.6rem', fontSize: '0.58rem', background: 'rgba(245,158,11,0.12)', color: 'var(--color-kcal)', border: '1px solid rgba(245,158,11,0.25)' }}
            onClick={pedirReceta} disabled={loadingReceta}>
            {loadingReceta ? <Loader2 size={12} className="spin" /> : <><GiMeal size={12} /> SUGERIR RECETA</>}
          </button>
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
          Tu alacena está vacía — agregá ingredientes para obtener recetas personalizadas
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {alacena.map((item, aIdx) => (
            <motion.div key={item.id}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: aIdx * 0.03, type: 'spring', stiffness: 500, damping: 28 }}
              style={{ display: 'flex', alignItems: 'center', borderRadius: '20px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border-subtle)' }}>
              <motion.button whileTap={{ scale: 0.94 }}
                onClick={() => onSearchIngrediente?.(item.ingrediente)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.35rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {item.ingrediente}
              </motion.button>
              <button onClick={() => eliminarAlacena(item.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem 0.45rem 0.35rem 0', lineHeight: 1 }}>
                <X size={11} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {receta && (
        <div style={{ marginTop: '0.75rem', background: 'var(--surface-3)', padding: '0.85rem', borderRadius: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', borderLeft: '2px solid var(--color-kcal)' }}>
          {receta}
        </div>
      )}
    </div>
  );
}
