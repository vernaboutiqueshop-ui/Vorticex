import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Camera, Search, Plus, X, Loader2 } from 'lucide-react';
import { GiFlame, GiCookingPot, GiMeal, GiTargetArrows } from 'react-icons/gi';
import { MdOutlineTimer, MdOutlineSettings } from 'react-icons/md';
import { IoWater } from 'react-icons/io5';
import { FiCheck, FiEdit3 } from 'react-icons/fi';
import { HiOutlineChartBar } from 'react-icons/hi';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../config';

// Etapas biológicas del ayuno con información científica
const ETAPAS_AYUNO = [
  { 
    min: 0, max: 8, 
    nombre: 'Digestión', 
    emoji: null, 
    lottie: null,
    color: '#10b981', 
    glow: 'rgba(16,185,129,0.5)',
    badge: 'Digestión',
    desc: 'Tu cuerpo está digiriendo la última comida. La insulina está alta.',
    beneficio: 'Procesando nutrientes.',
    tip: '¡Tomá agua con gas o té sin azúcar!',
  },
  { 
    min: 8, max: 12, 
    nombre: 'Glucógeno', 
    emoji: null, 
    lottie: null,
    color: '#f59e0b', 
    glow: 'rgba(245,158,11,0.5)',
    badge: 'Glucógeno',
    desc: 'El cuerpo agota las reservas de azúcar y empieza a buscar grasa.',
    beneficio: 'Movilizando reservas.',
    tip: 'Un café negro te puede ayudar.',
  },
  { 
    min: 12, max: 18, 
    nombre: 'Quema Grasa', 
    emoji: null, 
    lottie: null,
    color: '#f43f5e', 
    glow: 'rgba(244,63,94,0.5)',
    badge: 'Quema Grasa',
    desc: 'Nivel bajo de insulina. Tu cuerpo está usando grasa como combustible principal.',
    beneficio: '¡Fuego purificador!',
    tip: 'Si sentís mareo, poné una pizca de sal en el agua.',
  },
  { 
    min: 18, max: 24, 
    nombre: 'Cetosis', 
    emoji: null, 
    lottie: null,
    color: '#38bdf8', 
    glow: 'rgba(56,189,248,0.5)',
    badge: 'Cetosis',
    desc: 'Las cetonas suben fuerte. Tu cerebro está a 220 con grasa.',
    beneficio: 'Claridad mental total.',
    tip: 'Momento ideal para laburar o estudiar.',
  },
  { 
    min: 24, max: 48, 
    nombre: 'Autofagia', 
    emoji: null, 
    lottie: null,
    color: '#a78bfa', 
    glow: 'rgba(167,139,250,0.5)',
    badge: 'Renovación',
    desc: 'Tu cuerpo recicla células viejas. Una limpieza profunda.',
    beneficio: '¡Nivel Élite! Renovación celular.',
    tip: 'Paciencia. Ya pasaste lo más difícil.',
  },
  { 
    min: 48, max: Infinity, 
    nombre: 'Ayuno Profundo', 
    emoji: null, 
    lottie: null,
    color: '#ec4899', 
    glow: 'rgba(236,72,153,0.4)',
    badge: 'Diamante',
    desc: 'Autofagia al máximo. El sistema inmune se resetea.',
    beneficio: 'Modo supervivencia ancestral.',
    tip: '⚠️ Consultá con un médico si vas por más de 48hs.',
  },
];

const getEtapaActual = (horasDecimal) => {
  return ETAPAS_AYUNO.find(e => horasDecimal >= e.min && horasDecimal < e.max) || ETAPAS_AYUNO[0];
};

const getProximaEtapa = (horasDecimal) => {
  const idx = ETAPAS_AYUNO.findIndex(e => horasDecimal >= e.min && horasDecimal < e.max);
  return idx >= 0 && idx < ETAPAS_AYUNO.length - 1 ? ETAPAS_AYUNO[idx + 1] : null;
};

