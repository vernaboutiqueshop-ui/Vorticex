import { useState, useRef, useEffect } from 'react';
import { Camera, Search, Plus, X, Loader2 } from 'lucide-react';
import { GiMeal, GiFlame } from 'react-icons/gi';
import { FiEdit3 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../../config';
import ActionHub from './ActionHub';
import FeedbackWidget from './FeedbackWidget';

const SOURCE_BADGE = {
  Cache:  { label: '⚡ Cache',  color: 'var(--color-prot)', bg: 'rgba(34,197,94,0.1)' },
  Foto:   { label: '📷 Foto',   color: 'var(--color-carb)', bg: 'rgba(0,201,255,0.1)' },
  Manual: { label: '✏️ Manual', color: 'var(--text-muted)', bg: 'var(--surface-3)' },
  IA:     { label: '🤖 IA',     color: 'var(--color-gras)', bg: 'rgba(167,139,250,0.1)' },
  manual: { label: '✏️ Manual', color: 'var(--text-muted)', bg: 'var(--surface-3)' },
};

const FOOD_PLACEHOLDERS = [
  'Ej: 200g de pechuga con arroz...',
  'Ej: un choripán y una birra...',
  'Ej: humita al plato con queso...',
  'Ej: 2 medialunas y café con leche...',
  'Ej: pizza casera, 2 porciones...',
  'Ej: arroz con pollo casero...',
  'Ej: lomito completo...',
];

const suplementosKey = (perfil) => `vortice_suplementos_v2_${perfil}`;
const getSuplementosHoy = (perfil) => {
  try {
    const data = JSON.parse(localStorage.getItem(suplementosKey(perfil)) || '{}');
    const hoy = new Date().toISOString().split('T')[0];
    if (data.fecha === hoy && Array.isArray(data.items)) return data;
    return { 
      fecha: hoy, 
      items: [
        { id: 'creatina', nombre: 'Creatina', dosis: 5, unidad: 'g', tomada: false },
        { id: 'proteina', nombre: 'Proteína', dosis: 1, unidad: 'scoop', tomada: false },
        { id: 'preentreno', nombre: 'Pre-Entreno', dosis: 1, unidad: 'scoop', tomada: false }
      ]
    };
  } catch { return { 
    fecha: new Date().toISOString().split('T')[0], 
    items: [
      { id: 'creatina', nombre: 'Creatina', dosis: 5, unidad: 'g', tomada: false },
      { id: 'proteina', nombre: 'Proteína', dosis: 1, unidad: 'scoop', tomada: false },
      { id: 'preentreno', nombre: 'Pre-Entreno', dosis: 1, unidad: 'scoop', tomada: false }
    ]
  }; }
};
const saveSuplementosHoy = (perfil, data) => localStorage.setItem(suplementosKey(perfil), JSON.stringify(data));

const parseMultiFood = (text) => {
  const extractFood = (str) => {
    str = str.trim();
    const m = str.match(/^(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|gramos?\b|kg\b|de\b)?\s+(.+)$/i);
    if (m) return { nombre: m[2].trim(), gramos: parseFloat(m[1].replace(',', '.')) };
    const m2 = str.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|gramos?\b|kg\b)$/i);
    if (m2) return { nombre: m2[1].trim(), gramos: parseFloat(m2[2].replace(',', '.')) };
    return { nombre: str, gramos: null };
  };
  if (/\s+y\s+/i.test(text)) return text.trim().split(/\s+y\s+/i).map(extractFood);
  const segments = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|gramos?\b|kg\b|de\b)?\s+([a-záéíóúñüA-ZÁÉÍÓÚÑÜ][\w\sáéíóúñüÁÉÍÓÚÑÜ]+?)(?=\s+\d|$)/gi)];
  if (segments.length > 1) return segments.map(m => ({ nombre: m[2].trim(), gramos: parseFloat(m[1].replace(',', '.')) }));
  return [extractFood(text)];
};

