import { useState, useEffect } from 'react';
import { Plus, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { GiCookingPot } from 'react-icons/gi';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../../config';
import FeedbackWidget from './FeedbackWidget';

const FOOD_EMOJI_MAP = {
  huevo: '🥚', leche: '🥛', pollo: '🍗', carne: '🥩', pescado: '🐟', atun: '🐟', salmon: '🐠',
  papa: '🥔', arroz: '🍚', pasta: '🍝', fideos: '🍝', pan: '🍞', harina: '🌾', avena: '🥣',
  tomate: '🍅', lechuga: '🥬', zanahoria: '🥕', brocoli: '🥦', espinaca: '🥬', zapallo: '🎃',
  manzana: '🍎', banana: '🍌', naranja: '🍊', limon: '🍋', pera: '🍐', frutilla: '🍓',
  queso: '🧀', yogurt: '🫙', manteca: '🧈', crema: '🥛', aceite: '🫙', aceitunas: '🫒',
  ajo: '🧄', cebolla: '🧅', pimiento: '🫑', choclo: '🌽',
  lentejas: '🫘', porotos: '🫘', garbanzos: '🫘', soja: '🌿',
  proteina: '💪', whey: '💪', creatina: '💊', suplemento: '💊',
};

const getEmoji = (nombre) => {
  const lower = nombre.toLowerCase();
  return Object.entries(FOOD_EMOJI_MAP).find(([k]) => lower.includes(k))?.[1] || '🛒';
};

const DIFICULTAD_COLOR = { 'Fácil': 'var(--color-prot)', 'Media': 'var(--color-kcal)', 'Difícil': '#ef4444' };

function RecetaCard({ receta, onLog, idx, perfil, ingredients }) {
  const [open, setOpen] = useState(false);

  const handleLog = () => {
    onLog?.({
      nombre: receta.nombre,
      kcal: receta.kcal,
      proteinas: receta.proteinas,
      carbos: receta.carbos,
      grasas: receta.grasas,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05, type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        background: 'var(--surface-3)', border: '1px solid var(--border-subtle)',
        borderRadius: '14px', overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '0.65rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{receta.emoji || '🍳'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {receta.nombre}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--color-kcal)' }}>{Math.round(receta.kcal)} kcal</span>
            <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '0.52rem', fontWeight: 700, color: 'var(--color-prot)' }}>P {Math.round(receta.proteinas)}g</span>
            <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '0.52rem', fontWeight: 700, color: 'var(--color-carb)' }}>C {Math.round(receta.carbos)}g</span>
            <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '0.52rem', fontWeight: 700, color: 'var(--color-gras)' }}>G {Math.round(receta.grasas)}g</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.48rem', fontWeight: 800, color: DIFICULTAD_COLOR[receta.dificultad] || 'var(--text-muted)', background: 'var(--surface-1)', padding: '0.1rem 0.35rem', borderRadius: '6px' }}>
            {receta.dificultad}
          </span>
          <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.48rem', color: 'var(--text-muted)' }}>{receta.tiempo_min}min</span>
            {receta.community_score > 0 && (
              <span style={{ fontSize: '0.45rem', color: 'var(--color-prot)', fontWeight: 900 }}>+{receta.community_score}</span>
            )}
            {receta.community_score < 0 && (
              <span style={{ fontSize: '0.45rem', color: '#ef4444', fontWeight: 900 }}>{receta.community_score}</span>
            )}
          </div>
        </div>
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>

      {/* Expanded steps */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border-subtle)' }}
          >
            <div style={{ padding: '0.65rem 0.75rem' }}>
              {receta.ingredientes_usados?.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.25rem', letterSpacing: '0.5px' }}>INGREDIENTES</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {receta.ingredientes_usados.map((ing, i) => (
                      <span key={i} style={{ fontSize: '0.6rem', background: 'var(--surface-1)', padding: '0.1rem 0.4rem', borderRadius: '8px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        {getEmoji(ing)} {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {receta.pasos?.length > 0 && (
                <div style={{ marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.3rem', letterSpacing: '0.5px' }}>PREPARACIÓN</div>
                  <ol style={{ margin: 0, paddingLeft: '1rem' }}>
                    {receta.pasos.map((paso, i) => (
                      <li key={i} style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', lineHeight: 1.5 }}>{paso}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleLog}
                  className="btn-elite"
                  style={{ flex: 1, height: '2rem', fontSize: '0.62rem' }}>
                  + Registrar
                </motion.button>
                <FeedbackWidget
                  perfil={perfil}
                  itemType="recipe"
                  itemKey={receta.nombre}
                  context={{ diet_mode: null, ingredients }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AlacenaSection({ perfil, alacena, onRefresh, onSearchIngrediente, onShowToast, dietMode, onLogFood }) {
  const [newIngrediente, setNewIngrediente] = useState('');
  const [recetas, setRecetas] = useState([]);
  const [loadingRecetas, setLoadingRecetas] = useState(false);
  const [recetasSource, setRecetasSource] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set()); // ingredient IDs selected for recipe search

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedIngredients = alacena
    .filter(i => selectedIds.size === 0 || selectedIds.has(i.id))
    .map(i => i.ingrediente);

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

  // Sentido común: Si cambian los ingredientes, las recetas viejas ya no valen.
  useEffect(() => {
    if (recetas.length > 0) {
      setRecetas([]);
      setRecetasSource(null);
    }
  }, [alacena.length]);

  const pedirRecetas = async () => {
    setLoadingRecetas(true);
    setRecetas([]);
    try {
      const ingsToSearch = selectedIds.size > 0
        ? alacena.filter(i => selectedIds.has(i.id)).map(i => i.ingrediente)
        : alacena.map(i => i.ingrediente);
      const res = await authFetch(`${API}/api/alacena/recetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, diet_mode: dietMode, ingredientes_seleccionados: ingsToSearch }),
      });
      const data = await res.json();
      if (data.recetas?.length) {
        setRecetas(data.recetas);
        setRecetasSource(data.source);
      } else {
        onShowToast?.('No se pudieron generar recetas', 'error');
      }
    } catch {
      onShowToast?.('Error de conexión', 'error');
    }
    setLoadingRecetas(false);
  };

  const handleLogFood = (receta) => {
    onLogFood?.({
      alimento: receta.nombre,
      calorias: receta.kcal,
      proteinas: receta.proteinas,
      carbos: receta.carbos,
      grasas: receta.grasas,
      descripcion: receta.nombre,
    });
    onShowToast?.(`${receta.nombre} registrado`, 'success');
  };

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '1rem 1.1rem', borderLeft: '3px solid var(--color-kcal)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-kcal)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <GiCookingPot size={14} color="var(--color-kcal)" /> ALACENA
        </h3>
        {alacena.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {selectedIds.size > 0 && (
              <span style={{ fontSize: '0.48rem', color: 'var(--color-kcal)', fontWeight: 800 }}>
                {selectedIds.size}/{alacena.length} sel.
              </span>
            )}
            <motion.button whileTap={{ scale: 0.93 }}
              className="btn-elite"
              style={{ height: '1.8rem', padding: '0 0.65rem', fontSize: '0.58rem', background: 'rgba(245,158,11,0.12)', color: 'var(--color-kcal)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={pedirRecetas} disabled={loadingRecetas}>
              {loadingRecetas ? <Loader2 size={12} className="spin" /> : (
                <>🍽 {selectedIds.size > 0 ? `RECETAS (${selectedIds.size})` : 'VER RECETAS'}</>
              )}
            </motion.button>
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
          Agregá ingredientes — seleccionalos y generá recetas con los que tengas
        </div>
      ) : (
        <>
          {alacena.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.3rem' }}>
              <button onClick={() => setSelectedIds(selectedIds.size === alacena.length ? new Set() : new Set(alacena.map(i => i.id)))}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.5rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                {selectedIds.size === alacena.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {alacena.map((item, aIdx) => {
              const selected = selectedIds.has(item.id);
              return (
                <motion.div key={item.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: aIdx * 0.03, type: 'spring', stiffness: 500, damping: 28 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: selected ? 'rgba(245,158,11,0.08)' : 'var(--surface-3)',
                    border: `1px solid ${selected ? 'rgba(245,158,11,0.35)' : 'var(--border-subtle)'}`,
                    borderRadius: '12px', padding: '0.45rem 0.65rem',
                    transition: 'all 0.18s',
                  }}>
                  {/* Toggle selection — click emoji/name area */}
                  <motion.button whileTap={{ scale: 0.93 }}
                    onClick={() => toggleSelected(item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                    {/* Checkbox indicator */}
                    <div style={{
                      width: 20, height: 20, borderRadius: '6px', flexShrink: 0,
                      background: selected ? 'rgba(245,158,11,0.2)' : 'var(--surface-2)',
                      border: `1.5px solid ${selected ? 'rgba(245,158,11,0.6)' : 'var(--border-subtle)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', transition: 'all 0.15s',
                    }}>
                      {selected ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{getEmoji(item.ingrediente)}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: selected ? 900 : 700, color: selected ? 'var(--color-kcal)' : 'var(--text-primary)' }}>
                      {item.ingrediente}
                    </span>
                  </motion.button>

                  {/* Search in log button */}
                  <motion.button whileTap={{ scale: 0.88 }}
                    onClick={() => onSearchIngrediente?.(item.ingrediente)}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: '7px', padding: '0.22rem 0.4rem', cursor: 'pointer', fontSize: '0.45rem', fontWeight: 800, color: 'var(--text-muted)', flexShrink: 0 }}>
                    LOG →
                  </motion.button>

                  <button onClick={() => eliminarAlacena(item.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem', lineHeight: 1, flexShrink: 0, opacity: 0.6 }}>
                    <X size={11} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Recipe cards */}
      <AnimatePresence>
        {recetas.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--color-kcal)', letterSpacing: '0.5px' }}>
                {recetas.length} RECETAS {recetasSource === 'cache' ? '· GUARDADAS' : '· GENERADAS POR IA'}
              </span>
              <button onClick={() => setRecetas([])}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.6rem' }}>
                cerrar ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {recetas.map((r, i) => (
                <RecetaCard key={r.id || i} receta={r} idx={i} onLog={handleLogFood}
                  perfil={perfil} ingredients={alacena.map(a => a.ingrediente)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