export default function NutricionView({ perfil }) {
  const [macrosHoy, setMacrosHoy] = useState({ calorias: 0, proteinas: 0, carbos: 0, grasas: 0 });
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoResult, setPhotoResult] = useState(null);
  const [hybridResults, setHybridResults] = useState([]);
  const [hybridSource, setHybridSource] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [gramosInput, setGramosInput] = useState(100);
  const [loggingFood, setLoggingFood] = useState(false);
  const [alacena, setAlacena] = useState([]);
  const [newIngrediente, setNewIngrediente] = useState('');
  const [receta, setReceta] = useState('');
  const [loadingReceta, setLoadingReceta] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [comidasHoy, setComidasHoy] = useState([]);

  const [ayuno, setAyuno] = useState(() => {
    try {
      const cached = localStorage.getItem(`vortice_ayuno_${perfil}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.en_ayuno && parsed.inicio) return parsed;
      }
    } catch { }
    return { en_ayuno: false, inicio: null, meta_horas: 16 };
  });
  const [horasAyunoStr, setHorasAyunoStr] = useState('00:00:00');
  const [progresoAyuno, setProgresoAyuno] = useState(0);
  const [showAyunoSettings, setShowAyunoSettings] = useState(false);
  const [metaHorasLocal, setMetaHorasLocal] = useState(16);
  const [showEtapaInfo, setShowEtapaInfo] = useState(false);
  const [horasDecimal, setHorasDecimal] = useState(0);
  const [rachaAyuno, setRachaAyuno] = useState([]);

  // New features state
  const [metas, setMetas] = useState({ cal_goal: 2200, prot_goal: 150, carb_goal: 250, fat_goal: 70 });
  const [showMetasEditor, setShowMetasEditor] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const WATER_GOAL = 8;
  const [historial, setHistorial] = useState([]);

  const calcularTiempoAyuno = (inicioISO, metaHs) => {
    if (!inicioISO) return { str: '00:00:00', pct: 0, hrsDecimal: 0 };
    const isoStr = inicioISO.endsWith('Z') || inicioISO.includes('+') ? inicioISO : inicioISO + 'Z';
    const start = new Date(isoStr);
    const now = new Date();
    const diffMs = Math.max(0, now - start);
    const diffHrs = diffMs / (1000 * 60 * 60);
    const hrs = Math.floor(diffHrs);
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    const pct = Math.min(100, (diffHrs / (metaHs || 16)) * 100);
    return {
      str: `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`,
      pct,
      hrsDecimal: diffHrs
    };
  };

  const fetchMacros = () => {
    authFetch(`${API}/api/nutricion/macros-hoy?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.macros) {
        setMacrosHoy({
          calorias: d.macros.cal || 0,
          proteinas: d.macros.prot || 0,
          carbos: d.macros.carb || 0,
          grasas: d.macros.gras || 0
        });
      } })
      .catch(console.error);
  };

  const fetchAlacena = () => {
    authFetch(`${API}/api/alacena?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.items) setAlacena(d.items); })
      .catch(console.error);
  };

  const fetchComidas = () => {
    authFetch(`${API}/api/nutricion/comidas-hoy?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.comidas) setComidasHoy(d.comidas); })
      .catch(console.error);
  };

  const fetchAyuno = () => {
    authFetch(`${API}/api/nutricion/ayuno?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => {
        if (d.ayuno) {
          setAyuno(d.ayuno);
          setMetaHorasLocal(d.ayuno.meta_horas || 16);
          if (d.ayuno.en_ayuno && d.ayuno.inicio) {
            localStorage.setItem(`vortice_ayuno_${perfil}`, JSON.stringify(d.ayuno));
          } else {
            localStorage.removeItem(`vortice_ayuno_${perfil}`);
          }
        }
      })
      .catch(console.error);
  };

  const fetchRachaAyuno = () => {
    authFetch(`${API}/api/graficos/timeline?perfil=${perfil}&limit=50`)
      .then(r => r.json())
      .then(d => {
        const hoy = new Date();
        const dias = Array.from({ length: 7 }, (_, i) => {
          const d2 = new Date(hoy);
          d2.setDate(hoy.getDate() - (6 - i));
          return { fecha: d2.toISOString().split('T')[0], completado: false };
        });
        if (d.eventos) {
          d.eventos.filter(ev => ev.tipo === 'AyunoCompletado').forEach(ev => {
            const fecha = (ev.timestamp || '').split('T')[0].split(' ')[0];
            const idx = dias.findIndex(d3 => d3.fecha === fecha);
            if (idx !== -1) dias[idx].completado = true;
          });
        }
        setRachaAyuno(dias);
      })
      .catch(() => {
        const hoy = new Date();
        setRachaAyuno(Array.from({ length: 7 }, (_, i) => {
          const d2 = new Date(hoy);
          d2.setDate(hoy.getDate() - (6 - i));
          return { fecha: d2.toISOString().split('T')[0], completado: false };
        }));
      });
  };

  const fetchMetas = () => {
    authFetch(`${API}/api/nutricion/metas?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.metas) setMetas(d.metas); })
      .catch(console.error);
  };

  const fetchWater = () => {
    authFetch(`${API}/api/nutricion/agua?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (typeof d.glasses === 'number') setWaterGlasses(d.glasses); })
      .catch(console.error);
  };

  const fetchHistorial = () => {
    authFetch(`${API}/api/nutricion/historial?perfil=${perfil}&dias=7`)
      .then(r => r.json())
      .then(d => { if (d.historial) setHistorial(d.historial); })
      .catch(console.error);
  };

  const addWater = async () => {
    try {
      const res = await authFetch(`${API}/api/nutricion/agua`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, glasses: 1 })
      });
      const d = await res.json();
      if (typeof d.glasses === 'number') setWaterGlasses(d.glasses);
    } catch (e) { console.error(e); }
  };

  const saveMetas = async (newMetas) => {
    try {
      await authFetch(`${API}/api/nutricion/metas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, ...newMetas })
      });
      setMetas(newMetas);
      setShowMetasEditor(false);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchMacros();
    fetchAlacena();
    fetchAyuno();
    fetchRachaAyuno();
    fetchComidas();
    fetchMetas();
    fetchWater();
    fetchHistorial();
  }, [perfil]);

  useEffect(() => {
    let interval;
    if (ayuno.en_ayuno && ayuno.inicio) {
      setTimeout(() => {
        const { str, pct, hrsDecimal: hd } = calcularTiempoAyuno(ayuno.inicio, ayuno.meta_horas);
        setHorasAyunoStr(str);
        setProgresoAyuno(pct);
        setHorasDecimal(hd);
      }, 0);
      interval = setInterval(() => {
        const { str: s, pct: p, hrsDecimal: hd } = calcularTiempoAyuno(ayuno.inicio, ayuno.meta_horas);
        setHorasAyunoStr(s);
        setProgresoAyuno(p);
        setHorasDecimal(hd);
      }, 1000);
    } else {
      setTimeout(() => {
        setHorasAyunoStr('00:00:00');
        setProgresoAyuno(0);
        setHorasDecimal(0);
      }, 0);
    }
    return () => clearInterval(interval);
  }, [ayuno]);

  const toggleAyuno = async () => {
    const nuevoEstado = !ayuno.en_ayuno;
    const inicio = nuevoEstado ? new Date().toISOString() : null;
    const metaActual = metaHorasLocal || ayuno.meta_horas || 16;
    const nuevoAyuno = { en_ayuno: nuevoEstado, inicio, meta_horas: metaActual };
    setAyuno(nuevoAyuno);
    if (nuevoEstado && inicio) {
      localStorage.setItem(`vortice_ayuno_${perfil}`, JSON.stringify(nuevoAyuno));
    } else {
      localStorage.removeItem(`vortice_ayuno_${perfil}`);
    }
    if (!nuevoEstado && ayuno.en_ayuno && progresoAyuno >= 100) {
      authFetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, mensaje: `¡Completé mis ${ayuno.meta_horas} horas de ayuno!` })
      }).catch(() => {});
    }
    try {
      await authFetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, en_ayuno: nuevoEstado, inicio_iso: inicio, meta_horas: metaActual })
      });
    } catch(e) { console.error(e); }
    fetchRachaAyuno();
  };

  const guardarMetaAyuno = async () => {
    const metaActual = metaHorasLocal;
    setAyuno(prev => ({ ...prev, meta_horas: metaActual }));
    try {
      await authFetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, en_ayuno: ayuno.en_ayuno, inicio_iso: ayuno.inicio, meta_horas: metaActual })
      });
    } catch(e) { console.error(e); }
    setShowAyunoSettings(false);
  };

  const buscarAlimento = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    setHybridResults([]);
    setSelectedFood(null);
    setHybridSource('');
    try {
      const res = await authFetch(`${API}/api/nutricion/buscar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, query: searchText })
      });
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setHybridResults(data.items);
        setHybridSource(data.source || '');
      } else {
        setHybridResults([]);
        setHybridSource('none');
      }
    } catch (e) { console.error(e); }
    setSearching(false);
  };

  const logFromCache = async (food) => {
    setLoggingFood(true);
    try {
      const res = await authFetch(`${API}/api/nutricion/log-from-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfil,
          alimento_id: food.id || null,
          nombre: food.nombre,
          cal_100: food.cal_100,
          prot_100: food.prot_100,
          carb_100: food.carb_100,
          fat_100: food.fat_100,
          gramos: gramosInput,
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSearchResult(data.logged);
        setSelectedFood(null);
        setHybridResults([]);
        setSearchText('');
        setGramosInput(100);
        fetchMacros();
        fetchComidas();
        fetchHistorial();
      }
    } catch (e) { console.error(e); }
    setLoggingFood(false);
  };

  const eliminarComida = async (id) => {
    await authFetch(`${API}/api/nutricion/evento/${id}?perfil=${perfil}`, { method: 'DELETE' });
    fetchComidas();
    fetchMacros();
  };

  const analizarFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAnalyzingPhoto(true);
    setPhotoResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await authFetch(`${API}/api/nutricion/analizar-foto?perfil=${perfil}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.resultado) { setPhotoResult(data.resultado); fetchMacros(); }
    } catch (e) { console.error(e); }
    setAnalyzingPhoto(false);
  };

  const agregarAlacena = async () => {
    if (!newIngrediente.trim()) return;
    await authFetch(`${API}/api/alacena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfil, ingrediente: newIngrediente, cantidad: '' })
    });
    setNewIngrediente('');
    fetchAlacena();
  };

  const eliminarAlacena = async (id) => {
    await authFetch(`${API}/api/alacena/${id}?perfil=${perfil}`, { method: 'DELETE' });
    fetchAlacena();
  };

  const guardarEdicion = async (id) => {
    await authFetch(`${API}/api/alacena/${id}?perfil=${perfil}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingrediente: editText })
    });
    setEditingId(null);
    fetchAlacena();
  };

  const pedirReceta = async () => {
    setLoadingReceta(true);
    setReceta('');
    try {
      const res = await authFetch(`${API}/api/alacena/receta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil })
      });
      const data = await res.json();
      if (data.receta) setReceta(data.receta);
    } catch (e) { console.error(e); }
    setLoadingReceta(false);
  };

  const macrosData = [
    { name: 'Prot', value: macrosHoy.proteinas || 0, color: '#3b82f6' },
    { name: 'Carb', value: macrosHoy.carbos || 0, color: '#10b981' },
    { name: 'Gras', value: macrosHoy.grasas || 0, color: '#f59e0b' }
  ];
  const totalMacros = macrosData.reduce((a, b) => a + b.value, 0);
  const DIAS_LABEL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  // Apple Watch-style rings data
  const rings = [
    { label: 'KCAL', value: macrosHoy.calorias, goal: metas.cal_goal, color: '#ef4444', radius: 52 },
    { label: 'PROT', value: macrosHoy.proteinas, goal: metas.prot_goal, color: '#3b82f6', radius: 42 },
    { label: 'CARB', value: macrosHoy.carbos, goal: metas.carb_goal, color: '#10b981', radius: 32 },
    { label: 'GRAS', value: macrosHoy.grasas, goal: metas.fat_goal, color: '#f59e0b', radius: 22 },
  ];

  // Nutrition score (0-100)
  const nutriScore = Math.round(
    rings.reduce((sum, r) => {
      const pct = r.goal > 0 ? r.value / r.goal : 0;
      return sum + Math.max(0, 100 - Math.abs(1 - pct) * 100);
    }, 0) / rings.length
  );

  return (
    <div className="view-container">
      
      {/* 1. Brújula Metabólica — Apple Watch Rings */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ color: '#06b6d4', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <GiTargetArrows size={14} /> BRÚJULA
          </h3>
          <button onClick={() => setShowMetasEditor(s => !s)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', borderRadius: '8px', padding: '0.35rem', cursor: 'pointer' }}>
            <FiEdit3 size={12} />
          </button>
        </div>

        {showMetasEditor && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
            {[
              { key: 'cal_goal', label: 'Kcal', unit: 'kcal' },
              { key: 'prot_goal', label: 'Proteínas', unit: 'g' },
              { key: 'carb_goal', label: 'Carbos', unit: 'g' },
              { key: 'fat_goal', label: 'Grasas', unit: 'g' },
            ].map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, width: '70px' }}>{f.label}</span>
                <input type="number" value={metas[f.key]} onChange={e => setMetas(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="premium-input" style={{ flex: 1, height: '2rem', fontSize: '0.75rem', textAlign: 'center' }} />
                <span style={{ fontSize: '0.6rem', color: '#64748b', width: '25px' }}>{f.unit}</span>
              </div>
            ))}
            <button onClick={() => saveMetas(metas)} className="btn-elite" style={{ width: '100%', height: '2rem', fontSize: '0.7rem', marginTop: '0.3rem' }}>GUARDAR METAS</button>
          </motion.div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* SVG Rings */}
          <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              {rings.map((r, i) => {
                const circ = 2 * Math.PI * r.radius;
                const pct = r.goal > 0 ? Math.min(r.value / r.goal, 1.5) : 0;
                return (
                  <g key={i}>
                    <circle cx="60" cy="60" r={r.radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                    <motion.circle
                      cx="60" cy="60" r={r.radius} fill="none" stroke={r.color} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - pct) }}
                      transition={{ duration: 1.2, delay: 0.2 + i * 0.15, ease: 'easeOut' }}
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', filter: `drop-shadow(0 0 4px ${r.color}50)` }}
                    />
                  </g>
                );
              })}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }}
                style={{ fontSize: '1.3rem', fontWeight: 900, color: nutriScore >= 80 ? '#22c55e' : nutriScore >= 50 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>
                {nutriScore}
              </motion.div>
              <span style={{ fontSize: '0.45rem', color: '#64748b', fontWeight: 800, marginTop: '0.1rem' }}>SCORE</span>
            </div>
          </div>

          {/* Stats column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {rings.map((r, i) => {
              const pct = r.goal > 0 ? Math.round((r.value / r.goal) * 100) : 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, width: '30px' }}>{r.label}</span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                      style={{ height: '100%', borderRadius: 99, background: r.color }} />
                  </div>
                  <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 900, width: '35px', textAlign: 'right' }}>
                    {r.label === 'KCAL' ? Math.round(r.value) : `${Math.round(r.value)}g`}
                  </span>
                  <span style={{ fontSize: '0.5rem', color: '#475569', fontWeight: 700 }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* 2. Ayuno Intermitente */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ background: 'rgba(15,23,42,0.95)', border: ayuno.en_ayuno ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{fontSize: '0.65rem', fontWeight: 900, display:'flex', alignItems:'center', gap:'0.4rem', color: '#06b6d4', letterSpacing: '0.5px'}}>
            <MdOutlineTimer size={14} /> AYUNO
          </h3>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button onClick={() => setShowAyunoSettings(s => !s)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', borderRadius: '8px', padding: '0.4rem' }}>
              <MdOutlineSettings size={14} />
            </button>
            <button onClick={toggleAyuno} className="btn-elite" style={{ padding:'0.4rem 0.8rem', background: ayuno.en_ayuno ? '#ef4444' : 'var(--accent-gym)', color:'black', fontSize: '0.75rem' }}>
              {ayuno.en_ayuno ? 'PARAR' : 'INICIAR'}
            </button>
          </div>
        </div>

        {showAyunoSettings && (
          <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {[12, 14, 16, 18, 20, 24].map(h => (
                <button key={h} onClick={() => setMetaHorasLocal(h)} className={`chip-folder-elite ${metaHorasLocal===h?'active':''}`} style={{fontSize:'0.7rem', padding:'0.4rem 0.8rem'}}>{h}H</button>
              ))}
            </div>
            <button onClick={guardarMetaAyuno} className="btn-elite" style={{ width: '100%', height: '2.4rem', fontSize: '0.8rem' }}>GUARDAR META</button>
          </div>
        )}

        {ayuno.en_ayuno && (() => {
          const etapa = getEtapaActual(horasDecimal);
          return (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="65" cy="65" r="58" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                  <circle cx="65" cy="65" r="58" fill="none" stroke={etapa.color} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 58}`} strokeDashoffset={`${2 * Math.PI * 58 * (1 - progresoAyuno / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 5px ${etapa.color})` }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: etapa.color }}>{horasAyunoStr.slice(0, 5)}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>DE {ayuno.meta_horas}H</div>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', background: `${etapa.color}15`, padding: '0.3rem 0.75rem', borderRadius: '10px', color: etapa.color, fontSize: '0.7rem', fontWeight: 900 }}>
                {etapa.badge.toUpperCase()}
              </div>
            </div>
          );
        })()}

        {rachaAyuno.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem' }}>
            {rachaAyuno.map((dia, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}
              >
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${dia.completado ? 'var(--accent-gym)' : 'rgba(255,255,255,0.05)'}`, background: dia.completado ? 'rgba(6,182,212,0.1)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {dia.completado && <FiCheck size={12} color="#06b6d4" />}
                </div>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800 }}>{DIAS_LABEL[new Date(dia.fecha + 'T12:00:00').getDay()]}</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 3. LOG DE COMIDAS */}
      {comidasHoy.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem' }}
        >
          <h3 style={{ fontSize: '0.65rem', fontWeight: 900, marginBottom: '0.75rem', color: '#06b6d4', letterSpacing: '0.5px' }}>LOG HOY</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {comidasHoy.map((c, cIdx) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + cIdx * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '0.6rem' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.descripcion}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <GiFlame size={11} color="#ef4444" /> {Math.round(c.calorias)} KCAL · P: {Math.round(c.proteinas)}g
                  </div>
                </div>
                <button onClick={() => eliminarComida(c.id)} className="btn-icon-elite danger" style={{ width: '32px', height: '32px' }}><X size={14} /></button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 4. BUSCADOR HÍBRIDO */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, marginBottom: '0.85rem', color: '#06b6d4', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Search size={12} /> REGISTRAR
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input value={searchText} onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarAlimento()} className="premium-input" placeholder="Buscar alimento..." style={{ flex: 1, height: '2.8rem', fontSize: '0.85rem' }} />
          <button className="btn-elite" style={{ width: '3rem', height: '2.8rem', padding: 0 }} onClick={buscarAlimento} disabled={searching}>
            {searching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          </button>
        </div>

        {/* Photo button */}
        <div style={{ marginTop: '0.5rem' }}>
          <label className="btn-elite" style={{ width: '100%', height: '2.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.03)' }}>
            <Camera size={14} /> {analyzingPhoto ? 'ANALIZANDO...' : 'FOTO'}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={analizarFoto} disabled={analyzingPhoto} />
          </label>
        </div>

        {/* Hybrid search source badge */}
        {hybridSource && hybridSource !== 'none' && hybridResults.length > 0 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{
              fontSize: '0.5rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '6px',
              background: hybridSource === 'cache' ? 'rgba(34,197,94,0.1)' : hybridSource === 'openfoodfacts' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)',
              color: hybridSource === 'cache' ? '#22c55e' : hybridSource === 'openfoodfacts' ? '#3b82f6' : '#a855f7',
            }}>
              {hybridSource === 'cache' ? '⚡ CACHE LOCAL' : hybridSource === 'openfoodfacts' ? '🌍 OPEN FOOD FACTS' : '🤖 GEMINI IA'}
            </span>
            <span style={{ fontSize: '0.5rem', color: '#475569' }}>{hybridResults.length} resultados</span>
          </div>
        )}

        {hybridSource === 'none' && !searching && (
          <p style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>Sin resultados. Probá con otro término.</p>
        )}

        {/* Search results list */}
        <AnimatePresence>
          {hybridResults.length > 0 && !selectedFood && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: '0.5rem', maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {hybridResults.slice(0, 8).map((food, idx) => (
                <motion.button
                  key={food.id || idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => { setSelectedFood(food); setGramosInput(100); }}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px', padding: '0.55rem 0.7rem', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.06)'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {food.nombre}
                    </div>
                    {food.marca && <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700 }}>{food.marca}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '0.1rem 0.35rem', borderRadius: '5px' }}>{Math.round(food.cal_100)}</span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '0.1rem 0.35rem', borderRadius: '5px' }}>{Math.round(food.prot_100)}P</span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected food detail panel */}
        <AnimatePresence>
          {selectedFood && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              style={{ marginTop: '0.6rem', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '14px', padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>{selectedFood.nombre}</div>
                  {selectedFood.marca && <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>{selectedFood.marca}</div>}
                </div>
                <button onClick={() => setSelectedFood(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
              </div>

              {/* Macros per 100g */}
              <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'KCAL', val: selectedFood.cal_100, color: '#ef4444' },
                  { label: 'PROT', val: selectedFood.prot_100, color: '#3b82f6' },
                  { label: 'CARB', val: selectedFood.carb_100, color: '#10b981' },
                  { label: 'GRAS', val: selectedFood.fat_100, color: '#f59e0b' },
                ].map(m => (
                  <span key={m.label} style={{ fontSize: '0.55rem', fontWeight: 900, color: m.color, background: `${m.color}15`, padding: '0.15rem 0.4rem', borderRadius: '6px' }}>
                    {Math.round(m.val)}{m.label === 'KCAL' ? '' : 'g'} {m.label}
                  </span>
                ))}
                <span style={{ fontSize: '0.45rem', color: '#475569', fontWeight: 700, alignSelf: 'center' }}>/ 100g</span>
              </div>

              {/* Grams input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800 }}>Porción:</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[50, 100, 150, 200, 300].map(g => (
                    <button key={g} onClick={() => setGramosInput(g)}
                      style={{
                        fontSize: '0.6rem', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer',
                        border: gramosInput === g ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        background: gramosInput === g ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                        color: gramosInput === g ? '#06b6d4' : '#94a3b8',
                      }}>{g}g</button>
                  ))}
                </div>
                <input type="number" value={gramosInput} onChange={e => setGramosInput(Math.max(1, parseInt(e.target.value) || 0))}
                  className="premium-input" style={{ width: '50px', height: '1.8rem', fontSize: '0.7rem', textAlign: 'center' }} />
              </div>

              {/* Scaled macros preview */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                {[
                  { label: 'Kcal', val: selectedFood.cal_100 * gramosInput / 100, color: '#ef4444' },
                  { label: 'Prot', val: selectedFood.prot_100 * gramosInput / 100, color: '#3b82f6' },
                  { label: 'Carb', val: selectedFood.carb_100 * gramosInput / 100, color: '#10b981' },
                  { label: 'Gras', val: selectedFood.fat_100 * gramosInput / 100, color: '#f59e0b' },
                ].map(m => (
                  <div key={m.label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: m.color }}>{Math.round(m.val)}</div>
                    <div style={{ fontSize: '0.45rem', color: '#64748b', fontWeight: 800 }}>{m.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => logFromCache(selectedFood)}
                disabled={loggingFood}
                className="btn-elite"
                style={{ width: '100%', height: '2.6rem', fontSize: '0.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                {loggingFood ? <Loader2 size={14} className="spin" /> : <><Plus size={14} /> REGISTRAR {gramosInput}g</>}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {searchResult && !selectedFood && hybridResults.length === 0 && <NutriResult data={searchResult} label="REGISTRADO" />}
        {photoResult && <NutriResult data={photoResult} label="FOTO" />}
      </motion.div>

      {/* 5. ALACENA */}
      <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem', borderLeft: '3px solid #f59e0b' }}>
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><GiCookingPot size={14} color="#f59e0b" /> ALACENA</h3>
        <div style={{display:'flex', gap:'0.5rem', marginTop:'0.75rem'}}>
          <input value={newIngrediente} onChange={e => setNewIngrediente(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregarAlacena()} className="premium-input" placeholder="Nuevo..." style={{ flex: 1, height: '2.8rem', fontSize: '0.85rem' }} />
          <button className="btn-elite" style={{width:'2.8rem', height:'2.8rem', padding: 0}} onClick={agregarAlacena}><Plus size={18} /></button>
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
           {alacena.map((item, aIdx) => (
             <motion.div
               key={item.id}
               initial={{ opacity: 0, scale: 0.85 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: aIdx * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
               whileTap={{ scale: 0.93 }}
               style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.75rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
             >
               <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{item.ingrediente}</span>
               <button onClick={() => eliminarAlacena(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={12} /></button>
             </motion.div>
           ))}
        </div>
        {alacena.length > 0 && (
          <button className="btn-elite" style={{ marginTop: '0.75rem', width: '100%', height: '2.8rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: '#f59e0b' }} onClick={pedirReceta} disabled={loadingReceta}>
            {loadingReceta ? <Loader2 size={16} className="spin" /> : <><GiMeal size={16} /> RECETA</>}
          </button>
        )}
        {receta && <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{receta}</div>}
      </div>

      {/* 6. WATER TRACKER */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IoWater size={14} color="#38bdf8" /> HIDRATACIÓN
          </h3>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: waterGlasses >= WATER_GOAL ? '#22c55e' : '#94a3b8' }}>
            {waterGlasses}/{WATER_GOAL}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {Array.from({ length: WATER_GOAL }, (_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 500, damping: 20 }}
                style={{
                  width: 28, height: 28, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < waterGlasses ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                  border: i < waterGlasses ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.3s',
                }}
              >
                <IoWater size={14} color={i < waterGlasses ? '#38bdf8' : '#334155'} />
              </motion.div>
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={addWater}
            style={{
              background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)',
              borderRadius: '10px', padding: '0.5rem 0.75rem', cursor: 'pointer',
              color: '#38bdf8', fontWeight: 900, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            <Plus size={14} /> 1
          </motion.button>
        </div>
        <div style={{ marginTop: '0.5rem', height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((waterGlasses / WATER_GOAL) * 100, 100)}%` }}
            transition={{ duration: 0.6 }}
            style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #38bdf8, #06b6d4)' }}
          />
        </div>
      </motion.div>

      {/* 7. HISTORIAL SEMANAL */}
      {historial.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
          <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: '#06b6d4', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <HiOutlineChartBar size={14} /> SEMANA
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.35rem', height: 80 }}>
            {(() => {
              const maxCal = Math.max(...historial.map(h => h.calorias || 0), 1);
              return historial.map((h, i) => {
                const pct = (h.calorias || 0) / maxCal;
                const day = new Date(h.fecha + 'T12:00:00');
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.5rem', color: '#94a3b8', fontWeight: 800 }}>{Math.round(h.calorias || 0)}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct * 55, 4)}px` }}
                      transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
                      style={{
                        width: '100%', borderRadius: '4px 4px 0 0',
                        background: pct > 0.8 ? 'linear-gradient(to top, #22c55e, #22c55e90)' : pct > 0.4 ? 'linear-gradient(to top, #f59e0b, #f59e0b90)' : 'linear-gradient(to top, #ef4444, #ef444490)',
                      }}
                    />
                    <span style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 800 }}>
                      {DIAS_LABEL[day.getDay()]}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </motion.div>
      )}
    </div>
  );
}

const NutriResult = ({ data, label }) => {
  const nombre = data.alimento || data.nombre || '—';
  const cal = Math.round(data.calorias || data.cal_100 || 0);
  const prot = Math.round(data.proteinas || data.prot_100 || 0);
  const carb = Math.round(data.carbos || data.carb_100 || 0);
  const fat = Math.round(data.grasas || data.fat_100 || 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: '0.75rem', background: 'rgba(6,182,212,0.05)', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(6,182,212,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
        <GiFlame size={14} color="#ef4444" />
        <span style={{ fontWeight: 900, fontSize: '0.75rem', color: 'white' }}>{label}: {nombre.toUpperCase()}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 900 }}>{cal} KCAL</span>
        <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 900 }}>{prot}g PROT</span>
        <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 900 }}>{carb}g CARB</span>
        <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 900 }}>{fat}g GRAS</span>
      </div>
    </motion.div>
  );
};
