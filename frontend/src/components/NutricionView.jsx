import { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../config';

import BrujulaSection from './nutricion/BrujulaSection';
import AyunoSection from './nutricion/AyunoSection';
import HidratacionSection from './nutricion/HidratacionSection';
import AlacenaSection from './nutricion/AlacenaSection';
import LogSection from './nutricion/LogSection';
import CalendarSection from './nutricion/CalendarSection';
import TrendingSection from './nutricion/TrendingSection';

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
  return {
    str: `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`,
    pct: Math.min(100, (diffHrs / (metaHs || 16)) * 100),
    hrsDecimal: diffHrs,
  };
};

export default function NutricionView({ perfil, onNavigateTo, onShowToast }) {
  const [macrosHoy, setMacrosHoy] = useState({ calorias: 0, proteinas: 0, carbos: 0, grasas: 0 });
  const [metas, setMetas] = useState({ cal_goal: 2200, prot_goal: 150, carb_goal: 250, fat_goal: 70 });
  const [comidasHoy, setComidasHoy] = useState([]);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [historial, setHistorial] = useState([]);
  const [alacena, setAlacena] = useState([]);
  const [prefs, setPrefs] = useState({
    secciones: { hidratacion: true, ayuno: true, brujula: true, alacena: true, historial: true },
    agua_goal: 8,
    agua_unit: 'vaso',  // 'vaso' | 'botella' | 'litro'
    diet_mode: null,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [showPrefsPanel, setShowPrefsPanel] = useState(false);
  const brujulaRef = useRef(null);

  const [ayuno, setAyuno] = useState(() => {
    try {
      const cached = localStorage.getItem(`vortice_ayuno_${perfil}`);
      if (cached) { const p = JSON.parse(cached); if (p.en_ayuno && p.inicio) return p; }
    } catch {}
    return { en_ayuno: false, inicio: null, meta_horas: 16 };
  });
  const [horasAyunoStr, setHorasAyunoStr] = useState('00:00:00');
  const [progresoAyuno, setProgresoAyuno] = useState(0);
  const [horasDecimal, setHorasDecimal] = useState(0);
  const [metaHorasLocal, setMetaHorasLocal] = useState(16);
  const [rachaAyuno, setRachaAyuno] = useState([]);

  const fetchDashboard = () => {
    authFetch(`${API}/api/nutricion/dashboard-hoy?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => {
        if (d.status !== 'success') return;
        if (d.macros) setMacrosHoy({ calorias: d.macros.calorias || 0, proteinas: d.macros.proteinas || 0, carbos: d.macros.carbos || 0, grasas: d.macros.grasas || 0 });
        if (d.comidas) setComidasHoy(d.comidas);
        if (d.agua?.glasses != null) setWaterGlasses(d.agua.glasses);
        if (d.metas) setMetas(d.metas);
        if (d.historial) setHistorial(d.historial);
        if (d.ayuno) {
          setAyuno(d.ayuno);
          setMetaHorasLocal(d.ayuno.meta_horas || 16);
          if (d.ayuno.en_ayuno && d.ayuno.inicio) localStorage.setItem(`vortice_ayuno_${perfil}`, JSON.stringify(d.ayuno));
          else localStorage.removeItem(`vortice_ayuno_${perfil}`);
        }
      }).catch(console.error);
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
          const d2 = new Date(hoy); d2.setDate(hoy.getDate() - (6 - i));
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
          const d2 = new Date(hoy); d2.setDate(hoy.getDate() - (6 - i));
          return { fecha: d2.toISOString().split('T')[0], completado: false };
        }));
      });
  };

  const fetchPrefs = () => {
    authFetch(`${API}/api/nutricion/preferencias?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => {
        if (d.preferencias) setPrefs(prev => ({
          ...prev, ...d.preferencias,
          secciones: { ...prev.secciones, ...(d.preferencias.secciones || {}) },
        }));
      })
      .catch(() => {});
  };

  const savePrefs = async (newPrefs) => {
    setSavingPrefs(true);
    try {
      await authFetch(`${API}/api/nutricion/preferencias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, preferencias: newPrefs }),
      });
      setPrefs(newPrefs);
      onShowToast?.('¡Configuración guardada! 🎯', 'success');
      setShowPrefsPanel(false);
    } catch {}
    setSavingPrefs(false);
  };

  const saveMetas = async (newMetas) => {
    try {
      await authFetch(`${API}/api/nutricion/metas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, ...newMetas }),
      });
      setMetas(newMetas);
    } catch {}
  };

  const ML_PER_UNIT = { vaso: 250, botella: 500, litro: 1000 };

  const addWater = async () => {
    try {
      const res = await authFetch(`${API}/api/nutricion/agua`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, glasses: 1 }),
      });
      const d = await res.json();
      if (typeof d.glasses === 'number') setWaterGlasses(d.glasses);
    } catch {}
  };

  const setWater = async (n) => {
    try {
      const res = await authFetch(`${API}/api/nutricion/agua/set`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, glasses: Math.max(0, Math.round(n)) }),
      });
      const d = await res.json();
      if (typeof d.glasses === 'number') setWaterGlasses(d.glasses);
    } catch {}
  };

  const toggleAyuno = async (overrideMeta) => {
    const nuevoEstado = !ayuno.en_ayuno;
    const inicio = nuevoEstado ? new Date().toISOString() : null;
    // overrideMeta=0 means "libre" (no specific goal)
    const metaActual = overrideMeta === 0 ? 0 : (metaHorasLocal || ayuno.meta_horas || 16);
    if (overrideMeta === 0 && nuevoEstado) setMetaHorasLocal(0);
    const nuevoAyuno = { en_ayuno: nuevoEstado, inicio, meta_horas: metaActual };
    setAyuno(nuevoAyuno);
    if (nuevoEstado && inicio) localStorage.setItem(`vortice_ayuno_${perfil}`, JSON.stringify(nuevoAyuno));
    else localStorage.removeItem(`vortice_ayuno_${perfil}`);
    if (!nuevoEstado && ayuno.en_ayuno && progresoAyuno >= 100) {
      authFetch(`${API}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ perfil, mensaje: `¡Completé mis ${ayuno.meta_horas} horas de ayuno!` }) }).catch(() => {});
    }
    try {
      await authFetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, en_ayuno: nuevoEstado, inicio_iso: inicio, meta_horas: metaActual }),
      });
    } catch {}
    fetchRachaAyuno();
  };

  const guardarMetaAyuno = async (horas) => {
    const metaActual = horas ?? metaHorasLocal;
    setMetaHorasLocal(metaActual);
    setAyuno(prev => ({ ...prev, meta_horas: metaActual }));
    try {
      await authFetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, en_ayuno: ayuno.en_ayuno, inicio_iso: ayuno.inicio, meta_horas: metaActual }),
      });
    } catch {}
  };

  const handleDietModeChange = async (mode, preset) => {
    const newPrefs = { ...prefs, diet_mode: mode };
    setPrefs(newPrefs);
    if (mode && preset?.cal_goal) {
      await saveMetas({ cal_goal: preset.cal_goal, prot_goal: preset.prot_goal, carb_goal: preset.carb_goal, fat_goal: preset.fat_goal });
    }
    try {
      await authFetch(`${API}/api/nutricion/preferencias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, preferencias: newPrefs }),
      });
    } catch {}
    if (mode === 'keto') onShowToast?.('🥑 Modo Keto activado — metas ajustadas', 'success');
    else if (mode === 'if') onShowToast?.('⏱ Modo Ayuno IF activado', 'success');
    else if (mode === 'sinTACC') onShowToast?.('🌾 Modo Sin TACC activado', 'success');
    else onShowToast?.('Modo dieta desactivado', 'info');
  };

  const logFoodDirect = async ({ alimento, calorias, proteinas, carbos, grasas }) => {
    try {
      await authFetch(`${API}/api/nutricion/log-from-cache`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, nombre: alimento, cal_100: calorias, prot_100: proteinas, carb_100: carbos, fat_100: grasas, gramos: 100 }),
      });
      fetchDashboard();
    } catch {}
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
      const update = () => {
        const { str, pct, hrsDecimal: hd } = calcularTiempoAyuno(ayuno.inicio, ayuno.meta_horas);
        setHorasAyunoStr(str); setProgresoAyuno(pct); setHorasDecimal(hd);
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setHorasAyunoStr('00:00:00'); setProgresoAyuno(0); setHorasDecimal(0);
    }
    return () => clearInterval(interval);
  }, [ayuno]);

  const macroBarItems = [
    { label: 'KCAL', val: macrosHoy.calorias, goal: metas.cal_goal, color: 'var(--color-kcal)', unit: '' },
    { label: 'PROT', val: macrosHoy.proteinas, goal: metas.prot_goal, color: 'var(--color-prot)', unit: 'g' },
    { label: 'CARB', val: macrosHoy.carbos,    goal: metas.carb_goal, color: 'var(--color-carb)', unit: 'g' },
    { label: 'GRAS', val: macrosHoy.grasas,    goal: metas.fat_goal,  color: 'var(--color-gras)', unit: 'g' },
  ];

  return (
    <div className="view-container">

      {/* PREFERENCES PANEL */}
      <AnimatePresence>
        {showPrefsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end' }}
            onClick={e => e.target === e.currentTarget && setShowPrefsPanel(false)}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--surface-2)', borderRadius: '20px 20px 0 0', padding: '1.25rem 1.1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>Personalizar nutrición</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Elegí qué secciones querés ver</div>
                </div>
                <button onClick={() => setShowPrefsPanel(false)} style={{ background: 'var(--surface-3)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
              {[
                { key: 'brujula',     label: 'Brújula Metabólica', desc: 'Anillos de progreso diario' },
                { key: 'ayuno',       label: 'Ayuno Intermitente',  desc: 'Tracker y etapas' },
                { key: 'hidratacion', label: 'Hidratación',          desc: 'Contador de vasos de agua' },
                { key: 'alacena',     label: 'Alacena',              desc: 'Ingredientes y recetas IA' },
                { key: 'historial',   label: 'Historial semanal',    desc: 'Calendario 7 días' },
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
                      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, background: active ? 'var(--color-primary)' : 'var(--surface-3)', transition: 'background 0.2s', flexShrink: 0 }}>
                      <motion.div animate={{ x: active ? 22 : 3 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{ width: 18, height: 18, borderRadius: '50%', background: active ? '#000' : 'var(--text-muted)', position: 'absolute', top: 3 }} />
                    </motion.button>
                  </div>
                );
              })}
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

      {/* MACRO BAR */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        onClick={() => brujulaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '0.5rem' }}>
        {macroBarItems.map(m => {
          const pct = m.goal > 0 ? Math.min(Math.round((m.val / m.goal) * 100), 999) : 0;
          return (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: m.color, lineHeight: 1 }}>
                {Math.round(m.val)}<span style={{ fontSize: '0.48rem', fontWeight: 700 }}>{m.unit}</span>
              </span>
              <div style={{ width: '100%', height: 3, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', background: m.color, borderRadius: 99 }} />
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </motion.button>
        </div>
      </motion.div>

      {/* BRÚJULA */}
      {prefs.secciones.brujula !== false && (
        <div ref={brujulaRef}>
          <BrujulaSection
            macrosHoy={macrosHoy}
            metas={metas}
            onSaveMetas={saveMetas}
            onNavigateTo={onNavigateTo}
            dietMode={prefs.diet_mode}
            onDietModeChange={handleDietModeChange}
          />
        </div>
      )}

      {/* LOG + BUSCAR + CHIPS */}
      <LogSection
        perfil={perfil}
        comidasHoy={comidasHoy}
        onRefresh={fetchDashboard}
        onShowToast={onShowToast}
      />

      {/* AYUNO */}
      {prefs.secciones.ayuno !== false && (
        <AyunoSection
          ayuno={ayuno}
          horasAyunoStr={horasAyunoStr}
          progresoAyuno={progresoAyuno}
          horasDecimal={horasDecimal}
          metaHorasLocal={metaHorasLocal}
          rachaAyuno={rachaAyuno}
          onToggle={toggleAyuno}
          onMetaChange={guardarMetaAyuno}
        />
      )}

      {/* ALACENA */}
      {prefs.secciones.alacena !== false && (
        <AlacenaSection
          perfil={perfil}
          alacena={alacena}
          onRefresh={fetchAlacena}
          onShowToast={onShowToast}
          dietMode={prefs.diet_mode}
          onLogFood={logFoodDirect}
          onSearchIngrediente={(ingrediente) => {
            window.dispatchEvent(new CustomEvent('vortice:search', { detail: { query: ingrediente } }));
          }}
        />
      )}

      {/* TRENDING COMUNITARIO */}
      <TrendingSection
        onSearchFood={(nombre) => {
          window.dispatchEvent(new CustomEvent('vortice:search', { detail: { query: nombre } }));
        }}
      />

      {/* HIDRATACIÓN */}
      {prefs.secciones.hidratacion !== false && (
        <HidratacionSection
          waterGlasses={waterGlasses}
          waterGoal={prefs.agua_goal || 8}
          waterUnit={prefs.agua_unit || 'vaso'}
          onAddWater={addWater}
          onGoalChange={async (newGoal) => {
            const newPrefs = { ...prefs, agua_goal: newGoal };
            setPrefs(newPrefs);
            try {
              await authFetch(`${API}/api/nutricion/preferencias`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ perfil, preferencias: newPrefs }),
              });
            } catch {}
          }}
          onUnitChange={async (newUnit) => {
            // Default goals per unit so they make physical sense
            const UNIT_DEFAULTS = { vaso: 8, botella: 4, litro: 2 };
            const newGoal = UNIT_DEFAULTS[newUnit] || 8;
            const newPrefs = { ...prefs, agua_unit: newUnit, agua_goal: newGoal };
            setPrefs(newPrefs);
            // Reset count to 0 — conversión matemática confunde más de lo que ayuda
            setWaterGlasses(0);
            await setWater(0);
            onShowToast?.(`Unidad: ${newUnit === 'vaso' ? 'Vasos' : newUnit === 'botella' ? 'Botellas' : 'Litros'} · Meta: ${newGoal} · Conteo reiniciado`, 'info');
            try {
              await authFetch(`${API}/api/nutricion/preferencias`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ perfil, preferencias: newPrefs }),
              });
            } catch {}
          }}
          onSetWater={setWater}
        />
      )}

      {/* CALENDARIO SEMANAL */}
      {prefs.secciones.historial !== false && (
        <CalendarSection
          perfil={perfil}
          historial={historial}
        />
      )}
    </div>
  );
}