function SuplementosPanel({ suplementosData, setSuplementosData, perfil, onShowToast }) {
  const [newNombre, setNewNombre] = useState('');
  const [newDosis, setNewDosis] = useState('');

  const save = (updated) => {
    setSuplementosData(updated);
    saveSuplementosHoy(perfil, updated);
  };

  const toggleSuplemento = (id) => {
    const newItems = suplementosData.items.map(s => s.id === id ? { ...s, tomada: !s.tomada } : s);
    const updated = { ...suplementosData, items: newItems };
    save(updated);
    const sup = newItems.find(s => s.id === id);
    if (sup.tomada) onShowToast?.(`💊 ${sup.nombre} registrada`, 'success');
  };

  const updateDosis = (id, delta) => {
    const newItems = suplementosData.items.map(s =>
      s.id === id ? { ...s, dosis: Math.max(0.5, s.dosis + delta) } : s
    );
    save({ ...suplementosData, items: newItems });
  };

  const eliminarSuplemento = (id) => {
    const newItems = suplementosData.items.filter(s => s.id !== id);
    save({ ...suplementosData, items: newItems });
  };

  const agregarSuplemento = () => {
    if (!newNombre.trim()) return;
    const isGrams = /g$/.test(newDosis.trim());
    const dosisNum = parseFloat(newDosis) || 1;
    const unidad = isGrams ? 'g' : (newDosis.trim() || '1 u');
    const newItem = {
      id: Date.now().toString(),
      nombre: newNombre.trim(),
      dosis: isGrams ? dosisNum : 1,
      unidad: isGrams ? 'g' : newDosis.trim() || 'u',
      tomada: false,
    };
    const updated = { ...suplementosData, items: [...suplementosData.items, newItem] };
    save(updated);
    setNewNombre('');
    setNewDosis('');
  };

  const tomadas = suplementosData.items.filter(s => s.tomada).length;
  const total = suplementosData.items.length;

  return (
    <motion.div key="suplementos" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>

      {/* Progress header */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <div style={{ flex: 1, height: 3, background: 'var(--surface-hover)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${(tomadas / total) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 99, background: tomadas === total ? 'var(--color-prot)' : 'var(--color-primary)' }}
            />
          </div>
          <span style={{ fontSize: '0.52rem', fontWeight: 900, color: tomadas === total ? 'var(--color-prot)' : 'var(--text-muted)', flexShrink: 0 }}>
            {tomadas}/{total} {tomadas === total ? '✓' : ''}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {suplementosData.items.map(sup => (
          <motion.div key={sup.id} layout
            style={{
              background: sup.tomada ? 'rgba(34,197,94,0.06)' : 'var(--surface-3)',
              border: `1px solid ${sup.tomada ? 'rgba(34,197,94,0.25)' : 'var(--border-subtle)'}`,
              borderRadius: '12px', padding: '0.55rem 0.7rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.25s',
            }}>
            {/* Checkbox-style icon */}
            <div style={{
              width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
              background: sup.tomada ? 'rgba(34,197,94,0.15)' : 'var(--surface-2)',
              border: `1.5px solid ${sup.tomada ? 'rgba(34,197,94,0.4)' : 'var(--border-subtle)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
            }}>
              {sup.tomada ? '✓' : '💊'}
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: sup.tomada ? 'var(--color-prot)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sup.nombre}
              </div>
            </div>

            {/* Dose stepper — compact inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
              <button onClick={() => updateDosis(sup.id, -0.5)}
                style={{ width: 20, height: 20, borderRadius: '6px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 900, fontSize: '0.75rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--color-primary)', minWidth: '36px', textAlign: 'center' }}>{sup.dosis}{sup.unidad}</span>
              <button onClick={() => updateDosis(sup.id, 0.5)}
                style={{ width: 20, height: 20, borderRadius: '6px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 900, fontSize: '0.75rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>

            {/* TOMAR / LISTO pill */}
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => toggleSuplemento(sup.id)}
              style={{
                padding: '0.32rem 0.7rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontWeight: 900, fontSize: '0.6rem', flexShrink: 0,
                background: sup.tomada ? 'rgba(34,197,94,0.15)' : 'var(--color-primary)',
                color: sup.tomada ? 'var(--color-prot)' : '#000',
                letterSpacing: '0.3px',
              }}>
              {sup.tomada ? '✓ OK' : 'TOMAR'}
            </motion.button>

            <button onClick={() => eliminarSuplemento(sup.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.15rem', flexShrink: 0, opacity: 0.6 }}>
              <X size={11} />
            </button>
          </motion.div>
        ))}

        {/* Add new supplement box */}
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px dashed var(--border-subtle)', 
          borderRadius: '14px', 
          padding: '0.75rem',
          marginTop: '0.4rem'
        }}>
          <div style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>AGREGAR OTRO</div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input value={newNombre} onChange={e => setNewNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarSuplemento()}
              className="premium-input" placeholder="Nombre (ej: Omega 3)"
              style={{ flex: 2, height: '2.4rem', fontSize: '0.75rem' }} />
            <input value={newDosis} onChange={e => setNewDosis(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarSuplemento()}
              className="premium-input" placeholder="Dosis"
              style={{ flex: 1, height: '2.4rem', fontSize: '0.75rem' }} />
            <motion.button whileTap={{ scale: 0.9 }} onClick={agregarSuplemento}
              className="btn-elite" style={{ width: '2.4rem', height: '2.4rem', padding: 0, flexShrink: 0 }}>
              <Plus size={16} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LogSection({ perfil, comidasHoy, onRefresh, onShowToast }) {
  const [activeChip, setActiveChip] = useState('buscar');
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [hybridResults, setHybridResults] = useState([]);
  const [hybridSource, setHybridSource] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [gramosInput, setGramosInput] = useState(100);
  const [loggingFood, setLoggingFood] = useState(false);
  const [logSuccess, setLogSuccess] = useState(null);
  const [pendingFeedback, setPendingFeedback] = useState(null); // { name, itemType }
  const [searchMsg, setSearchMsg] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [multiPending, setMultiPending] = useState([]);
  const [naturalItems, setNaturalItems] = useState([]);
  const [loggingMulti, setLoggingMulti] = useState(false);
  const [phIdx, setPhIdx] = useState(0);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoDraft, setPhotoDraft] = useState(null);
  const [loggingDraft, setLoggingDraft] = useState(false);
  const [suplementosData, setSuplementosData] = useState(() => getSuplementosHoy(perfil));

  const suggestionTimer = useRef(null);
  const searchTimers = useRef([]);

  useEffect(() => {
    const t = setInterval(() => setPhIdx(i => (i + 1) % FOOD_PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Listen for ingredient search triggers from AlacenaSection
  useEffect(() => {
    const handler = (e) => {
      const { query } = e.detail;
      setActiveChip('buscar');
      setSearchText(query);
      setTimeout(() => buscarAlimento(query), 50);
    };
    window.addEventListener('vortice:search', handler);
    return () => window.removeEventListener('vortice:search', handler);
  }, []);

  const handleSearchInput = (val) => {
    setSearchText(val);
    clearTimeout(suggestionTimer.current);
    if (val.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestionTimer.current = setTimeout(async () => {
      try {
        const res = await authFetch(`${API}/api/nutricion/buscar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ perfil, query: val.trim() }),
        });
        const data = await res.json();
        const items = [...(data.cache || []), ...(data.items || [])].slice(0, 5);
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch { setSuggestions([]); }
    }, 280);
  };

  const buscarAlimento = async (queryOverride) => {
    const query = (queryOverride || searchText).trim();
    if (!query) return;
    const parts = parseMultiFood(query);

    if (parts.length > 1) {
      setSearching(true);
      setHybridResults([]); setSelectedFood(null); setHybridSource(''); setMultiPending([]); setNaturalItems([]);
      const results = [];
      for (const part of parts) {
        try {
          const res = await authFetch(`${API}/api/nutricion/buscar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ perfil, query: part.nombre }),
          });
          const data = await res.json();
          results.push({ nombre: part.nombre, gramos: part.gramos || 100, food: (data.items || [])[0] || null });
        } catch { results.push({ nombre: part.nombre, gramos: part.gramos || 100, food: null }); }
      }
      setMultiPending(results);
      setSearching(false);
      return;
    }

    const { nombre, gramos } = parts[0];
    if (gramos) setGramosInput(gramos);
    setSearching(true);
    setHybridResults([]); setSelectedFood(null); setHybridSource(''); setMultiPending([]); setNaturalItems([]);
    searchTimers.current.forEach(clearTimeout);
    setSearchMsg('Buscando en tu historial...');
    searchTimers.current = [
      setTimeout(() => setSearchMsg('Analizando por similitud semántica...'), 550),
      setTimeout(() => setSearchMsg('✨ Consultando IA nutricional...'), 1400),
      setTimeout(() => setSearchMsg('Procesando respuesta...'), 3200),
    ];
    try {
      const res = await authFetch(`${API}/api/nutricion/buscar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, query: nombre }),
      });
      const data = await res.json();
      if (data.source === 'natural' && data.natural_items?.length > 0) {
        setNaturalItems(data.natural_items); setHybridSource('natural');
      } else if (data.items?.length > 0) {
        setHybridResults(data.items); setHybridSource(data.source || '');
        if (data.corrected && data.previous_cal) {
          onShowToast?.(`Dato corregido: antes ${data.previous_cal} kcal/100g, ahora ${Math.round(data.items[0]?.cal_100)} kcal/100g 🎯`, 'info');
        }
      } else {
        setHybridResults([]); setHybridSource('none');
      }
    } catch {}
    searchTimers.current.forEach(clearTimeout);
    setSearchMsg('');
    setSearching(false);
  };

  const logFromCache = async (food) => {
    setLoggingFood(true);
    try {
      const res = await authFetch(`${API}/api/nutricion/log-from-cache`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, alimento_id: food.id || null, nombre: food.nombre, cal_100: food.cal_100, prot_100: food.prot_100, carb_100: food.carb_100, fat_100: food.fat_100, gramos: gramosInput, source: food.source || 'cache' }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const cal = Math.round(food.cal_100 * gramosInput / 100);
        onShowToast?.(`${food.nombre} · ${cal} kcal`, 'success');
        setLogSuccess(food.nombre);
        setTimeout(() => setLogSuccess(null), 1600);
        setSelectedFood(null); setHybridResults([]); setSuggestions([]); setShowSuggestions(false); setSearchText(''); setGramosInput(100);
        setPendingFeedback({ name: food.nombre, itemType: 'food_search' });
        setTimeout(() => setPendingFeedback(null), 9000);
        onRefresh();
      }
    } catch {}
    setLoggingFood(false);
  };

  const logAllMulti = async () => {
    setLoggingMulti(true);
    for (const item of multiPending) {
      if (!item.food) continue;
      try {
        await authFetch(`${API}/api/nutricion/log-from-cache`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ perfil, alimento_id: item.food.id || null, nombre: item.food.nombre, cal_100: item.food.cal_100, prot_100: item.food.prot_100, carb_100: item.food.carb_100, fat_100: item.food.fat_100, gramos: item.gramos, source: item.food.source || 'cache' }),
        });
      } catch {}
    }
    const total = multiPending.filter(i => i.food).reduce((s, i) => s + Math.round(i.food.cal_100 * i.gramos / 100), 0);
    if (total > 0) onShowToast?.(`${multiPending.filter(i => i.food).length} alimentos · ${total} kcal`, 'success');
    setMultiPending([]); setSearchText(''); onRefresh(); setLoggingMulti(false);
  };

  const logAllNatural = async () => {
    setLoggingMulti(true);
    for (const item of naturalItems) {
      try {
        await authFetch(`${API}/api/nutricion/log-from-cache`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ perfil, nombre: `${item.nombre} (${item.cantidad} ${item.unidad})`, cal_100: item.kcal, prot_100: item.proteinas, carb_100: item.carbos, fat_100: item.grasas, gramos: 100, source: 'natural' }),
        });
      } catch {}
    }
    const totalKcal = naturalItems.reduce((s, i) => s + (i.kcal || 0), 0);
    if (totalKcal > 0) onShowToast?.(`${naturalItems.length} ítems · ${Math.round(totalKcal)} kcal`, 'success');
    setNaturalItems([]); setSearchText(''); onRefresh(); setLoggingMulti(false);
  };

  const analizarFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAnalyzingPhoto(true);
    setPhotoDraft(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await authFetch(`${API}/api/nutricion/analizar-foto?perfil=${perfil}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.resultado) {
        setPhotoDraft({ ...data.resultado });
      } else {
        onShowToast?.('No se pudo analizar la foto. Intentá con mejor luz.', 'error');
      }
    } catch {}
    setAnalyzingPhoto(false);
    e.target.value = '';
  };

  const confirmarDraft = async () => {
    if (!photoDraft) return;
    setLoggingDraft(true);
    try {
      await authFetch(`${API}/api/nutricion/log-from-cache`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, nombre: photoDraft.alimento || 'Comida (foto)', cal_100: photoDraft.calorias, prot_100: photoDraft.proteinas, carb_100: photoDraft.carbos, fat_100: photoDraft.grasas, gramos: 100, source: 'foto' }),
      });
      onShowToast?.(`📷 ${photoDraft.alimento || 'Foto'} · ${Math.round(photoDraft.calorias)} kcal`, 'success');
      const fotoNombre = photoDraft.alimento || 'Foto';
      setPhotoDraft(null);
      setPendingFeedback({ name: fotoNombre, itemType: 'photo' });
      setTimeout(() => setPendingFeedback(null), 9000);
      onRefresh();
    } catch {}
    setLoggingDraft(false);
  };

  const eliminarComida = async (id) => {
    await authFetch(`${API}/api/nutricion/evento/${id}?perfil=${perfil}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Feedback banner — aparece 9s después de registrar */}
      <AnimatePresence>
        {pendingFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.9 }}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
              borderRadius: '12px', padding: '0.5rem 0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                ¿{pendingFeedback.name} fue útil?
              </div>
              <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                Tu voto mejora los resultados para todos
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FeedbackWidget
                perfil={perfil}
                itemType={pendingFeedback.itemType}
                itemKey={pendingFeedback.name}
                size="sm"
                onFeedback={() => setTimeout(() => setPendingFeedback(null), 1500)}
              />
              <button onClick={() => setPendingFeedback(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem' }}>
                <X size={11} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOG HOY */}
      {comidasHoy.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <GiMeal size={12} /> LOG HOY
            </h3>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-muted)' }}>
              {comidasHoy.length} {comidasHoy.length === 1 ? 'comida' : 'comidas'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {comidasHoy.map((c, cIdx) => {
              const cal = Math.round(c.calorias || 0);
              const prot = Math.round(c.proteinas || 0);
              const carb = Math.round(c.carbos || 0);
              const gras = Math.round(c.grasas || 0);
              const calColor = cal > 500 ? '#ef4444' : cal > 250 ? 'var(--color-kcal)' : 'var(--color-prot)';
              const gramosMatch = c.descripcion?.match(/\((\d+)g\)$/);
              const gramos = gramosMatch ? gramosMatch[1] : null;
              const nombreBase = gramos ? c.descripcion.replace(/\s*\(\d+g\)$/, '') : c.descripcion;
              const badge = SOURCE_BADGE[c.fuente] || SOURCE_BADGE['manual'];
              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + cIdx * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface-1)', borderRadius: '12px', padding: '0.55rem 0.65rem', border: '1px solid var(--surface-hover)' }}>
                  <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', background: `${calColor}18`, border: `1px solid ${calColor}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: calColor, lineHeight: 1 }}>{cal}</span>
                    <span style={{ fontSize: '0.38rem', fontWeight: 800, color: calColor, opacity: 0.7 }}>KCAL</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>
                      {nombreBase}
                      {gramos && <span style={{ marginLeft: '0.3rem', fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(0,201,255,0.1)', padding: '0.05rem 0.3rem', borderRadius: '4px' }}>{gramos}g</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-prot)' }}>P <span style={{ color: 'var(--text-primary)' }}>{prot}g</span></span>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-carb)' }}>C <span style={{ color: 'var(--text-primary)' }}>{carb}g</span></span>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-gras)' }}>G <span style={{ color: 'var(--text-primary)' }}>{gras}g</span></span>
                      <span style={{ fontSize: '0.45rem', fontWeight: 800, color: badge.color, background: badge.bg, padding: '0.05rem 0.3rem', borderRadius: '4px', flexShrink: 0 }}>{badge.label}</span>
                    </div>
                  </div>
                  <button onClick={() => eliminarComida(c.id)} className="btn-icon-elite danger" style={{ width: '28px', height: '28px', flexShrink: 0 }}>
                    <X size={12} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* PANEL DE REGISTRO */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}>

        <ActionHub activeChip={activeChip} onChipSelect={setActiveChip} />

        <AnimatePresence mode="wait">

          {/* BUSCAR */}
          {activeChip === 'buscar' && (
            <motion.div key="buscar" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }} />
                    <input
                      value={searchText}
                      onChange={e => handleSearchInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { setShowSuggestions(false); buscarAlimento(); } if (e.key === 'Escape') setShowSuggestions(false); }}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      className="premium-input"
                      placeholder={FOOD_PLACEHOLDERS[phIdx]}
                      style={{ width: '100%', height: '2.8rem', fontSize: '0.85rem', paddingLeft: '2.2rem' }}
                    />
                  </div>
                  <motion.button whileTap={{ scale: 0.92 }} className="btn-elite"
                    style={{ width: '3rem', height: '2.8rem', padding: 0, flexShrink: 0 }}
                    onClick={() => { setShowSuggestions(false); buscarAlimento(); }} disabled={searching}>
                    {searching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                  </motion.button>
                </div>

                <AnimatePresence>
                  {searching && searchMsg && (
                    <motion.div key={searchMsg} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.5rem', marginTop: '0.35rem', background: 'rgba(0,201,255,0.05)', borderRadius: '8px', border: '1px solid rgba(0,201,255,0.12)' }}>
                      <Loader2 size={10} className="spin" color="var(--color-primary)" />
                      <span style={{ fontSize: '0.58rem', color: 'var(--color-primary)', fontWeight: 700 }}>{searchMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -4, scaleY: 0.9 }} animate={{ opacity: 1, y: 0, scaleY: 1 }} exit={{ opacity: 0, y: -4, scaleY: 0.9 }} transition={{ duration: 0.12 }}
                      style={{ position: 'absolute', top: '100%', left: 0, right: '3.5rem', marginTop: '0.3rem', background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '12px', overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', transformOrigin: 'top' }}>
                      {suggestions.map((food, idx) => {
                        const cal = Math.round(food.cal_100 || 0);
                        const prot = Math.round(food.prot_100 || 0);
                        return (
                          <motion.button key={idx} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                            onClick={() => { setSelectedFood(food); setGramosInput(100); setShowSuggestions(false); setSuggestions([]); setHybridResults([]); }}
                            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none', padding: '0.55rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: `rgba(${cal > 400 ? '239,68,68' : cal > 200 ? '245,158,11' : '34,197,94'},0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>
                              {cal > 400 ? '🥩' : cal > 200 ? '🌾' : '🥗'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{food.nombre}</div>
                              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', marginTop: '0.1rem' }}>
                                <span style={{ color: 'var(--color-kcal)', fontWeight: 800 }}>{cal} kcal</span>
                                <span>P {prot}g</span>
                              </div>
                            </div>
                            <Plus size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Did you mean? */}
              <AnimatePresence>
                {hybridSource === 'semantic' && hybridResults.length > 0 && searchText.trim() &&
                  hybridResults[0]?.nombre?.toLowerCase() !== searchText.trim().toLowerCase() && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700 }}>IA detectó →</span>
                    <span style={{ fontSize: '0.58rem', fontWeight: 900, color: 'var(--color-carb)', background: 'rgba(0,201,255,0.08)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>{hybridResults[0].nombre}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Source badge */}
              {hybridSource && hybridSource !== 'none' && hybridResults.length > 0 && (
                <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {(() => {
                    const isCache = hybridSource === 'cache'; const isOFF = hybridSource === 'openfoodfacts';
                    const isSemantic = hybridSource === 'semantic'; const isGroq = hybridSource === 'groq';
                    return (
                      <span style={{ fontSize: '0.5rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '6px', background: isCache ? 'rgba(34,197,94,0.1)' : isOFF ? 'rgba(59,130,246,0.1)' : isSemantic ? 'rgba(0,201,255,0.1)' : 'rgba(251,146,60,0.1)', color: isCache ? 'var(--color-prot)' : isOFF ? 'var(--color-primary)' : isSemantic ? 'var(--color-primary)' : '#fb923c' }}>
                        {isCache ? '⚡ CACHE' : isOFF ? '🌍 OPEN FOOD FACTS' : isSemantic ? '🔍 SEMÁNTICO' : '🦙 GROQ IA'}
                      </span>
                    );
                  })()}
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{hybridResults.length} resultados</span>
                </div>
              )}

              {hybridSource === 'none' && !searching && multiPending.length === 0 && naturalItems.length === 0 && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>Sin resultados. Probá con otro término.</p>
              )}

              {/* Multi-food panel */}
              {multiPending.length > 0 && !searching && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {multiPending.map((item, idx) => {
                    const cal = item.food ? Math.round(item.food.cal_100 * item.gramos / 100) : null;
                    const prot = item.food ? Math.round(item.food.prot_100 * item.gramos / 100) : null;
                    return (
                      <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 28 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: item.food ? 'rgba(0,201,255,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${item.food ? 'rgba(0,201,255,0.18)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '12px', padding: '0.6rem 0.75rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: item.food ? 'var(--text-primary)' : '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.food ? item.food.nombre : item.nombre}</div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.1rem' }}>{item.food ? `${cal} kcal · ${prot}g prot` : 'Sin resultado'}</div>
                        </div>
                        <input type="number" value={item.gramos} min={1} max={2000}
                          onChange={e => setMultiPending(prev => prev.map((p, i) => i === idx ? { ...p, gramos: Number(e.target.value) || 100 } : p))}
                          className="hevy-input" style={{ width: '56px', textAlign: 'center', padding: '0.3rem 0.2rem', fontSize: '0.8rem', fontWeight: 800 }} />
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>g</span>
                      </motion.div>
                    );
                  })}
                  <button onClick={logAllMulti} disabled={loggingMulti || multiPending.every(i => !i.food)} className="btn-premium"
                    style={{ marginTop: '0.1rem', fontSize: '0.75rem', height: '2.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    {loggingMulti ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                    REGISTRAR TODOS ({multiPending.filter(i => i.food).length}/{multiPending.length})
                  </button>
                </div>
              )}

              {/* Natural items panel */}
              {naturalItems.length > 0 && !searching && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 900, color: 'var(--color-gras)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>✦</span> IA DETECTÓ {naturalItems.length} ÍTEM{naturalItems.length > 1 ? 'S' : ''}
                  </div>
                  {naturalItems.map((item, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 28 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(123,47,190,0.06)', border: '1px solid rgba(123,47,190,0.2)', borderRadius: '12px', padding: '0.6rem 0.75rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-gras)', marginTop: '0.1rem' }}>{item.cantidad} {item.unidad} · <span style={{ color: '#00C9FF' }}>{item.kcal} kcal</span></div>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.05rem' }}>P <span style={{ color: 'var(--color-prot)' }}>{item.proteinas}g</span> · C <span style={{ color: 'var(--color-carb)' }}>{item.carbos}g</span> · G <span style={{ color: 'var(--color-gras)' }}>{item.grasas}g</span></div>
                      </div>
                    </motion.div>
                  ))}
                  <button onClick={logAllNatural} disabled={loggingMulti} className="btn-premium"
                    style={{ marginTop: '0.1rem', fontSize: '0.75rem', height: '2.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    {loggingMulti ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                    REGISTRAR TODOS ({naturalItems.length})
                  </button>
                </div>
              )}

              {/* Search results */}
              <AnimatePresence>
                {hybridResults.length > 0 && !selectedFood && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: '0.5rem', maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {hybridResults.slice(0, 8).map((food, idx) => {
                      const cal = Math.round(food.cal_100);
                      const isMultiWord = food.nombre?.split(' ').length >= 2;
                      const suspicious = cal > 280 && isMultiWord && !food.marca;
                      const calColor = suspicious ? 'var(--color-danger)' : cal > 250 ? 'var(--color-warning)' : 'var(--color-success)';
                      const calBg = suspicious ? 'rgba(239,68,68,0.12)' : cal > 250 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)';
                      return (
                        <motion.button key={food.id || idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, type: 'spring', stiffness: 400, damping: 25 }} whileTap={{ scale: 0.97 }}
                          onClick={() => { setSelectedFood(food); setGramosInput(100); }}
                          style={{ background: 'var(--surface-1)', border: `1px solid ${suspicious ? 'rgba(239,68,68,0.2)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-input)', padding: '0.6rem 0.75rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,201,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-1)'}>
                          <div style={{ flexShrink: 0, background: calBg, border: `1px solid ${calColor}30`, borderRadius: '8px', padding: '0.25rem 0.45rem', textAlign: 'center', minWidth: '40px' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: calColor, lineHeight: 1 }}>{cal}</div>
                            <div style={{ fontSize: '0.38rem', fontWeight: 800, color: calColor, opacity: 0.7 }}>KCAL</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.nombre}</div>
                              {suspicious && <span style={{ fontSize: '0.42rem', fontWeight: 900, color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: '0.08rem 0.3rem', borderRadius: '4px', flexShrink: 0 }}>⚠️ VERIFICAR</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.55rem', marginTop: '0.2rem' }}>
                              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--color-prot)' }}>P:{Math.round(food.prot_100)}g</span>
                              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--color-carb)' }}>C:{Math.round(food.carb_100)}g</span>
                              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--color-gras)' }}>G:{Math.round(food.fat_100)}g</span>
                              <span style={{ fontSize: '0.48rem', color: 'var(--text-muted)' }}>/100g</span>
                            </div>
                          </div>
                          <motion.div whileTap={{ scale: 1.3 }} whileHover={{ scale: 1.1 }}
                            style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,201,255,0.12)', border: '1px solid rgba(0,201,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={14} color="var(--color-primary)" />
                          </motion.div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selected food */}
              <AnimatePresence>
                {selectedFood && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
                    style={{ marginTop: '0.6rem', background: 'rgba(0,201,255,0.05)', border: '1px solid rgba(0,201,255,0.15)', borderRadius: '14px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>{selectedFood.nombre}</div>
                        {selectedFood.marca && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>{selectedFood.marca}</div>}
                      </div>
                      <button onClick={() => setSelectedFood(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                      {[{ label: 'KCAL', val: selectedFood.cal_100, color: 'var(--color-kcal)' }, { label: 'PROT', val: selectedFood.prot_100, color: 'var(--color-prot)' }, { label: 'CARB', val: selectedFood.carb_100, color: 'var(--color-carb)' }, { label: 'GRAS', val: selectedFood.fat_100, color: 'var(--color-gras)' }].map(m => (
                        <span key={m.label} style={{ fontSize: '0.55rem', fontWeight: 900, color: m.color, background: `${m.color}15`, padding: '0.15rem 0.4rem', borderRadius: '6px' }}>{Math.round(m.val)}{m.label === 'KCAL' ? '' : 'g'} {m.label}</span>
                      ))}
                      <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 700, alignSelf: 'center' }}>/ 100g</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800 }}>Porción:</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {[50, 100, 150, 200, 300].map(g => (
                          <button key={g} onClick={() => setGramosInput(g)}
                            style={{ fontSize: '0.6rem', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer', border: gramosInput === g ? '1px solid rgba(0,201,255,0.4)' : '1px solid var(--surface-2)', background: gramosInput === g ? 'rgba(0,201,255,0.12)' : 'var(--surface-1)', color: gramosInput === g ? 'var(--color-primary)' : 'var(--text-secondary)' }}>{g}g</button>
                        ))}
                      </div>
                      <input type="number" value={gramosInput} onChange={e => setGramosInput(Math.max(1, parseInt(e.target.value) || 0))}
                        className="premium-input" style={{ width: '50px', height: '1.8rem', fontSize: '0.7rem', textAlign: 'center' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', padding: '0.4rem', background: 'var(--surface-2)', borderRadius: '8px' }}>
                      {[{ label: 'Kcal', val: selectedFood.cal_100 * gramosInput / 100, color: 'var(--color-kcal)' }, { label: 'Prot', val: selectedFood.prot_100 * gramosInput / 100, color: 'var(--color-prot)' }, { label: 'Carb', val: selectedFood.carb_100 * gramosInput / 100, color: 'var(--color-carb)' }, { label: 'Gras', val: selectedFood.fat_100 * gramosInput / 100, color: 'var(--color-gras)' }].map(m => (
                        <div key={m.label} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 900, color: m.color }}>{Math.round(m.val)}</div>
                          <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 800 }}>{m.label.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => logFromCache(selectedFood)} disabled={loggingFood} className="btn-elite"
                      style={{ width: '100%', height: '2.6rem', fontSize: '0.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      {loggingFood ? <Loader2 size={14} className="spin" /> : <><Plus size={14} /> REGISTRAR {gramosInput}g</>}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* FOTO */}
          {activeChip === 'foto' && (
            <motion.div key="foto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              {!photoDraft && (
                <label className="btn-elite" style={{ width: '100%', height: '3.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(0,201,255,0.07)', border: '1px dashed rgba(0,201,255,0.3)', borderRadius: 'var(--radius-input)' }}>
                  <Camera size={18} color="var(--color-primary)" />
                  {analyzingPhoto ? <><Loader2 size={14} className="spin" /> Analizando foto...</> : 'Tocar para sacar foto'}
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={analizarFoto} disabled={analyzingPhoto} />
                </label>
              )}

              <AnimatePresence>
                {photoDraft && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
                    style={{ background: 'var(--surface-2)', border: '1px solid rgba(0,201,255,0.18)', borderRadius: '16px', overflow: 'hidden' }}>

                    {/* Header bar */}
                    <div style={{ background: 'rgba(0,201,255,0.07)', padding: '0.55rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,201,255,0.12)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Camera size={12} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.58rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.4px' }}>IA DETECTÓ · AJUSTÁ SI HACE FALTA</span>
                      </div>
                      <button onClick={() => setPhotoDraft(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem' }}><X size={13} /></button>
                    </div>

                    <div style={{ padding: '1rem 1.1rem' }}>
                      <input 
                        value={photoDraft.alimento} 
                        onChange={e => setPhotoDraft(p => ({ ...p, alimento: e.target.value }))}
                        className="premium-input"
                        placeholder="Nombre del alimento..."
                        style={{ width: '100%', height: '3rem', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }} 
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.25rem' }}>
                        {[
                          { key: 'calorias',  label: 'KCAL',      color: 'var(--color-kcal)', border: 'rgba(245,158,11,0.25)', unit: '' },
                          { key: 'proteinas', label: 'PROTEÍNAS', color: 'var(--color-prot)', border: 'rgba(34,197,94,0.25)',  unit: 'g' },
                          { key: 'carbos',    label: 'CARBOS',    color: 'var(--color-carb)', border: 'rgba(0,201,255,0.25)',  unit: 'g' },
                          { key: 'grasas',    label: 'GRASAS',    color: 'var(--color-gras)', border: 'rgba(167,139,250,0.25)', unit: 'g' },
                        ].map(f => (
                          <div key={f.key} style={{ 
                            background: 'rgba(255,255,255,0.02)', 
                            border: `1px solid ${f.border}`, 
                            borderRadius: '14px', 
                            padding: '0.6rem 0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                          }}>
                            <div style={{ fontSize: '0.5rem', fontWeight: 900, color: f.color, marginBottom: '0.2rem', letterSpacing: '0.6px' }}>{f.label}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.1rem' }}>
                              <input type="number" value={Math.round(photoDraft[f.key] || 0)}
                                onChange={e => setPhotoDraft(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '1.25rem', fontWeight: 900, color: '#fff', textAlign: 'center', width: '60px', padding: 0 }} />
                              {f.unit && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>{f.unit}</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      <motion.button whileTap={{ scale: 0.96 }} onClick={confirmarDraft} disabled={loggingDraft}
                        style={{
                          width: '100%', height: '3.2rem', borderRadius: '16px', border: 'none', cursor: 'pointer',
                          background: loggingDraft ? 'var(--surface-3)' : 'var(--color-primary)',
                          color: '#000', fontWeight: 900, fontSize: '0.85rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          boxShadow: '0 4px 20px rgba(0,201,255,0.15)'
                        }}>
                        {loggingDraft ? <Loader2 size={16} className="spin" /> : <><Plus size={18} /> CONFIRMAR REGISTRO</>}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* SUPLEMENTOS */}
          {activeChip === 'suplementos' && (
            <SuplementosPanel
              suplementosData={suplementosData}
              setSuplementosData={setSuplementosData}
              perfil={perfil}
              onShowToast={onShowToast}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {logSuccess && (
            <motion.div initial={{ opacity: 0, scale: 0.85, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '0.4rem 0.7rem' }}>
              <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.35 }} style={{ fontSize: '0.9rem' }}>✓</motion.span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-prot)' }}>{logSuccess} registrado</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
