import { useState, useEffect } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { Trophy, Flame, Target, CalendarDays, Activity, ChevronRight, Star, Zap, Apple } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import API, { authFetch } from '../config';
import { useLanguage } from '../LanguageContext';

export default function GraficosView({ perfil }) {
  const { t, lang } = useLanguage();
  const [userData, setUserData] = useState({ level: 1, exp: 0 });
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heatmapMonthOffset, setHeatmapMonthOffset] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch(`${API}/api/perfil/${perfil}`).then(r => r.ok ? r.json() : {}),
      authFetch(`${API}/api/graficos/timeline?perfil=${perfil}&limit=1000`).then(r => r.ok ? r.json() : {})
    ]).then(([profile, time]) => {
      if (profile.perfil) setUserData(profile.perfil);
      if (time.eventos) setTimeline(time.eventos);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [perfil]);

  if (loading) return (
    <div className="view-container">
      {[1,2,3].map(i => (
        <div key={i} className="skeleton" style={{ height: i === 1 ? 120 : 80, borderRadius: 16, marginBottom: 0 }} />
      ))}
    </div>
  );

  // Cálculos de EXP
  const level = userData.level || 1;
  const exp = userData.exp || 0;
  const expParaSiguiente = level * 1000;
  const expActualNivel = exp % 1000;
  const pctProgreso = Math.min(100, Math.max(0, (expActualNivel / expParaSiguiente) * 100));

  // Datos para charts (últimos 7 días)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const eventos = timeline.filter(ev => ev.timestamp?.startsWith(dateStr));
    const kcal = eventos.filter(e => e.type === 'Nutricion').reduce((s, e) => s + (e.val1 || 0), 0);
    const sesiones = eventos.filter(e => e.type === 'GymSession' || e.type === 'Gym').length;
    return {
      dia: ['Do','Lu','Ma','Mi','Ju','Vi','Sá'][d.getDay()],
      kcal: Math.round(kcal),
      sesiones,
    };
  });

  // Racha actual
  const rachaActual = (() => {
    let racha = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hasSesion = timeline.some(ev => ev.timestamp?.startsWith(dateStr) && (ev.type === 'GymSession' || ev.type === 'Gym'));
      if (hasSesion) racha++;
      else if (i > 0) break;
    }
    return racha;
  })();

  // Logros
  const totalSesiones = timeline.filter(e => e.type === 'GymSession').length;
  const totalNutricion = [...new Set(timeline.filter(e => e.type === 'Nutricion').map(e => e.timestamp?.split('T')[0]))].length;
  const logros = [
    { id: 'racha7', icon: '🔥', label: 'Racha 7 días', unlocked: rachaActual >= 7 },
    { id: 'sesiones10', icon: '💪', label: '10 entrenos', unlocked: totalSesiones >= 10 },
    { id: 'nutri7', icon: '🥗', label: '7 días nutrición', unlocked: totalNutricion >= 7 },
    { id: 'nivel5', icon: '⭐', label: 'Nivel 5', unlocked: level >= 5 },
    { id: 'sesiones50', icon: '🏆', label: '50 sesiones', unlocked: totalSesiones >= 50 },
    { id: 'racha30', icon: '🚀', label: 'Racha 30 días', unlocked: rachaActual >= 30 },
  ];

  // Rango / Ranking basado en nivel
  const getRango = (lvl) => {
    if (lvl < 5) return "Novato";
    if (lvl < 15) return "Entusiasta";
    if (lvl < 30) return "Avanzado";
    if (lvl < 50) return "Atleta";
    return "Élite";
  };

  // Cálculos para el Heatmap (Calendario)
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + heatmapMonthOffset);
  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  
  const heatMapDays = [];
  // Agregar días vacíos para alinear el inicio del mes (0 = Domingo)
  for (let i = 0; i < startOfMonth.getDay(); i++) {
     heatMapDays.push({ empty: true });
  }

  for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const eventosDia = timeline.filter(ev => ev.timestamp && ev.timestamp.startsWith(dateStr) && (ev.type === 'GymSession' || ev.type === 'Gym'));
    heatMapDays.push({
      date: dateStr,
      diaSemana: d.getDay(),
      count: eventosDia.length,
      isActive: eventosDia.length > 0
    });
  }

  return (
    <div className="view-container">

      {/* 1. EXP + NIVEL con gradiente animado */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1.1rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(0,201,255,0.06)', filter: 'blur(24px)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative', zIndex: 2 }}>
          <motion.div
            animate={{ boxShadow: ['0 0 12px rgba(0,201,255,0.3)', '0 0 24px rgba(123,47,190,0.4)', '0 0 12px rgba(0,201,255,0.3)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--color-card)', flexShrink: 0 }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>{level}</span>
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
              <h2 style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Nivel {level}</h2>
              <span style={{ color: 'var(--color-warning)', fontWeight: 800, fontSize: '0.8rem' }}>{getRango(level)}</span>
            </div>
            {/* EXP bar con gradiente primary→accent */}
            <div style={{ background: 'rgba(0,0,0,0.4)', height: 10, borderRadius: 99, overflow: 'hidden', border: '1px solid var(--surface-2)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctProgreso}%` }}
                transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
                style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))', boxShadow: '0 0 8px rgba(0,201,255,0.4)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.62rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              <span>{expActualNivel} EXP</span><span>{expParaSiguiente} EXP</span>
            </div>
          </div>
        </div>

        {/* Racha counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '0.35rem 0.75rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🔥</span>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-warning)', lineHeight: 1 }}>{rachaActual}</div>
              <div style={{ fontSize: '0.48rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>RACHA</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(0,201,255,0.08)', border: '1px solid rgba(0,201,255,0.15)', borderRadius: '10px', padding: '0.35rem 0.75rem' }}>
            <Activity size={16} color="var(--color-primary)" />
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1 }}>{totalSesiones}</div>
              <div style={{ fontSize: '0.48rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>SESIONES</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. CHART Kcal últimos 7 días */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem' }}>
        <h3 style={{ color: 'var(--color-primary)', fontSize: '0.65rem', fontWeight: 900, margin: '0 0 0.85rem', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Apple size={13} /> KCAL — ÚLTIMOS 7 DÍAS
        </h3>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={last7Days} barSize={22}>
            <XAxis dataKey="dia" tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: '0.7rem', color: 'var(--color-text)' }} cursor={{ fill: 'rgba(0,201,255,0.05)' }} />
            <Bar dataKey="kcal" radius={[6,6,0,0]}>
              {last7Days.map((d, i) => (
                <Cell key={i} fill={d.kcal > 1500 ? 'var(--color-success)' : d.kcal > 800 ? 'var(--color-primary)' : 'rgba(255,255,255,0.12)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* 3. HEATMAP (calendario) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
        style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h3 style={{ color: 'var(--color-primary)', fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, letterSpacing: '0.5px' }}>
            <CalendarDays size={14} /> CALENDARIO
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-hover)', padding: '0.15rem 0.4rem', borderRadius: '10px' }}>
            <button onClick={() => setHeatmapMonthOffset(p => p - 1)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.15rem', display: 'flex' }}><ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /></button>
            <span style={{ color: 'var(--color-text)', fontSize: '0.72rem', fontWeight: 800, minWidth: '80px', textAlign: 'center', textTransform: 'capitalize' }}>
              {new Date(new Date().setMonth(new Date().getMonth() + heatmapMonthOffset)).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).replace('.', '')}
            </span>
            <button onClick={() => setHeatmapMonthOffset(p => p + 1)} disabled={heatmapMonthOffset >= 0} style={{ background: 'transparent', border: 'none', color: heatmapMonthOffset >= 0 ? 'transparent' : 'var(--color-text-muted)', cursor: heatmapMonthOffset >= 0 ? 'default' : 'pointer', padding: '0.15rem', display: 'flex' }}><ChevronRight size={14} /></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
          {['D','L','M','M','J','V','S'].map((d, i) => (
            <div key={`h-${i}`} style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.62rem', fontWeight: 800 }}>{d}</div>
          ))}
          {heatMapDays.map((dia, i) => {
            if (dia.empty) return <div key={`e-${i}`} style={{ aspectRatio: '1' }} />;
            return (
              <motion.div key={dia.date} whileHover={{ scale: 1.1 }} title={`${dia.date}: ${dia.count} sesiones`}
                style={{ aspectRatio: '1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 900, transition: 'all 0.2s',
                  background: dia.isActive ? (dia.count > 2 ? 'var(--color-success)' : 'rgba(34,197,94,0.35)') : 'var(--surface-1)',
                  border: dia.isActive ? '1px solid rgba(34,197,94,0.6)' : '1px solid var(--surface-hover)',
                  color: dia.isActive ? (dia.count > 2 ? '#000' : 'var(--color-prot)') : 'var(--color-text-muted)',
                }}>
                {dia.isActive ? '✓' : new Date(dia.date + 'T12:00:00').getDate()}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 4. LOGROS */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
        style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem' }}>
        <h3 style={{ color: 'var(--color-primary)', fontSize: '0.65rem', fontWeight: 900, margin: '0 0 0.85rem', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Trophy size={13} /> LOGROS
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {logros.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + i * 0.06 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', padding: '0.75rem 0.5rem', borderRadius: '12px', background: l.unlocked ? 'rgba(0,201,255,0.06)' : 'var(--surface-1)', border: `1px solid ${l.unlocked ? 'rgba(0,201,255,0.2)' : 'var(--surface-2)'}`, filter: l.unlocked ? 'none' : 'grayscale(1)', opacity: l.unlocked ? 1 : 0.4 }}>
              <span style={{ fontSize: '1.5rem' }}>{l.icon}</span>
              <span style={{ fontSize: '0.52rem', fontWeight: 800, color: l.unlocked ? 'var(--color-text)' : 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{l.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

    </div>
  );
}
