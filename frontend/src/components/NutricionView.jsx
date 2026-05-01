import { useState, useEffect } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Camera, Search, Plus, X, Loader2 } from 'lucide-react';
import { GiFlame, GiCookingPot, GiMeal, GiHourglass, GiCheckMark } from 'react-icons/gi';
import { MdOutlineTimer, MdOutlineSettings, MdOutlineSearch, MdOutlineCameraAlt } from 'react-icons/md';
import { IoNutritionOutline } from 'react-icons/io5';
import { FiCheck } from 'react-icons/fi';
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

  useEffect(() => {
    fetchMacros();
    fetchAlacena();
    fetchAyuno();
    fetchRachaAyuno();
    fetchComidas();
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
    setSearchResult(null);
    try {
      const res = await authFetch(`${API}/api/nutricion/analizar-texto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, alimento: searchText })
      });
      const data = await res.json();
      if (data.resultado) {
        setSearchResult(data.resultado);
        fetchMacros();
        fetchComidas();
      }
    } catch (e) { console.error(e); }
    setSearching(false);
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

  return (
    <div className="view-container">
      
      {/* 1. Brújula Metabólica */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{color:'#06b6d4', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.5px'}}>BRÚJULA</h3>
          <div style={{ background: 'rgba(239,68,68,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
            <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '1rem' }}>{Math.round(macrosHoy.calorias)}</span>
            <span style={{ color: '#ef4444', fontSize: '0.6rem', marginLeft: '0.2rem', fontWeight: 800 }}>KCAL</span>
          </div>
        </div>
        
        {totalMacros > 0 ? (
          <>
            <div style={{height: '110px', width: '100%', marginTop: '0.5rem'}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={macrosData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {macrosData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '0.7rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:'flex', justifyContent:'space-around', marginTop:'-0.5rem'}}>
              {macrosData.map(m => (
                <div key={m.name} style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                  <span style={{fontSize:'0.85rem', fontWeight:'900'}}>{Math.round(m.value)}g</span>
                  <span style={{fontSize:'0.6rem', color:'var(--text-muted)', fontWeight: 800}}>{m.name.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>No hay registros hoy.</p>
        )}
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

      {/* 4. BUSCADOR */}
      <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
        <h3 style={{fontSize:'0.65rem', fontWeight: 900, marginBottom: '0.85rem', color: '#06b6d4', letterSpacing: '0.5px'}}>REGISTRAR</h3>
        <div style={{display:'flex', gap:'0.5rem'}}>
          <input value={searchText} onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarAlimento()} className="premium-input" placeholder="¿Qué comiste?" style={{ flex: 1, height: '2.8rem', fontSize: '0.85rem' }} />
          <button className="btn-elite" style={{width:'3rem', height:'2.8rem', padding: 0}} onClick={buscarAlimento} disabled={searching}>
            {searching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          </button>
        </div>
        <div style={{ marginTop: '0.75rem', display:'flex', gap:'0.5rem' }}>
           <label className="btn-elite" style={{ flex: 1, height: '2.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
             <Camera size={16} /> FOTO
             <input type="file" accept="image/*" style={{display:'none'}} onChange={analizarFoto} disabled={analyzingPhoto} />
           </label>
        </div>
        {searchResult && <NutriResult data={searchResult} label="REGISTRADO" />}
        {photoResult && <NutriResult data={photoResult} label="FOTO" />}
      </div>

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
    </div>
  );
}

const NutriResult = ({ data, label }) => (
  <div style={{ marginTop: '0.75rem', background: 'rgba(6,182,212,0.05)', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(6,182,212,0.1)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
      <GiFlame size={14} color="#ef4444" />
      <span style={{ fontWeight: 900, fontSize: '0.75rem', color: 'white' }}>{label}: {data.alimento.toUpperCase()}</span>
    </div>
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.65rem', fontWeight: 900 }}>{data.calorias} KCAL</span>
      <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.65rem', fontWeight: 900 }}>{data.proteinas}G PROT</span>
    </div>
  </div>
);
