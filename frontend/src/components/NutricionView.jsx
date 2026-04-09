import { useState, useEffect } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Camera, Search, Plus, X, ChefHat, Loader2, Flame, Clock, Play, Square, Settings, Pencil, Check, Info } from 'lucide-react';

const API = 'http://localhost:8000';

// Etapas biológicas del ayuno con información científica
const ETAPAS_AYUNO = [
  { 
    min: 0, max: 8, 
    nombre: 'Nivel Insulina Alto', 
    emoji: '🍎', 
    lottie: null,
    color: '#10b981', 
    glow: 'rgba(16,185,129,0.5)',
    badge: '🍎 Digestión',
    desc: 'Tu cuerpo está digiriendo la última comida. La insulina está alta.',
    beneficio: 'Procesando nutrientes. Bajando la persiana de la insulina.',
    tip: '¡Tomá agua con gas o té sin azúcar si te agarra el antojo!',
  },
  { 
    min: 8, max: 12, 
    nombre: 'Quema de Azúcar', 
    emoji: '🔥', 
    lottie: null,
    color: '#f59e0b', 
    glow: 'rgba(245,158,11,0.5)',
    badge: '🔥 Glucógeno',
    desc: 'El cuerpo agota las reservas de azúcar y empieza a buscar grasa.',
    beneficio: 'Empezando a movilizar las reservas. ¡Metele que vas bien!',
    tip: 'Un café negro te puede ayudar a pasar el hambre de las 10hs.',
  },
  { 
    min: 12, max: 18, 
    nombre: 'Quema de Grasa', 
    emoji: '💧', 
    lottie: null,
    color: '#f43f5e', 
    glow: 'rgba(244,63,94,0.5)',
    badge: '💧 Quema Grasa',
    desc: 'Nivel bajo de insulina. Tu cuerpo está usando grasa como combustible principal.',
    beneficio: '¡Fuego purificador! Estás quemando grasa a full.',
    tip: 'Si sentís mareo, poné una pizca de sal en el agua. ¡Electrolitos, che!',
  },
  { 
    min: 18, max: 24, 
    nombre: 'Cetosis', 
    emoji: '⚡', 
    lottie: null,
    color: '#38bdf8', 
    glow: 'rgba(56,189,248,0.5)',
    badge: '⚡ Cetosis',
    desc: 'Las cetonas suben fuerte. Tu cerebro está a 220 con grasa.',
    beneficio: 'Claridad mental total y desinflamación. Estás en la cresta de la ola.',
    tip: 'Momento ideal para laburar o estudiar: el cerebro vuela.',
  },
  { 
    min: 24, max: 48, 
    nombre: 'Autofagia', 
    emoji: '🌟', 
    lottie: null,
    color: '#a78bfa', 
    glow: 'rgba(167,139,250,0.5)',
    badge: '🌟 Renovación',
    desc: 'Tu cuerpo recicla células viejas. Una limpieza profunda de adentro hacia afuera.',
    beneficio: '¡Nivel Élite! Renovación celular y anti-aging natural.',
    tip: 'Paciencia, che. Ya pasaste lo más difícil.',
  },
  { 
    min: 48, max: Infinity, 
    nombre: 'Ayuno Profundo', 
    emoji: '💎', 
    lottie: null,
    color: '#ec4899', 
    glow: 'rgba(236,72,153,0.4)',
    badge: '💎 Diamante',
    desc: 'Autofagia al máximo. El sistema inmune se resetea.',
    beneficio: 'Modo supervivencia ancestral activado. Fuerza total.',
    tip: '⚠️ Ojo con esto: si vas por más de 48hs, consultá con un médico.',
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
  // Macros del día (real)
  const [macrosHoy, setMacrosHoy] = useState({ calorias: 0, proteinas: 0, carbos: 0, grasas: 0 });
  
  // Búsqueda de alimento
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  
  // Foto
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoResult, setPhotoResult] = useState(null);
  
  // Alacena + edición
  const [alacena, setAlacena] = useState([]);
  const [newIngrediente, setNewIngrediente] = useState('');
  const [receta, setReceta] = useState('');
  const [loadingReceta, setLoadingReceta] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Log de comidas del día
  const [comidasHoy, setComidasHoy] = useState([]);

  // Ayuno — inicializar desde localStorage para que sobreviva refresh
  const [ayuno, setAyuno] = useState(() => {
    try {
      const cached = localStorage.getItem(`vortice_ayuno_${perfil}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Solo usar si en_ayuno está activo
        if (parsed.en_ayuno && parsed.inicio) return parsed;
      }
    // eslint-disable-next-line no-empty
    } catch { /* cache miss */ }
    return { en_ayuno: false, inicio: null, meta_horas: 16 };
  });
  const [horasAyunoStr, setHorasAyunoStr] = useState('00:00:00');
  const [progresoAyuno, setProgresoAyuno] = useState(0);
  const [showAyunoSettings, setShowAyunoSettings] = useState(false);
  const [metaHorasLocal, setMetaHorasLocal] = useState(16);
  const [showEtapaInfo, setShowEtapaInfo] = useState(false);
  // Horas decimales para calcular etapa biológica  
  const [horasDecimal, setHorasDecimal] = useState(0);

  // Calcula el tiempo de ayuno desde el inicio
  const calcularTiempoAyuno = (inicioISO, metaHs) => {
    if (!inicioISO) return { str: '00:00:00', pct: 0, hrsDecimal: 0 };
    // Asegurar que el string tenga timezone UTC
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
  // Racha de 7 días (mock + futura integración)
  const [rachaAyuno, setRachaAyuno] = useState([]);

  const fetchMacros = () => {
    fetch(`${API}/api/nutricion/macros-hoy?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.macros) setMacrosHoy(d.macros); })
      .catch(console.error);
  };

  const fetchAlacena = () => {
    fetch(`${API}/api/alacena?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.items) setAlacena(d.items); })
      .catch(console.error);
  };

  const fetchComidas = () => {
    fetch(`${API}/api/nutricion/comidas-hoy?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.comidas) setComidasHoy(d.comidas); })
      .catch(console.error);
  };

  const fetchAyuno = () => {
    fetch(`${API}/api/nutricion/ayuno?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => {
        if (d.ayuno) {
          setAyuno(d.ayuno);
          setMetaHorasLocal(d.ayuno.meta_horas || 16);
          // Guardar en cache local para sobrevivir refresh
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
    // Genera racha de 7 días desde eventos
    fetch(`${API}/api/graficos/timeline?perfil=${perfil}&limit=50`)
      .then(r => r.json())
      .then(d => {
        const hoy = new Date();
        const dias = Array.from({ length: 7 }, (_, i) => {
          const d2 = new Date(hoy);
          d2.setDate(hoy.getDate() - (6 - i));
          return { fecha: d2.toISOString().split('T')[0], completado: false };
        });
        // Marcar días con ayuno completado
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
      // Calcular inmediatamente al montar (dentro de setTimeout para evitar cascading)
      setTimeout(() => {
        const { str, pct, hrsDecimal: hd } = calcularTiempoAyuno(ayuno.inicio, ayuno.meta_horas);
        setHorasAyunoStr(str);
        setProgresoAyuno(pct);
        setHorasDecimal(hd);
      }, 0);
      // Actualizar cada segundo
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

    // 1. ACTUALIZACIÓN OPTIMISTA: ring arranca al instante y persiste en localStorage
    setAyuno(nuevoAyuno);
    if (nuevoEstado && inicio) {
      localStorage.setItem(`vortice_ayuno_${perfil}`, JSON.stringify(nuevoAyuno));
    } else {
      localStorage.removeItem(`vortice_ayuno_${perfil}`);
    }
    
    // Si se termina y se completó el objetivo, notificar al coach
    if (!nuevoEstado && ayuno.en_ayuno && progresoAyuno >= 100) {
      fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, mensaje: `¡Completé mis ${ayuno.meta_horas} horas de ayuno intermitente!` })
      }).catch(() => {});
    }

    // 2. Guardar en BD
    try {
      await fetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, en_ayuno: nuevoEstado, inicio_iso: inicio, meta_horas: metaActual })
      });
    } catch(e) { console.error('Error guardando ayuno:', e); }
    
    fetchRachaAyuno();
  };

  const guardarMetaAyuno = async () => {
    const metaActual = metaHorasLocal;
    // Actualización optimista
    setAyuno(prev => ({ ...prev, meta_horas: metaActual }));
    try {
      await fetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // IMPORTANTE: preservar el inicio_iso actual del ayuno activo
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
      const res = await fetch(`${API}/api/nutricion/analizar-texto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, alimento: searchText })
      });
      const data = await res.json();
      if (data.resultado) {
        setSearchResult(data.resultado);
        fetchMacros();
        fetchComidas(); // refrescar el log del día
      }
    } catch (e) { console.error(e); }
    setSearching(false);
  };

  const eliminarComida = async (id) => {
    await fetch(`${API}/api/nutricion/evento/${id}?perfil=${perfil}`, { method: 'DELETE' });
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
      const res = await fetch(`${API}/api/nutricion/analizar-foto?perfil=${perfil}`, {
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
    await fetch(`${API}/api/alacena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfil, ingrediente: newIngrediente, cantidad: '' })
    });
    setNewIngrediente('');
    fetchAlacena();
  };

  const eliminarAlacena = async (id) => {
    await fetch(`${API}/api/alacena/${id}?perfil=${perfil}`, { method: 'DELETE' });
    fetchAlacena();
  };

  const guardarEdicion = async (id) => {
    await fetch(`${API}/api/alacena/${id}?perfil=${perfil}`, {
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
      const res = await fetch(`${API}/api/alacena/receta`, {
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
    { name: 'Proteína', value: macrosHoy.proteinas || 0, color: '#3b82f6' },
    { name: 'Carbohidratos', value: macrosHoy.carbos || 0, color: '#10b981' },
    { name: 'Grasas', value: macrosHoy.grasas || 0, color: '#f59e0b' }
  ];
  const totalMacros = macrosData.reduce((a, b) => a + b.value, 0);

  const DIAS_LABEL = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      
      {/* 1. Brújula Metabólica */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{color:'var(--accent-nutri)', fontSize: '1.1rem'}}>⚖️ Brújula del Día</h2>
          <div style={{ background: 'rgba(239,68,68,0.15)', padding: '0.3rem 0.8rem', borderRadius: '20px' }}>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.1rem' }}>{Math.round(macrosHoy.calorias)}</span>
            <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '0.25rem' }}>kcal</span>
          </div>
        </div>
        
        {totalMacros > 0 ? (
          <>
            <div style={{height: '160px', width: '100%', marginTop: '0.5rem'}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={macrosData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {macrosData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px', color: 'white' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:'flex', justifyContent:'space-around', marginTop:'-0.5rem'}}>
              {macrosData.map(m => (
                <div key={m.name} style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                  <div style={{width:'10px', height:'10px', background:m.color, borderRadius:'50%'}}></div>
                  <span style={{fontSize:'0.85rem', fontWeight:'700'}}>{Math.round(m.value)}g</span>
                  <span style={{fontSize:'0.7rem', color:'var(--text-secondary)'}}>{m.name}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted" style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '0.85rem' }}>
            No hay registros de hoy. Buscá un alimento o sacale foto a tu plato.
          </p>
        )}
      </div>

      {/* 2. Ayuno Intermitente */}
      <div className="card" style={{ background: ayuno.en_ayuno ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'var(--bg-card)', border: ayuno.en_ayuno ? '1px solid #10b981' : '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{fontSize: '1.1rem', display:'flex', alignItems:'center', gap:'0.5rem', color: ayuno.en_ayuno ? '#10b981' : 'var(--text-primary)'}}>
            <Clock size={18} /> Ayuno Intermitente
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Botón settings de horas */}
            <button
              onClick={() => setShowAyunoSettings(s => !s)}
              title="Configurar horas de ayuno"
              style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Settings size={15} />
            </button>
            <button onClick={toggleAyuno} className="btn" style={{width:'auto', padding:'0.4rem 0.8rem', background: ayuno.en_ayuno ? '#ef4444' : '#10b981', color:'white', fontWeight:'bold', border:'none', marginBottom: 0, display:'flex', alignItems:'center', gap:'0.5rem'}}>
              {ayuno.en_ayuno ? <><Square size={14} fill="currentColor" /> Terminar</> : <><Play size={14} fill="currentColor" /> Iniciar</>}
            </button>
          </div>
        </div>

        {/* Panel configuración de horas */}
        {showAyunoSettings && (
          <div style={{ marginTop: '1rem', background: 'var(--bg-outer)', borderRadius: '12px', padding: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              ⚙️ Meta de ayuno para hoy
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {[12, 14, 16, 18, 20, 24].map(h => (
                <button
                  key={h}
                  onClick={() => setMetaHorasLocal(h)}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer',
                    border: '1px solid', fontWeight: metaHorasLocal === h ? '700' : '400',
                    borderColor: metaHorasLocal === h ? '#10b981' : 'var(--border-color)',
                    background: metaHorasLocal === h ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: metaHorasLocal === h ? '#10b981' : 'var(--text-secondary)'
                  }}
                >
                  {h}h
                </button>
              ))}
            </div>
            <button onClick={guardarMetaAyuno} className="btn" style={{ background: '#10b981', color: 'white', marginBottom: 0, width: '100%', padding: '0.6rem' }}>
              Guardar meta
            </button>
          </div>
        )}

        {ayuno.en_ayuno && (() => {
          const etapa = getEtapaActual(horasDecimal);
          const proxima = getProximaEtapa(horasDecimal);
          const hsFaltanProxima = proxima ? (proxima.min - horasDecimal) : null;
          const casiEnProxima = hsFaltanProxima !== null && hsFaltanProxima <= 1;

          return (
            <div style={{ marginTop: '1.5rem' }}>

              {/* RING + ANIMATION */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                
                {/* Lottie / Stage icon animado */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  {etapa.lottie ? (
                    <Player
                      autoplay loop
                      src={etapa.lottie}
                      style={{ width: '64px', height: '64px' }}
                      onError={() => {}}
                    />
                  ) : (
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: `radial-gradient(circle, ${etapa.glow}, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2rem',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}>
                      {etapa.emoji}
                    </div>
                  )}
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem',
                    borderRadius: '20px', background: `${etapa.color}22`,
                    color: etapa.color, border: `1px solid ${etapa.color}44`,
                    whiteSpace: 'nowrap',
                  }}>
                    {etapa.badge}
                  </span>
                </div>

                {/* Ring Progress */}
                <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
                  <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Glow outer ring */}
                    <circle cx="80" cy="80" r="68" fill="none"
                      stroke={etapa.glow} strokeWidth="4" />
                    {/* Track */}
                    <circle cx="80" cy="80" r="68" fill="none"
                      stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                    {/* Progress */}
                    <circle cx="80" cy="80" r="68" fill="none"
                      stroke={etapa.color}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 68}`}
                      strokeDashoffset={`${2 * Math.PI * 68 * (1 - progresoAyuno / 100)}`}
                      style={{
                        transition: 'stroke-dashoffset 1s linear, stroke 0.5s',
                        filter: `drop-shadow(0 0 6px ${etapa.color})`,
                      }}
                    />
                  </svg>
                  {/* Centro */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: '1.4rem', fontFamily: 'monospace', fontWeight: 800, color: etapa.color, lineHeight: 1 }}>
                      {horasAyunoStr.slice(0, 5)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      de {ayuno.meta_horas}hs
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.15rem', color: etapa.color }}>
                      {Math.round(progresoAyuno)}%
                    </div>
                  </div>
                </div>

                {/* Botón info */}
                <button
                  onClick={() => setShowEtapaInfo(s => !s)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: showEtapaInfo ? `${etapa.color}33` : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${showEtapaInfo ? etapa.color : 'var(--border-color)'}`,
                    color: showEtapaInfo ? etapa.color : 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', alignSelf: 'center',
                  }}
                  title="Ver info de esta etapa"
                >
                  <Info size={16} />
                </button>
              </div>

              {/* PANEL DE INFORMACIÓN DE ETAPA */}
              {showEtapaInfo && (
                <div style={{
                  marginTop: '1rem',
                  background: `linear-gradient(135deg, ${etapa.color}11, ${etapa.color}06)`,
                  border: `1px solid ${etapa.color}33`,
                  borderRadius: '14px', padding: '1rem',
                  animation: 'slideUp 0.2s ease-out',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>{etapa.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 800, color: etapa.color, fontSize: '0.9rem' }}>
                        {etapa.nombre}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {etapa.min}h – {etapa.max === Infinity ? '∞' : `${etapa.max}h`}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                    {etapa.desc}
                  </p>
                  <div style={{
                    background: `${etapa.color}15`, borderRadius: '8px', padding: '0.5rem 0.75rem',
                    fontSize: '0.78rem', color: etapa.color, fontWeight: 600,
                  }}>
                    💡 {etapa.tip}
                  </div>
                </div>
              )}

              {/* ALERTA DE PRÓXIMA ETAPA */}
              {proxima && casiEnProxima && (
                <div style={{
                  marginTop: '0.75rem',
                  background: `linear-gradient(135deg, ${proxima.color}18, ${proxima.color}08)`,
                  border: `1px solid ${proxima.color}44`,
                  borderRadius: '12px', padding: '0.75rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <div style={{
                    fontSize: '1.5rem',
                    animation: 'bounce 1s ease-in-out infinite',
                  }}>
                    {proxima.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: proxima.color, fontSize: '0.85rem' }}>
                      ¡Casi en {proxima.nombre}!
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Te faltan {Math.round(hsFaltanProxima * 60)} min para desbloquear la siguiente fase.
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje motivacional */}
              {!casiEnProxima && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 500 }}>
                  {etapa.beneficio}
                </div>
              )}

            </div>
          );
        })()}



        {/* Racha de 7 días */}
        {rachaAyuno.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Racha semanal</p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {rachaAyuno.map((dia, i) => {
                const d = new Date(dia.fecha + 'T12:00:00');
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: dia.completado ? 'rgba(16,185,129,0.2)' : 'var(--bg-outer)',
                      border: `2px solid ${dia.completado ? '#10b981' : 'var(--border-color)'}`,
                      fontSize: '0.9rem'
                    }}>
                      {dia.completado ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{DIAS_LABEL[d.getDay()]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. LO QUE COMÍ HOY */}
      {comidasHoy.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            🥗 Lo que comí hoy
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {comidasHoy.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-outer)', borderRadius: '10px', padding: '0.6rem 0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0, minWidth: '38px' }}>
                  {c.timestamp ? c.timestamp.split(' ')[1]?.slice(0, 5) || '' : ''}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.descripcion}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    🔥 {Math.round(c.calorias)} kcal · P: {Math.round(c.proteinas)}g · C: {Math.round(c.carbos)}g · G: {Math.round(c.grasas)}g
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button
                    onClick={() => { setSearchText(c.descripcion); }}
                    title="Volver a registrar con edición"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => eliminarComida(c.id)}
                    title="Eliminar registro"
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.2rem' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Registrar Alimento */}
      <div className="card">
        <h2 style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'1.1rem'}}>
          <Search size={18} color="var(--accent-nutri)" /> Registrar Alimento
        </h2>
        <div style={{display:'flex', gap:'0.5rem', marginTop:'0.75rem'}}>
          <input 
            type="text" 
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarAlimento()}
            className="chat-input" 
            placeholder="Ej: 2 empanadas de carne"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" style={{width:'auto', padding:'0 1rem', marginBottom: 0}} onClick={buscarAlimento} disabled={searching}>
            {searching ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
          </button>
        </div>
        {searchResult && <NutriResult data={searchResult} label="Registrado" />}
        
        <div style={{ marginTop: '0.75rem' }}>
          <label className="btn btn-nutri" style={{ position: 'relative' }}>
            {analyzingPhoto ? <><Loader2 size={18} className="spin" /> Analizando...</> : <><Camera size={18} /> Analizar Plato con Foto</>}
            <input type="file" accept="image/*" style={{display:'none'}} onChange={analizarFoto} disabled={analyzingPhoto} />
          </label>
        </div>
        {photoResult && <NutriResult data={photoResult} label="Foto analizada" />}
      </div>

      {/* 4. Alacena Inteligente con Edición */}
      <div className="card" style={{borderLeft: '3px solid #f59e0b'}}>
        <h2 style={{ fontSize: '1.1rem' }}>🧺 Mi Alacena</h2>
        
        <div style={{display:'flex', gap:'0.5rem', marginTop:'0.75rem'}}>
          <input 
            type="text" 
            value={newIngrediente}
            onChange={e => setNewIngrediente(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarAlacena()}
            className="chat-input"
            placeholder="Agregar ingrediente..."
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" style={{width:'auto', padding:'0 1rem', marginBottom: 0}} onClick={agregarAlacena}>
            <Plus size={18} />
          </button>
        </div>

        {alacena.length > 0 ? (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alacena.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-outer)', borderRadius: '10px', padding: '0.5rem 0.75rem' }}>
                {editingId === item.id ? (
                  <>
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && guardarEdicion(item.id)}
                      className="chat-input"
                      style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      autoFocus
                    />
                    <button onClick={() => guardarEdicion(item.id)} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: '0.2rem' }}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}>
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.ingrediente}</span>
                      {item.calorias > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>~{item.calorias} kcal</span>
                      )}
                    </div>
                    <button 
                      onClick={() => { setEditingId(item.id); setEditText(item.ingrediente); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => eliminarAlacena(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.2rem' }}>
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>Alacena vacía. Agregá ingredientes para recibir recetas personalizadas.</p>
        )}

        {alacena.length > 0 && (
          <button className="btn" style={{ marginTop: '0.75rem', borderColor: '#f59e0b', color: '#f59e0b' }} onClick={pedirReceta} disabled={loadingReceta}>
            {loadingReceta ? <><Loader2 size={18} className="spin" /> Cocinando ideas...</> : <><ChefHat size={18} /> Generame una receta</>}
          </button>
        )}

        {receta && (
          <div style={{ marginTop: '0.75rem', background: 'var(--bg-outer)', padding: '1.25rem', borderRadius: '16px', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#f59e0b', fontWeight: 'bold' }}>
              <ChefHat size={18} /> Sugerencias del Chef Vórtice
            </div>
            {receta}
          </div>
        )}
      </div>
    </div>
  );
}

const NutriResult = ({ data, label }) => (
  <div style={{ marginTop: '0.75rem', background: 'var(--bg-outer)', borderRadius: '12px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Flame size={15} color="#ef4444" />
      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}: {data.alimento}</span>
    </div>
    {data.descripcion && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{data.descripcion}</p>}
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: '8px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 700 }}>{data.calorias} kcal</span>
      <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', borderRadius: '8px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>{data.proteinas}g prot</span>
      <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', borderRadius: '8px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>{data.carbos}g carbs</span>
      <span style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderRadius: '8px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>{data.grasas}g grasas</span>
    </div>
  </div>
);
