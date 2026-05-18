import { useState, useEffect } from 'react';
import { Plus, X, Loader2, ChevronDown, ChevronUp, Sparkles, Save } from 'lucide-react';
import { GiCookingPot } from 'react-icons/gi';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../../config';
import FeedbackWidget from './FeedbackWidget';

const MAX_RECETAS = 40;
const PAGE_SIZE = 1; // 1 card at a time — true horizontal swipe

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

function RecetaCard({ receta, onLog, idx, perfil, ingredients, forceOpen = false }) {
  const [open, setOpen] = useState(forceOpen);

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
  const [allRecetas, setAllRecetas] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [slideDir, setSlideDir] = useState(1); // 1=forward, -1=backward
  const [loadingRecetas, setLoadingRecetas] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Add-recipe form
  const [showAddForm, setShowAddForm] = useState(false);
  const [customRecipe, setCustomRecipe] = useState({ nombre: '', kcal: '', proteinas: '', carbos: '', grasas: '', tiempo_min: 20, dificultad: 'Facil', pasos: ['', '', ''], emoji: '🍳' });
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

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

  // Reset cuando cambia la selección de ingredientes
  useEffect(() => {
    if (allRecetas.length > 0) {
      setAllRecetas([]);
      setCurrentPage(0);
      setShowAddForm(false);
      setValidationResult(null);
    }
  }, [alacena.length, selectedIds.size]);

  const getIngredientesSeleccionados = () =>
    selectedIds.size > 0
      ? alacena.filter(i => selectedIds.has(i.id)).map(i => i.ingrediente)
      : alacena.map(i => i.ingrediente);

  const fetchRecetas = async (existing = []) => {
    const ingsToSearch = getIngredientesSeleccionados();
    const exclude_names = existing.map(r => r.nombre);
    const res = await authFetch(`${API}/api/alacena/recetas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        perfil, diet_mode: dietMode,
        ingredientes_seleccionados: ingsToSearch,
        exclude_names,
      }),
    });
    const data = await res.json();
    return data.recetas || [];
  };

  const totalPages = Math.ceil(allRecetas.length / PAGE_SIZE);

  const pedirRecetas = async () => {
    setLoadingRecetas(true);
    setAllRecetas([]);
    setCurrentPage(0);
    setShowAddForm(false);
    setValidationResult(null);
    try {
      const nuevas = await fetchRecetas([]);
      if (nuevas.length) setAllRecetas(nuevas);
      else onShowToast?.('No se pudieron generar recetas', 'error');
    } catch { onShowToast?.('Error de conexión', 'error'); }
    setLoadingRecetas(false);
  };

  const cargarMas = async () => {
    if (allRecetas.length >= MAX_RECETAS) return;
    setLoadingMore(true);
    try {
      const nuevas = await fetchRecetas(allRecetas);
      const combined = [...allRecetas, ...nuevas].slice(0, MAX_RECETAS);
      setAllRecetas(combined);
      // Go to first new page
      const newPage = Math.floor(allRecetas.length / PAGE_SIZE);
      setSlideDir(1);
      setCurrentPage(newPage);
      if (combined.length >= MAX_RECETAS) setShowAddForm(true);
    } catch {}
    setLoadingMore(false);
  };

  const goNext = () => {
    if (currentPage < allRecetas.length - 1) {
      setSlideDir(1);
      setCurrentPage(p => p + 1);
    } else if (allRecetas.length < MAX_RECETAS) {
      cargarMas();
    } else {
      setShowAddForm(true);
    }
  };

  const goPrev = () => {
    if (currentPage > 0) {
      setSlideDir(-1);
      setCurrentPage(p => p - 1);
    }
  };

  const validarRecetaCustom = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await authFetch(`${API}/api/alacena/receta/validar-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfil,
          ...customRecipe,
          kcal: parseFloat(customRecipe.kcal) || 0,
          proteinas: parseFloat(customRecipe.proteinas) || 0,
          carbos: parseFloat(customRecipe.carbos) || 0,
          grasas: parseFloat(customRecipe.grasas) || 0,
          ingredientes_usados: getIngredientesSeleccionados(),
          pasos: customRecipe.pasos.filter(p => p.trim()),
        }),
      });
      const data = await res.json();
      setValidationResult(data);
      if (data.guardada) {
        onShowToast?.('Receta guardada y validada por IA', 'success');
        setShowAddForm(false);
        setCustomRecipe({ nombre: '', kcal: '', proteinas: '', carbos: '', grasas: '', tiempo_min: 20, dificultad: 'Facil', pasos: ['', '', ''], emoji: '🍳' });
      }
    } catch { onShowToast?.('Error validando', 'error'); }
    setValidating(false);
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

      {/* Recipe carousel — 1 card at a time, swipe horizontal */}
      <AnimatePresence>
        {allRecetas.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: '0.85rem' }}>

            {/* Header: X de N + close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-kcal)' }}>
                  {currentPage + 1}
                </span>
                <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  de {allRecetas.length} recetas
                </span>
              </div>
              <button onClick={() => { setAllRecetas([]); setCurrentPage(0); setShowAddForm(false); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.6rem' }}>
                cerrar ×
              </button>
            </div>

            {/* Single card with horizontal slide */}
            <div style={{ overflow: 'hidden' }}>
              <AnimatePresence mode="wait" custom={slideDir}>
                <motion.div
                  key={currentPage}
                  custom={slideDir}
                  initial={{ x: slideDir * '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -slideDir * '100%', opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                >
                  <RecetaCard
                    receta={allRecetas[currentPage]}
                    idx={currentPage}
                    onLog={handleLogFood}
                    perfil={perfil}
                    ingredients={getIngredientesSeleccionados()}
                    forceOpen={true}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Nav: ← progress dots → */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
              <motion.button whileTap={{ scale: 0.85 }} onClick={goPrev} disabled={currentPage === 0}
                style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0, border: 'none',
                  background: currentPage === 0 ? 'transparent' : 'var(--surface-2)',
                  cursor: currentPage === 0 ? 'default' : 'pointer',
                  color: currentPage === 0 ? 'var(--surface-hover)' : 'var(--text-secondary)',
                  fontSize: '1.1rem', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: currentPage === 0 ? 'none' : '1px solid var(--border-subtle)',
                }}>‹</motion.button>

              {/* Progress bar + dots */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {/* Bar */}
                <div style={{ height: 3, background: 'var(--surface-hover)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${((currentPage + 1) / allRecetas.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '100%', borderRadius: 99, background: 'var(--color-kcal)' }}
                  />
                </div>
                {/* Mini dots — show max 10 */}
                {allRecetas.length <= 20 && (
                  <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
                    {allRecetas.map((_, i) => (
                      <motion.button key={i} whileTap={{ scale: 0.8 }}
                        onClick={() => { setSlideDir(i > currentPage ? 1 : -1); setCurrentPage(i); }}
                        style={{
                          width: i === currentPage ? 14 : 5, height: 5, borderRadius: 99,
                          border: 'none', cursor: 'pointer', padding: 0,
                          background: i === currentPage ? 'var(--color-kcal)' : 'var(--surface-hover)',
                          transition: 'all 0.18s',
                        }} />
                    ))}
                    {allRecetas.length < MAX_RECETAS && (
                      <div style={{ width: 5, height: 5, borderRadius: 99, border: '1px dashed var(--text-muted)', opacity: 0.4 }} />
                    )}
                  </div>
                )}
              </div>

              {/* Next or load more */}
              {currentPage < allRecetas.length - 1 ? (
                <motion.button whileTap={{ scale: 0.85 }} onClick={goNext}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem', fontWeight: 900 }}>›</motion.button>
              ) : allRecetas.length < MAX_RECETAS ? (
                <motion.button whileTap={{ scale: 0.85 }} onClick={goNext} disabled={loadingMore}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', cursor: 'pointer', color: 'var(--color-kcal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.55rem', fontWeight: 900, flexDirection: 'column', gap: 0 }}>
                  {loadingMore ? <Loader2 size={11} className="spin" /> : <><Sparkles size={10} /><span style={{ fontSize: '0.45rem' }}>+10</span></>}
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowAddForm(true)}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(0,201,255,0.3)', background: 'rgba(0,201,255,0.08)', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={13} />
                </motion.button>
              )}
            </div>

            {/* Add recipe CTA — at max */}
            {(allRecetas.length >= MAX_RECETAS || showAddForm) && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '0.75rem', background: 'rgba(0,201,255,0.05)', border: '1px dashed rgba(0,201,255,0.25)', borderRadius: '12px', padding: '0.75rem' }}>
                {!showAddForm ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
                      Llegaste al límite de {MAX_RECETAS} recetas
                    </div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      ¿Tenés una receta propia? La validamos con IA y la guardamos para toda la comunidad
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddForm(true)}
                      className="btn-elite" style={{ height: '2rem', padding: '0 1rem', fontSize: '0.62rem' }}>
                      <Plus size={12} /> Agregar mi receta
                    </motion.button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--color-primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <GiCookingPot size={12} /> TU RECETA — la IA la valida antes de guardar
                    </div>

                    {/* Name + emoji */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <input value={customRecipe.emoji} onChange={e => setCustomRecipe(p => ({ ...p, emoji: e.target.value }))}
                        className="premium-input" style={{ width: '3rem', textAlign: 'center', fontSize: '1.2rem', flexShrink: 0 }} maxLength={2} />
                      <input value={customRecipe.nombre} onChange={e => setCustomRecipe(p => ({ ...p, nombre: e.target.value }))}
                        className="premium-input" placeholder="Nombre del plato..." style={{ flex: 1, height: '2.2rem', fontSize: '0.82rem' }} />
                    </div>

                    {/* Macros grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginBottom: '0.4rem' }}>
                      {[
                        { key: 'kcal', label: 'KCAL', color: 'var(--color-kcal)' },
                        { key: 'proteinas', label: 'PROT g', color: 'var(--color-prot)' },
                        { key: 'carbos', label: 'CARB g', color: 'var(--color-carb)' },
                        { key: 'grasas', label: 'GRAS g', color: 'var(--color-gras)' },
                      ].map(f => (
                        <div key={f.key}>
                          <div style={{ fontSize: '0.45rem', fontWeight: 900, color: f.color, marginBottom: '0.15rem' }}>{f.label}</div>
                          <input type="number" value={customRecipe[f.key]}
                            onChange={e => setCustomRecipe(p => ({ ...p, [f.key]: e.target.value }))}
                            className="premium-input" style={{ width: '100%', height: '2rem', fontSize: '0.82rem', textAlign: 'center', color: f.color }} />
                        </div>
                      ))}
                    </div>

                    {/* Time + difficulty */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '0.15rem' }}>TIEMPO (min)</div>
                        <input type="number" value={customRecipe.tiempo_min}
                          onChange={e => setCustomRecipe(p => ({ ...p, tiempo_min: parseInt(e.target.value) || 20 }))}
                          className="premium-input" style={{ width: '100%', height: '2rem', fontSize: '0.82rem', textAlign: 'center' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '0.15rem' }}>DIFICULTAD</div>
                        <select value={customRecipe.dificultad}
                          onChange={e => setCustomRecipe(p => ({ ...p, dificultad: e.target.value }))}
                          className="premium-input" style={{ width: '100%', height: '2rem', fontSize: '0.75rem' }}>
                          <option value="Facil">Fácil</option>
                          <option value="Media">Media</option>
                          <option value="Dificil">Difícil</option>
                        </select>
                      </div>
                    </div>

                    {/* Steps */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '0.25rem' }}>PASOS</div>
                      {customRecipe.pasos.map((paso, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.25rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 900, width: '14px', flexShrink: 0 }}>{i + 1}.</span>
                          <input value={paso}
                            onChange={e => {
                              const updated = [...customRecipe.pasos];
                              updated[i] = e.target.value;
                              setCustomRecipe(p => ({ ...p, pasos: updated }));
                            }}
                            className="premium-input"
                            placeholder={`Paso ${i + 1}...`}
                            style={{ flex: 1, height: '1.9rem', fontSize: '0.72rem' }} />
                          {customRecipe.pasos.length > 2 && (
                            <button onClick={() => setCustomRecipe(p => ({ ...p, pasos: p.pasos.filter((_, j) => j !== i) }))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={10} /></button>
                          )}
                        </div>
                      ))}
                      {customRecipe.pasos.length < 8 && (
                        <button onClick={() => setCustomRecipe(p => ({ ...p, pasos: [...p.pasos, ''] }))}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.55rem', fontWeight: 800 }}>
                          + Agregar paso
                        </button>
                      )}
                    </div>

                    {/* Validation result */}
                    {validationResult && (
                      <div style={{ marginBottom: '0.5rem', padding: '0.5rem 0.6rem', borderRadius: '8px',
                        background: validationResult.valida ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${validationResult.valida ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: validationResult.valida ? 'var(--color-prot)' : '#ef4444', marginBottom: '0.15rem' }}>
                          {validationResult.valida ? '✓ Receta válida' : '✗ La IA no la aprobó'}
                        </div>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>{validationResult.mensaje}</div>
                        {validationResult.guardada && <div style={{ fontSize: '0.52rem', color: 'var(--color-prot)', marginTop: '0.2rem', fontWeight: 800 }}>Guardada para toda la comunidad ✓</div>}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={validarRecetaCustom} disabled={validating || !customRecipe.nombre.trim()}
                        className="btn-elite" style={{ flex: 1, height: '2.2rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                        {validating ? <Loader2 size={12} className="spin" /> : <><Sparkles size={12} /> Validar con IA</>}
                      </motion.button>
                      <button onClick={() => { setShowAddForm(false); setValidationResult(null); }}
                        style={{ padding: '0 0.6rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
