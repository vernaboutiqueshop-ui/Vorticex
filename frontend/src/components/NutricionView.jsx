import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Camera, Search, Plus, X, Loader2, Target, ChevronRight, History } from 'lucide-react';
import { GiFlame, GiCookingPot, GiMeal, GiTargetArrows } from 'react-icons/gi';
import { MdOutlineTimer } from 'react-icons/md';
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
    color: 'var(--color-prot)', 
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
    color: 'var(--color-kcal)', 
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
    color: 'var(--color-carb)', 
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
    color: 'var(--color-gras)', 
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

const FOOD_PLACEHOLDERS = [
  'Ej: 200g de pechuga con arroz...',
  'Ej: un choripán y una birra...',
  'Ej: humita al plato con queso...',
  'Ej: 2 medialunas y café con leche...',
  'Ej: pizza casera, 2 porciones...',
  'Ej: arroz con pollo casero...',
  'Ej: lomito completo...',
];

export default function NutricionView({ perfil, onNavigateTo, onShowToast }) {
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
  const [multiPending, setMultiPending] = useState([]);
  const [naturalItems, setNaturalItems] = useState([]);
  const [loggingMulti, setLoggingMulti] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');
  const [logSuccess, setLogSuccess] = useState(null);
  const [phIdx, setPhIdx] = useState(0);
  const suggestionTimer = useRef(null);
  const searchTimers = useRef([]);
  const brujulaRef = useRef(null);
  const searchInputRef = useRef(null);
  const [showPrefsPanel, setShowPrefsPanel] = useState(false);
  const [prefs, setPrefs] = useState({
    secciones: { hidratacion: true, ayuno: true, brujula: true, alacena: true, historial: true },
    agua_goal: 8,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [registrarTab, setRegistrarTab] = useState('texto'); // 'texto' | 'foto' | 'alacena'
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
  const WATER_GOAL = prefs.agua_goal || 8;
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

  const fetchDashboard = () => {
    authFetch(`${API}/api/nutricion/dashboard-hoy?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') {
          if (d.macros) {
            setMacrosHoy({
              calorias: d.macros.calorias || d.macros.cal || 0,
              proteinas: d.macros.proteinas || d.macros.prot || 0,
              carbos: d.macros.carbos || d.macros.carb || 0,
              grasas: d.macros.grasas || d.macros.gras || 0
            });
          }
          if (d.comidas) setComidasHoy(d.comidas);
          if (d.agua && typeof d.agua.glasses === 'number') setWaterGlasses(d.agua.glasses);
          if (d.metas) setMetas(d.metas);
          if (d.historial) setHistorial(d.historial);
          if (d.ayuno) {
            setAyuno(d.ayuno);
            setMetaHorasLocal(d.ayuno.meta_horas || 16);
            if (d.ayuno.en_ayuno && d.ayuno.inicio) {
              localStorage.setItem(`vortice_ayuno_${perfil}`, JSON.stringify(d.ayuno));
            } else {
              localStorage.removeItem(`vortice_ayuno_${perfil}`);
            }
          }
        }
      })
      .catch(console.error);
  };

  const fetchAlacena = () => {
    authFetch(`${API}/api/alacena?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.items) setAlacena(d.items); })
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

  const handleSearchInput = (val) => {
    setSearchText(val);
    clearTimeout(suggestionTimer.current);
    if (val.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestionTimer.current = setTimeout(async () => {
      try {
        const res = await authFetch(`${API}/api/nutricion/buscar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ perfil, query: val.trim() })
        });
        const data = await res.json();
        const items = [...(data.cache || []), ...(data.items || [])].slice(0, 5);
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch { setSuggestions([]); }
    }, 280);
  };

  const selectSuggestion = (food) => {
    setSelectedFood(food);
    setGramosInput(100);
    setShowSuggestions(false);
    setSuggestions([]);
    setHybridResults([]);
    setHybridSource('');
  };

  const fetchPrefs = () => {
    authFetch(`${API}/api/nutricion/preferencias?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.preferencias) setPrefs(d.preferencias); })
      .catch(() => {});
  };

  const savePrefs = async (newPrefs) => {
    setSavingPrefs(true);
    try {
      await authFetch(`${API}/api/nutricion/preferencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, preferencias: newPrefs })
      });
      setPrefs(newPrefs);
      onShowToast?.('¡Configuración guardada! La app se adapta a vos 🎯', 'success');
      setShowPrefsPanel(false);
    } catch (e) { console.error(e); }
    setSavingPrefs(false);
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
    fetchDashboard();
    fetchAlacena();
    fetchRachaAyuno();
    fetchPrefs();
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

  // Rotating placeholder
  useEffect(() => {
    const t = setInterval(() => setPhIdx(i => (i + 1) % FOOD_PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, []);

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

  const guardarMetaAyuno = async (horas) => {
    const metaActual = horas ?? metaHorasLocal;
    setAyuno(prev => ({ ...prev, meta_horas: metaActual }));
    try {
      await authFetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, en_ayuno: ayuno.en_ayuno, inicio_iso: ayuno.inicio, meta_horas: metaActual })
      });
    } catch(e) { console.error(e); }
  };

  const parseMultiFood = (text) => {
    const extractFood = (str) => {
      str = str.trim();
      // "300g pechuga" | "300 gramos pechuga" | "300 de pechuga" | "300 pechuga"
      const m = str.match(/^(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|gramos?\b|kg\b|de\b)?\s+(.+)$/i);
      if (m) return { nombre: m[2].trim(), gramos: parseFloat(m[1].replace(',', '.')) };
      // "pechuga 300g"
      const m2 = str.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|gramos?\b|kg\b)$/i);
      if (m2) return { nombre: m2[1].trim(), gramos: parseFloat(m2[2].replace(',', '.')) };
      return { nombre: str, gramos: null };
    };

    // Split by "y" if present
    if (/\s+y\s+/i.test(text)) {
      return text.trim().split(/\s+y\s+/i).map(extractFood);
    }

    // Detect multiple foods by number boundaries: "200 pechuga 300 arroz"
    const segments = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:g\b|gr\b|gramos?\b|kg\b|de\b)?\s+([a-záéíóúñüA-ZÁÉÍÓÚÑÜ][\w\sáéíóúñüÁÉÍÓÚÑÜ]+?)(?=\s+\d|$)/gi)];
    if (segments.length > 1) {
      return segments.map(m => ({ nombre: m[2].trim(), gramos: parseFloat(m[1].replace(',', '.')) }));
    }

    return [extractFood(text)];
  };

  const buscarAlimento = async () => {
    if (!searchText.trim()) return;
    const parts = parseMultiFood(searchText);

    if (parts.length > 1) {
      setSearching(true);
      setHybridResults([]);
      setSelectedFood(null);
      setHybridSource('');
      setMultiPending([]);
      setNaturalItems([]);
      const results = [];
      for (const part of parts) {
        try {
          const res = await authFetch(`${API}/api/nutricion/buscar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ perfil, query: part.nombre })
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
    setHybridResults([]);
    setSelectedFood(null);
    setHybridSource('');
    setMultiPending([]);
    setNaturalItems([]);
    // Phase messages so user knows what's happening
    searchTimers.current.forEach(clearTimeout);
    setSearchMsg('Buscando en tu historial...');
    searchTimers.current = [
      setTimeout(() => setSearchMsg('Analizando por similitud semántica...'), 550),
      setTimeout(() => setSearchMsg('✨ Consultando IA nutricional...'), 1400),
      setTimeout(() => setSearchMsg('Procesando respuesta...'), 3200),
    ];
    try {
      const res = await authFetch(`${API}/api/nutricion/buscar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, query: nombre })
      });
      const data = await res.json();
      if (data.source === 'natural' && data.natural_items?.length > 0) {
        setNaturalItems(data.natural_items);
        setHybridSource('natural');
      } else if (data.items && data.items.length > 0) {
        setHybridResults(data.items);
        setHybridSource(data.source || '');
        // Backend corrigió datos viejos incorrectos
        if (data.corrected && data.previous_cal) {
          onShowToast?.(`Dato corregido: antes ${data.previous_cal} kcal/100g, ahora ${Math.round(data.items[0]?.cal_100)} kcal/100g 🎯`, 'info');
        }
      } else {
        setHybridResults([]);
        setHybridSource('none');
      }
    } catch (e) { console.error(e); }
    searchTimers.current.forEach(clearTimeout);
    setSearchMsg('');
    setSearching(false);
  };

  const logAllMulti = async () => {
    setLoggingMulti(true);
    for (const item of multiPending) {
      if (!item.food) continue;
      try {
        await authFetch(`${API}/api/nutricion/log-from-cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            perfil,
            alimento_id: item.food.id || null,
            nombre: item.food.nombre,
            cal_100: item.food.cal_100,
            prot_100: item.food.prot_100,
            carb_100: item.food.carb_100,
            fat_100: item.food.fat_100,
            gramos: item.gramos,
          })
        });
      } catch {}
    }
    const total = multiPending.filter(i => i.food).reduce((s, i) => s + Math.round(i.food.cal_100 * i.gramos / 100), 0);
    if (total > 0) onShowToast?.(`${multiPending.filter(i=>i.food).length} alimentos registrados · ${total} kcal`, 'success');
    setMultiPending([]);
    setSearchText('');
    fetchDashboard();
setLoggingMulti(false);
  };

  const logAllNatural = async () => {
    setLoggingMulti(true);
    for (const item of naturalItems) {
      try {
        await authFetch(`${API}/api/nutricion/log-from-cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            perfil,
            nombre: `${item.nombre} (${item.cantidad} ${item.unidad})`,
            cal_100: item.kcal,
            prot_100: item.proteinas,
            carb_100: item.carbos,
            fat_100: item.grasas,
            gramos: 100,
          })
        });
      } catch {}
    }
    const totalKcal = naturalItems.reduce((s, i) => s + (i.kcal || 0), 0);
    if (totalKcal > 0) onShowToast?.(`${naturalItems.length} ítems registrados · ${Math.round(totalKcal)} kcal`, 'success');
    setNaturalItems([]);
    setSearchText('');
    fetchDashboard();
setLoggingMulti(false);
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
        const cal = Math.round(food.cal_100 * gramosInput / 100);
        onShowToast?.(`${food.nombre} · ${cal} kcal`, 'success');
        setLogSuccess(food.nombre);
        setTimeout(() => setLogSuccess(null), 1600);
        setSearchResult(data.logged);
        setSelectedFood(null);
        setHybridResults([]);
        setSuggestions([]);
        setShowSuggestions(false);
        setSearchText('');
        setGramosInput(100);
        fetchDashboard();
}
    } catch (e) { console.error(e); }
    setLoggingFood(false);
  };

  const eliminarComida = async (id) => {
    await authFetch(`${API}/api/nutricion/evento/${id}?perfil=${perfil}`, { method: 'DELETE' });
    fetchDashboard();
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
      if (data.resultado) { setPhotoResult(data.resultado); fetchDashboard();
}
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
    { name: 'Prot', value: macrosHoy.proteinas || 0, color: 'var(--color-prot)' },
    { name: 'Carb', value: macrosHoy.carbos || 0, color: 'var(--color-carb)' },
    { name: 'Gras', value: macrosHoy.grasas || 0, color: 'var(--color-gras)' }
  ];
  const totalMacros = macrosData.reduce((a, b) => a + b.value, 0);
  const DIAS_LABEL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  // Apple Watch-style rings data — semantic macro tokens
  const rings = [
    { label: 'KCAL', value: macrosHoy.calorias, goal: metas.cal_goal, color: 'var(--color-kcal)', colorHex: '#F59E0B', radius: 52 },
    { label: 'PROT', value: macrosHoy.proteinas, goal: metas.prot_goal, color: 'var(--color-prot)', colorHex: '#22C55E', radius: 42 },
    { label: 'CARB', value: macrosHoy.carbos, goal: metas.carb_goal, color: 'var(--color-carb)', colorHex: '#00C9FF', radius: 32 },
    { label: 'GRAS', value: macrosHoy.grasas, goal: metas.fat_goal, color: 'var(--color-gras)', colorHex: '#A78BFA', radius: 22 },
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

      {/* ── PREFERENCES PANEL OVERLAY ── */}
      <AnimatePresence>
        {showPrefsPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end' }}
            onClick={e => e.target === e.currentTarget && setShowPrefsPanel(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--surface-2)', borderRadius: '20px 20px 0 0', padding: '1.25rem 1.1rem', borderTop: '1px solid var(--border-subtle)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>Personalizar nutrición</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Elegí qué secciones querés ver</div>
                </div>
                <button onClick={() => setShowPrefsPanel(false)} style={{ background: 'var(--surface-3)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>

              {/* Section toggles */}
              {[
                { key: 'brujula',     label: 'Brújula Metabólica', desc: 'Anillos de progreso diario' },
                { key: 'ayuno',       label: 'Ayuno Intermitente',  desc: 'Tracker y etapas' },
                { key: 'hidratacion', label: 'Hidratación',          desc: 'Contador de vasos de agua' },
                { key: 'alacena',     label: 'Alacena',              desc: 'Ingredientes y recetas IA' },
                { key: 'historial',   label: 'Historial semanal',    desc: 'Gráfico de calorías 7 días' },
              ].map(sec => {
                const active = prefs.secciones[sec.key] !== false;
                return (
                  <div key={sec.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{sec.label}</div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{sec.desc}</div>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => setPrefs(p => ({ ...p, secciones: { ...p.secciones, [sec.key]: !active } }))}
                      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, background: active ? 'var(--color-primary)' : 'var(--surface-3)', transition: 'background 0.2s', flexShrink: 0 }}
                    >
                      <motion.div animate={{ x: active ? 22 : 3 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{ width: 18, height: 18, borderRadius: '50%', background: active ? '#000' : 'var(--text-muted)', position: 'absolute', top: 3 }} />
                    </motion.button>
                  </div>
                );
              })}

              {/* Water goal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', marginTop: '0.1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>Meta de agua</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Vasos diarios a alcanzar</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPrefs(p => ({ ...p, agua_goal: Math.max(1, (p.agua_goal || 8) - 1) }))}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-3)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 900, fontSize: '1rem' }}>−</motion.button>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--color-primary)', minWidth: 20, textAlign: 'center' }}>{prefs.agua_goal || 8}</span>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPrefs(p => ({ ...p, agua_goal: Math.min(20, (p.agua_goal || 8) + 1) }))}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-3)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 900, fontSize: '1rem' }}>+</motion.button>
                </div>
              </div>

              <motion.button whileTap={{ scale: 0.97 }} onClick={() => savePrefs(prefs)} disabled={savingPrefs}
                style={{ width: '100%', height: '2.8rem', marginTop: '1rem', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'var(--color-primary)', color: '#000', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                {savingPrefs ? <Loader2 size={16} className="spin" /> : '✓ GUARDAR CONFIGURACIÓN'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 0. MACRO BAR — clickable, scrolls to Brújula */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => brujulaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        style={{ order: 1, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '0.5rem' }}
      >
        {[
          { label: 'KCAL', val: macrosHoy.calorias, goal: metas.cal_goal, color: 'var(--color-kcal)', unit: '' },
          { label: 'PROT', val: macrosHoy.proteinas, goal: metas.prot_goal, color: 'var(--color-prot)', unit: 'g' },
          { label: 'CARB', val: macrosHoy.carbos, goal: metas.carb_goal, color: 'var(--color-carb)', unit: 'g' },
          { label: 'GRAS', val: macrosHoy.grasas, goal: metas.fat_goal, color: 'var(--color-gras)', unit: 'g' },
        ].map(m => {
          const pct = m.goal > 0 ? Math.min(Math.round((m.val / m.goal) * 100), 999) : 0;
          return (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: m.color, lineHeight: 1 }}>
                {Math.round(m.val)}<span style={{ fontSize: '0.48rem', fontWeight: 700 }}>{m.unit}</span>
              </span>
              <div style={{ width: '100%', height: 3, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', background: m.color, borderRadius: 99 }}
                />
              </div>
              <span style={{ fontSize: '0.4rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.2px' }}>{m.label} {pct}%</span>
            </div>
          );
        })}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
          <ChevronRight size={10} color="var(--text-muted)" />
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={e => { e.stopPropagation(); setShowPrefsPanel(true); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </motion.button>
        </div>
      </motion.div>

      {/* 1. Brújula Metabólica — Apple Watch Rings */}
      {prefs.secciones.brujula !== false && <motion.div
        ref={brujulaRef}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ order: 4, background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ color: 'var(--color-primary)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <GiTargetArrows size={14} /> BRÚJULA METABÓLICA
          </h3>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {onNavigateTo && (
              <button onClick={() => onNavigateTo('graficos')} style={{ background: 'var(--surface-2)', border: 'none', color: 'var(--text-secondary)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.5rem', fontWeight: 800 }}>
                <History size={10} /> HISTORIAL
              </button>
            )}
            <button onClick={() => setShowMetasEditor(s => !s)} style={{ background: showMetasEditor ? 'rgba(0,201,255,0.12)' : 'var(--surface-2)', border: showMetasEditor ? '1px solid rgba(0,201,255,0.3)' : 'none', color: showMetasEditor ? 'var(--color-primary)' : 'var(--text-muted)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.5rem', fontWeight: 800 }}>
              <Target size={10} /> METAS
            </button>
          </div>
        </div>
        {metas.cal_goal === 2200 && metas.prot_goal === 150 && !showMetasEditor && macrosHoy.calorias === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setShowMetasEditor(true)}
            style={{ background: 'rgba(0,201,255,0.06)', border: '1px dashed rgba(0,201,255,0.2)', borderRadius: '10px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={14} color="var(--color-primary)" />
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-primary)' }}>Configurá tus metas diarias</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Tocá para ajustar kcal, proteína, carbos y grasas según tu objetivo</div>
            </div>
            <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </motion.div>
        )}

        {showMetasEditor && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
            {[
              { key: 'cal_goal', label: 'Kcal', unit: 'kcal' },
              { key: 'prot_goal', label: 'Proteínas', unit: 'g' },
              { key: 'carb_goal', label: 'Carbos', unit: 'g' },
              { key: 'fat_goal', label: 'Grasas', unit: 'g' },
            ].map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, width: '70px' }}>{f.label}</span>
                <input type="number" value={metas[f.key]} onChange={e => setMetas(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="premium-input" style={{ flex: 1, height: '2rem', fontSize: '0.75rem', textAlign: 'center' }} />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', width: '25px' }}>{f.unit}</span>
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
                    <circle cx="60" cy="60" r={r.radius} fill="none" stroke="var(--surface-hover)" strokeWidth="6" />
                    <motion.circle
                      cx="60" cy="60" r={r.radius} fill="none" stroke={r.color} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - pct) }}
                      transition={{ duration: 1.2, delay: 0.2 + i * 0.15, ease: 'easeOut' }}
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', filter: `drop-shadow(0 0 5px ${r.colorHex || r.color}60)` }}
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

          {/* Stats column */}
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
      </motion.div>}

      {/* 2. Ayuno Intermitente */}
      {prefs.secciones.ayuno !== false && <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ order: 5, background: 'var(--surface-2)', border: `1px solid ${ayuno.en_ayuno ? 'rgba(0,201,255,0.3)' : 'var(--border-subtle)'}`, borderRadius: '18px', padding: '1rem 1.1rem', transition: 'border-color 0.5s' }}>

        {/* ── INACTIVO ── */}
        {!ayuno.en_ayuno && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <MdOutlineTimer size={18} color="var(--text-secondary)" />
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-primary)' }}>Ayuno Intermitente</div>
                <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>Elegí tu protocolo y comenzá</div>
              </div>
            </div>

            {/* Duration chips — minimal, single row */}
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.8rem', overflowX: 'auto' }}>
              {[12, 14, 16, 18, 20, 24].map(h => {
                const active = metaHorasLocal === h;
                const etapaChip = getEtapaActual(h - 0.1);
                return (
                  <motion.button key={h} whileTap={{ scale: 0.88 }}
                    onClick={() => { setMetaHorasLocal(h); guardarMetaAyuno(h); }}
                    style={{
                      flexShrink: 0, padding: '0.32rem 0.6rem', borderRadius: '8px', cursor: 'pointer', border: 'none',
                      background: active ? `${etapaChip.color}1a` : 'var(--surface-3)',
                      outline: active ? `1.5px solid ${etapaChip.color}60` : '1px solid var(--border-subtle)',
                      color: active ? etapaChip.color : 'var(--text-secondary)',
                      fontSize: '0.72rem', fontWeight: 900, transition: 'all 0.12s',
                    }}
                  >
                    {h}h
                  </motion.button>
                );
              })}
            </div>

            {/* Start button — compact */}
            <motion.button whileTap={{ scale: 0.97 }} onClick={toggleAyuno}
              style={{ width: '100%', height: '2.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'var(--color-primary)', color: '#000', fontWeight: 900, fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              }}
            >
              <MdOutlineTimer size={14} /> Iniciar {metaHorasLocal}h
            </motion.button>
          </div>
        )}

        {/* ── ACTIVO ── */}
        {ayuno.en_ayuno && (() => {
          const etapa = getEtapaActual(horasDecimal);
          const proxima = getProximaEtapa(horasDecimal);
          const metaH = ayuno.meta_horas || 16;
          const etapasTimeline = ETAPAS_AYUNO.filter(e => e.min < metaH);
          const progPct = Math.min((horasDecimal / metaH) * 100, 100);

          return (
            <div>
              {/* Timer row + Stop */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: etapa.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-1px' }}>
                    {horasAyunoStr.slice(0, 8)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 800 }}>DE {metaH}H</span>
                    <div style={{ height: 3, width: 40, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div animate={{ width: `${progPct}%` }} transition={{ duration: 1, ease: 'linear' }}
                        style={{ height: '100%', background: etapa.color, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: '0.5rem', color: etapa.color, fontWeight: 900 }}>{Math.round(progPct)}%</span>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.92 }} onClick={toggleAyuno}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.35)',
                    borderRadius: '10px', padding: '0.55rem 0.9rem', cursor: 'pointer',
                    color: '#ef4444', fontWeight: 900, fontSize: '0.72rem',
                    display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                  ⏹ PARAR
                </motion.button>
              </div>

              {/* Stage timeline */}
              <div style={{ marginBottom: '0.8rem' }}>
                {/* Colored segments */}
                <div style={{ position: 'relative', height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: '0.4rem' }}>
                  {etapasTimeline.map((stage, i) => {
                    const end = Math.min(stage.max, metaH);
                    const w = ((end - stage.min) / metaH) * 100;
                    return <div key={i} style={{ width: `${w}%`, background: stage.color, opacity: 0.2 }} />;
                  })}
                  {/* Progress fill */}
                  <motion.div
                    animate={{ width: `${progPct}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                    style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: `linear-gradient(90deg, ${etapa.color}90, ${etapa.color})`, borderRadius: 5 }}
                  />
                  {/* Current position dot */}
                  <motion.div
                    animate={{ left: `${Math.min(progPct, 97)}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                    style={{ position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
                      width: 16, height: 16, borderRadius: '50%', background: etapa.color,
                      border: '2px solid var(--surface-2)', boxShadow: `0 0 8px ${etapa.color}, 0 0 16px ${etapa.color}40` }}
                  />
                </div>

                {/* Stage boundary labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.38rem', color: 'var(--text-muted)', fontWeight: 700 }}>0h</span>
                  {etapasTimeline.slice(1).map((stage, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.38rem', fontWeight: 900, color: horasDecimal >= stage.min ? stage.color : 'var(--text-muted)' }}>{stage.min}h</span>
                      <span style={{ fontSize: '0.32rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', maxWidth: 30, overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage.nombre.split(' ')[0]}</span>
                    </div>
                  ))}
                  <span style={{ fontSize: '0.38rem', color: horasDecimal >= metaH ? 'var(--color-prot)' : 'var(--text-muted)', fontWeight: 900 }}>{metaH}h ✓</span>
                </div>
              </div>

              {/* Stage badge + next */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.6rem', background: `${etapa.color}0d`, borderRadius: '10px', border: `1px solid ${etapa.color}20` }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: etapa.color, boxShadow: `0 0 4px ${etapa.color}` }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: etapa.color }}>{etapa.badge}</span>
                  </div>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{etapa.tip}</span>
                </div>
                {proxima && (
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                    <div style={{ fontSize: '0.48rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Próxima etapa</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: proxima.color }}>{proxima.nombre}</div>
                    <div style={{ fontSize: '0.48rem', color: 'var(--text-muted)' }}>en {Math.max(0, proxima.min - horasDecimal).toFixed(1)}h</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Racha de días — siempre visible */}
        {rachaAyuno.length > 0 && (
          <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', padding: '0 0.1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            {rachaAyuno.map((dia, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.04, type: 'spring', stiffness: 500, damping: 28 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: dia.completado ? 'var(--color-primary)' : 'var(--surface-3)',
                  border: dia.completado ? '2px solid rgba(0,201,255,0.5)' : '1.5px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: dia.completado ? '0 0 8px rgba(0,201,255,0.35)' : 'none',
                }}>
                  {dia.completado
                    ? <FiCheck size={12} color="#000" strokeWidth={3} />
                    : null}
                </div>
                <span style={{ fontSize: '0.42rem', fontWeight: dia.completado ? 900 : 700, color: dia.completado ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                  {DIAS_LABEL[new Date(dia.fecha + 'T12:00:00').getDay()]}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>}

      {/* 3. LOG DE COMIDAS */}
      {comidasHoy.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ order: 3, background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '18px', padding: '1rem 1.1rem' }}
        >
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
              // Extract gramos from "Nombre (Xg)"
              const gramosMatch = c.descripcion?.match(/\((\d+)g\)$/);
              const gramos = gramosMatch ? gramosMatch[1] : null;
              const nombreBase = gramos ? c.descripcion.replace(/\s*\(\d+g\)$/, '') : c.descripcion;
              return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + cIdx * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface-1)', borderRadius: '12px', padding: '0.55rem 0.65rem', border: '1px solid var(--surface-hover)' }}
              >
                {/* Cal badge */}
                <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', background: `${calColor}18`, border: `1px solid ${calColor}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: calColor, lineHeight: 1 }}>{cal}</span>
                  <span style={{ fontSize: '0.38rem', fontWeight: 800, color: calColor, opacity: 0.7, letterSpacing: '0.3px' }}>KCAL</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>
                    {nombreBase}
                    {gramos && <span style={{ marginLeft: '0.3rem', fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(0,201,255,0.1)', padding: '0.05rem 0.3rem', borderRadius: '4px' }}>{gramos}g</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-prot)' }}>P <span style={{ color: 'var(--text-primary)' }}>{prot}g</span></span>
                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-carb)' }}>C <span style={{ color: 'var(--text-primary)' }}>{carb}g</span></span>
                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-gras)' }}>G <span style={{ color: 'var(--text-primary)' }}>{gras}g</span></span>
                  </div>
                </div>
                <button onClick={() => eliminarComida(c.id)} className="btn-icon-elite danger" style={{ width: '28px', height: '28px', flexShrink: 0 }}><X size={12} /></button>
              </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 4. BUSCADOR HÍBRIDO */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{ order: 2, background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.85rem', background: 'var(--surface-1)', borderRadius: '10px', padding: '0.2rem' }}>
          {[
            { id: 'texto', label: '✏️ Texto' },
            { id: 'foto', label: '📷 Foto' },
            { id: 'alacena', label: '🔖 Alacena' },
          ].map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => setRegistrarTab(tab.id)}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1, padding: '0.4rem 0.3rem', border: 'none', cursor: 'pointer', borderRadius: '8px', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.2px',
                background: registrarTab === tab.id ? 'var(--color-primary)' : 'transparent',
                color: registrarTab === tab.id ? '#000' : 'var(--color-text-muted)',
                transition: 'all 0.2s ease',
              }}
            >{tab.label}</motion.button>
          ))}
        </div>

        {/* Contenido según tab */}
        <AnimatePresence mode="wait">
          {registrarTab === 'texto' && (
            <motion.div key="texto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none', flexShrink: 0 }} />
                    <input
                      ref={searchInputRef}
                      value={searchText}
                      onChange={e => handleSearchInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { setShowSuggestions(false); buscarAlimento(); } if (e.key === 'Escape') setShowSuggestions(false); }}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      className="premium-input"
                      placeholder={FOOD_PLACEHOLDERS[phIdx]}
                      style={{ width: '100%', height: '2.8rem', fontSize: '0.85rem', paddingLeft: '2.2rem' }}
                    />
                  </div>
                  <motion.button whileTap={{ scale: 0.92 }} className="btn-elite" style={{ width: '3rem', height: '2.8rem', padding: 0, flexShrink: 0 }} onClick={() => { setShowSuggestions(false); buscarAlimento(); }} disabled={searching}>
                    {searching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                  </motion.button>
                </div>

                {/* AI phase messages */}
                <AnimatePresence>
                  {searching && searchMsg && (
                    <motion.div
                      key={searchMsg}
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.5rem', marginTop: '0.35rem', background: 'rgba(0,201,255,0.05)', borderRadius: '8px', border: '1px solid rgba(0,201,255,0.12)' }}
                    >
                      <Loader2 size={10} className="spin" color="var(--color-primary)" />
                      <span style={{ fontSize: '0.58rem', color: 'var(--color-primary)', fontWeight: 700 }}>{searchMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Autocomplete dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scaleY: 0.9 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -4, scaleY: 0.9 }}
                      transition={{ duration: 0.12 }}
                      style={{
                        position: 'absolute', top: '100%', left: 0, right: '3.5rem',
                        marginTop: '0.3rem', background: 'var(--surface-2)', border: '1px solid var(--border-default)',
                        borderRadius: '12px', overflow: 'hidden', zIndex: 50,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        transformOrigin: 'top',
                      }}
                    >
                      {suggestions.map((food, idx) => {
                        const cal = Math.round(food.cal_100 || 0);
                        const prot = Math.round(food.prot_100 || 0);
                        return (
                          <motion.button
                            key={idx}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => selectSuggestion(food)}
                            style={{
                              width: '100%', background: 'transparent', border: 'none',
                              borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                              padding: '0.55rem 0.75rem', cursor: 'pointer', display: 'flex',
                              alignItems: 'center', gap: '0.6rem', textAlign: 'left',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: `rgba(${cal > 400 ? '239,68,68' : cal > 200 ? '245,158,11' : '34,197,94'},0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem' }}>
                              {cal > 400 ? '🥩' : cal > 200 ? '🌾' : '🥗'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{food.nombre}</div>
                              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', marginTop: '0.1rem' }}>
                                <span style={{ color: 'var(--color-kcal)', fontWeight: 800 }}>{cal} kcal</span>
                                <span>P {prot}g</span>
                                {food.source && <span style={{ color: food.source.startsWith('semantic') ? 'var(--color-carb)' : 'var(--text-muted)', fontWeight: 700 }}>· {food.source.startsWith('semantic') ? '~' : '✓'}</span>}
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
            </motion.div>
          )}
          {registrarTab === 'foto' && (
            <motion.div key="foto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              <label className="btn-elite" style={{ width: '100%', height: '3.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(0,201,255,0.07)', border: '1px dashed rgba(0,201,255,0.3)', borderRadius: 'var(--radius-input)' }}>
                <Camera size={18} color="var(--color-primary)" /> {analyzingPhoto ? 'ANALIZANDO...' : 'Tocar para sacar foto'}
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={analizarFoto} disabled={analyzingPhoto} />
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success flash */}
        <AnimatePresence>
          {logSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -4 }}
              style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '0.4rem 0.7rem' }}
            >
              <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.35 }} style={{ fontSize: '0.9rem' }}>✓</motion.span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-prot)' }}>{logSuccess} registrado</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* "Did you mean?" badge — when semantic search corrected the query */}
        <AnimatePresence>
          {hybridSource === 'semantic' && hybridResults.length > 0 && searchText.trim() &&
           hybridResults[0]?.nombre?.toLowerCase() !== searchText.trim().toLowerCase() && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700 }}>IA detectó →</span>
              <span style={{ fontSize: '0.58rem', fontWeight: 900, color: 'var(--color-carb)', background: 'rgba(0,201,255,0.08)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>
                {hybridResults[0].nombre}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hybrid search source badge */}
        {hybridSource && hybridSource !== 'none' && hybridResults.length > 0 && (
          <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {(() => {
              const isSemantic = hybridSource === 'semantic';
              const isCache = hybridSource === 'cache';
              const isOFF = hybridSource === 'openfoodfacts';
              const isGemini = hybridSource === 'gemini';
              const isGroq = hybridSource === 'groq';
              return (
                <span style={{
                  fontSize: '0.5rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '6px',
                  background: isCache ? 'rgba(34,197,94,0.1)' : isOFF ? 'rgba(59,130,246,0.1)' : isSemantic ? 'rgba(0,201,255,0.1)' : isGroq ? 'rgba(251,146,60,0.1)' : 'rgba(168,85,247,0.1)',
                  color: isCache ? 'var(--color-prot)' : isOFF ? 'var(--color-primary)' : isSemantic ? 'var(--color-primary)' : isGroq ? '#fb923c' : 'var(--color-gras)',
                }}>
                  {isCache ? '⚡ CACHE' : isOFF ? '🌍 OPEN FOOD FACTS' : isSemantic ? '🔍 SEMÁNTICO' : isGemini ? '🤖 GEMINI' : '🦙 GROQ IA'}
                </span>
              );
            })()}
            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{hybridResults.length} resultados</span>
          </div>
        )}

        {hybridSource === 'none' && !searching && multiPending.length === 0 && naturalItems.length === 0 && (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>Sin resultados. Probá con otro término.</p>
        )}

        {/* Multi-food confirmation panel */}
        {multiPending.length > 0 && !searching && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {multiPending.map((item, idx) => {
              const cal = item.food ? Math.round(item.food.cal_100 * item.gramos / 100) : null;
              const prot = item.food ? Math.round(item.food.prot_100 * item.gramos / 100) : null;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 28 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    background: item.food ? 'rgba(0,201,255,0.05)' : 'rgba(239,68,68,0.05)',
                    border: `1px solid ${item.food ? 'rgba(0,201,255,0.18)' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius: '12px', padding: '0.6rem 0.75rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: item.food ? 'var(--text-primary)' : '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.food ? item.food.nombre : item.nombre}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.1rem' }}>
                      {item.food ? `${cal} kcal · ${prot}g prot` : 'Sin resultado'}
                    </div>
                  </div>
                  <input
                    type="number" value={item.gramos} min={1} max={2000}
                    onChange={e => setMultiPending(prev => prev.map((p, i) => i === idx ? { ...p, gramos: Number(e.target.value) || 100 } : p))}
                    className="hevy-input"
                    style={{ width: '56px', textAlign: 'center', padding: '0.3rem 0.2rem', fontSize: '0.8rem', fontWeight: 800 }}
                  />
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>g</span>
                </motion.div>
              );
            })}
            <button
              onClick={logAllMulti}
              disabled={loggingMulti || multiPending.every(i => !i.food)}
              className="btn-premium"
              style={{ marginTop: '0.1rem', fontSize: '0.75rem', height: '2.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              {loggingMulti ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
              REGISTRAR TODOS ({multiPending.filter(i => i.food).length}/{multiPending.length})
            </button>
          </div>
        )}

        {/* Natural portions panel */}
        {naturalItems.length > 0 && !searching && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 900, color: 'var(--color-gras)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>✦</span> IA DETECTÓ {naturalItems.length} ÍTEM{naturalItems.length > 1 ? 'S' : ''}
            </div>
            {naturalItems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 28 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(123,47,190,0.06)', border: '1px solid rgba(123,47,190,0.2)', borderRadius: '12px', padding: '0.6rem 0.75rem' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-gras)', marginTop: '0.1rem' }}>
                    {item.cantidad} {item.unidad} · <span style={{ color: '#00C9FF' }}>{item.kcal} kcal</span>
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.05rem' }}>
                    P <span style={{ color: 'var(--color-prot)' }}>{item.proteinas}g</span> · C <span style={{ color: 'var(--color-carb)' }}>{item.carbos}g</span> · G <span style={{ color: 'var(--color-gras)' }}>{item.grasas}g</span>
                  </div>
                </div>
              </motion.div>
            ))}
            <button
              onClick={logAllNatural}
              disabled={loggingMulti}
              className="btn-premium"
              style={{ marginTop: '0.1rem', fontSize: '0.75rem', height: '2.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              {loggingMulti ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
              REGISTRAR TODOS ({naturalItems.length})
            </button>
          </div>
        )}

        {/* Search results list */}
        <AnimatePresence>
          {hybridResults.length > 0 && !selectedFood && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: '0.5rem', maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {hybridResults.slice(0, 8).map((food, idx) => {
                const cal = Math.round(food.cal_100);
                // Dato sospechoso: >280 kcal/100g para comida con nombre de plato casero
                const isMultiWord = food.nombre?.split(' ').length >= 2;
                const suspicious = cal > 280 && isMultiWord && !food.marca;
                const calColor = suspicious ? 'var(--color-danger)' : cal > 250 ? 'var(--color-warning)' : 'var(--color-success)';
                const calBg = suspicious ? 'rgba(239,68,68,0.12)' : cal > 250 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)';
                return (
                  <motion.button
                    key={food.id || idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedFood(food); setGramosInput(100); }}
                    style={{
                      background: 'var(--surface-1)', border: `1px solid ${suspicious ? 'rgba(239,68,68,0.2)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-input)', padding: '0.6rem 0.75rem', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,201,255,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-1)'; }}
                  >
                    {/* Calorie pill */}
                    <div style={{ flexShrink: 0, background: calBg, border: `1px solid ${calColor}30`, borderRadius: '8px', padding: '0.25rem 0.45rem', textAlign: 'center', minWidth: '40px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: calColor, lineHeight: 1 }}>{cal}</div>
                      <div style={{ fontSize: '0.38rem', fontWeight: 800, color: calColor, opacity: 0.7 }}>KCAL</div>
                    </div>
                    {/* Name + macros */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {food.nombre}
                        </div>
                        {suspicious && <span style={{ fontSize: '0.42rem', fontWeight: 900, color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: '0.08rem 0.3rem', borderRadius: '4px', flexShrink: 0 }}>⚠️ VERIFICAR</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.55rem', marginTop: '0.2rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--color-prot)' }}>P:{Math.round(food.prot_100)}g</span>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--color-carb)' }}>C:{Math.round(food.carb_100)}g</span>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--color-gras)' }}>G:{Math.round(food.fat_100)}g</span>
                        <span style={{ fontSize: '0.48rem', color: 'var(--text-muted)' }}>/100g</span>
                      </div>
                    </div>
                    {/* Add button */}
                    <motion.div
                      whileTap={{ scale: 1.3 }} whileHover={{ scale: 1.1 }}
                      style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,201,255,0.12)', border: '1px solid rgba(0,201,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={14} color="var(--color-primary)" />
                    </motion.div>
                  </motion.button>
                );
              })}
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
              style={{ marginTop: '0.6rem', background: 'rgba(0,201,255,0.05)', border: '1px solid rgba(0,201,255,0.15)', borderRadius: '14px', padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>{selectedFood.nombre}</div>
                  {selectedFood.marca && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>{selectedFood.marca}</div>}
                </div>
                <button onClick={() => setSelectedFood(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
              </div>

              {/* Macros per 100g */}
              <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'KCAL', val: selectedFood.cal_100, color: 'var(--color-kcal)' },
                  { label: 'PROT', val: selectedFood.prot_100, color: 'var(--color-prot)' },
                  { label: 'CARB', val: selectedFood.carb_100, color: 'var(--color-carb)' },
                  { label: 'GRAS', val: selectedFood.fat_100, color: 'var(--color-gras)' },
                ].map(m => (
                  <span key={m.label} style={{ fontSize: '0.55rem', fontWeight: 900, color: m.color, background: `${m.color}15`, padding: '0.15rem 0.4rem', borderRadius: '6px' }}>
                    {Math.round(m.val)}{m.label === 'KCAL' ? '' : 'g'} {m.label}
                  </span>
                ))}
                <span style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 700, alignSelf: 'center' }}>/ 100g</span>
              </div>

              {/* Grams input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800 }}>Porción:</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[50, 100, 150, 200, 300].map(g => (
                    <button key={g} onClick={() => setGramosInput(g)}
                      style={{
                        fontSize: '0.6rem', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer',
                        border: gramosInput === g ? '1px solid rgba(0,201,255,0.4)' : '1px solid var(--surface-2)',
                        background: gramosInput === g ? 'rgba(0,201,255,0.12)' : 'var(--surface-1)',
                        color: gramosInput === g ? 'var(--color-primary)' : 'var(--text-secondary)',
                      }}>{g}g</button>
                  ))}
                </div>
                <input type="number" value={gramosInput} onChange={e => setGramosInput(Math.max(1, parseInt(e.target.value) || 0))}
                  className="premium-input" style={{ width: '50px', height: '1.8rem', fontSize: '0.7rem', textAlign: 'center' }} />
              </div>

              {/* Scaled macros preview */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', padding: '0.4rem', background: 'var(--surface-2)', borderRadius: '8px' }}>
                {[
                  { label: 'Kcal', val: selectedFood.cal_100 * gramosInput / 100, color: 'var(--color-kcal)' },
                  { label: 'Prot', val: selectedFood.prot_100 * gramosInput / 100, color: 'var(--color-prot)' },
                  { label: 'Carb', val: selectedFood.carb_100 * gramosInput / 100, color: 'var(--color-carb)' },
                  { label: 'Gras', val: selectedFood.fat_100 * gramosInput / 100, color: 'var(--color-gras)' },
                ].map(m => (
                  <div key={m.label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: m.color }}>{Math.round(m.val)}</div>
                    <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', fontWeight: 800 }}>{m.label.toUpperCase()}</div>
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
      {prefs.secciones.alacena !== false && <div style={{ order: 6, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '1rem 1.1rem', borderLeft: '3px solid var(--color-kcal)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-kcal)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <GiCookingPot size={14} color="var(--color-kcal)" /> ALACENA
          </h3>
          {alacena.length > 0 && (
            <button className="btn-elite" style={{ height: '1.8rem', padding: '0 0.6rem', fontSize: '0.58rem', background: 'rgba(245,158,11,0.12)', color: 'var(--color-kcal)', border: '1px solid rgba(245,158,11,0.25)' }} onClick={pedirReceta} disabled={loadingReceta}>
              {loadingReceta ? <Loader2 size={12} className="spin" /> : <><GiMeal size={12} /> SUGERIR RECETA</>}
            </button>
          )}
        </div>

        {/* Input styled consistently */}
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
          <motion.button whileTap={{ scale: 0.9 }} className="btn-elite" style={{ width: '2.6rem', height: '2.6rem', padding: 0, flexShrink: 0 }} onClick={agregarAlacena}>
            <Plus size={16} />
          </motion.button>
        </div>

        {/* Chips — tappable: click to search that ingredient */}
        {alacena.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
            Tu alacena está vacía — agregá ingredientes para obtener recetas personalizadas
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {alacena.map((item, aIdx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: aIdx * 0.03, type: 'spring', stiffness: 500, damping: 28 }}
                style={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: '20px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border-subtle)' }}
              >
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => { setRegistrarTab('texto'); handleSearchInput(item.ingrediente); setSearchText(item.ingrediente); buscarAlimento(); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.35rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}
                >
                  {item.ingrediente}
                </motion.button>
                <button onClick={() => eliminarAlacena(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem 0.45rem 0.35rem 0', lineHeight: 1 }}>
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
      </div>}

      {/* 6. WATER TRACKER */}
      {prefs.secciones.hidratacion !== false && <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{ order: 7, background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IoWater size={14} color="var(--color-primary)" /> HIDRATACIÓN
          </h3>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: waterGlasses >= WATER_GOAL ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
            {waterGlasses}/{WATER_GOAL}
          </span>
        </div>

        {/* Mensaje motivacional */}
        <AnimatePresence mode="wait">
          <motion.p
            key={waterGlasses}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginBottom: '0.65rem', fontWeight: 600 }}
          >
            {waterGlasses === 0 ? '¡Empezá a hidratarte! 💧' :
             waterGlasses <= 2 ? 'Buen comienzo, seguí así 💧' :
             waterGlasses <= 4 ? '¡Vas por la mitad! 💪' :
             waterGlasses <= 7 ? '¡Casi llegás! 🔥' :
             '¡Meta cumplida! 🎉'}
          </motion.p>
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Gotas SVG animadas */}
          <div style={{ flex: 1, display: 'flex', gap: '0.25rem' }}>
            {Array.from({ length: WATER_GOAL }, (_, i) => {
              const filled = i < waterGlasses;
              return (
                <motion.button
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.05 + i * 0.04, type: 'spring', stiffness: 500, damping: 22 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={filled ? undefined : addWater}
                  style={{
                    flex: 1, height: 38, borderRadius: '10px', cursor: filled ? 'default' : 'pointer',
                    padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
                    border: filled ? '1px solid rgba(0,201,255,0.3)' : '1px solid var(--color-border)',
                    background: filled ? 'rgba(0,201,255,0.1)' : 'var(--surface-1)',
                  }}
                >
                  <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                    <path d="M9 1C9 1 1 9.5 1 14a8 8 0 0016 0C17 9.5 9 1 9 1Z"
                      fill={filled ? 'var(--color-primary)' : 'var(--surface-3)'}
                      stroke={filled ? 'rgba(0,201,255,0.5)' : 'var(--border-default)'}
                      strokeWidth="1"
                    />
                  </svg>
                  {filled && (
                    <motion.div
                      layoutId={`water-fill-${i}`}
                      style={{ position: 'absolute', inset: 0, background: 'rgba(0,201,255,0.08)', borderRadius: '9px' }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.05 }}
            onClick={addWater}
            disabled={waterGlasses >= WATER_GOAL}
            style={{
              background: waterGlasses >= WATER_GOAL ? 'rgba(34,197,94,0.15)' : 'rgba(0,201,255,0.12)',
              border: `1px solid ${waterGlasses >= WATER_GOAL ? 'rgba(34,197,94,0.3)' : 'rgba(0,201,255,0.25)'}`,
              borderRadius: '10px', padding: '0.5rem 0.75rem', cursor: waterGlasses >= WATER_GOAL ? 'default' : 'pointer',
              color: waterGlasses >= WATER_GOAL ? 'var(--color-success)' : 'var(--color-primary)',
              fontWeight: 900, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0,
            }}
          >
            {waterGlasses >= WATER_GOAL ? '✓' : <><Plus size={14} /> 1</>}
          </motion.button>
        </div>

        <div style={{ marginTop: '0.6rem', height: 3, background: 'var(--surface-hover)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((waterGlasses / WATER_GOAL) * 100, 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: waterGlasses >= WATER_GOAL ? 'var(--color-success)' : 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }}
          />
        </div>
      </motion.div>}

      {/* 7. HISTORIAL SEMANAL */}
      {prefs.secciones.historial !== false && historial.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          style={{ order: 8, background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
          <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
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
                    <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', fontWeight: 800 }}>{Math.round(h.calorias || 0)}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct * 55, 4)}px` }}
                      transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
                      style={{
                        width: '100%', borderRadius: '4px 4px 0 0',
                        background: pct > 0.8 ? 'linear-gradient(to top, #22c55e, #22c55e90)' : pct > 0.4 ? 'linear-gradient(to top, #f59e0b, #f59e0b90)' : 'linear-gradient(to top, #ef4444, #ef444490)',
                      }}
                    />
                    <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 800 }}>
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
      style={{ marginTop: '0.75rem', background: 'rgba(0,201,255,0.05)', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(0,201,255,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
        <GiFlame size={14} color="#ef4444" />
        <span style={{ fontWeight: 900, fontSize: '0.75rem', color: 'white' }}>{label}: {nombre.toUpperCase()}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 900 }}>{cal} KCAL</span>
        <span style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 900 }}>{prot}g PROT</span>
        <span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-prot)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 900 }}>{carb}g CARB</span>
        <span style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-kcal)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.6rem', fontWeight: 900 }}>{fat}g GRAS</span>
      </div>
    </motion.div>
  );
};
