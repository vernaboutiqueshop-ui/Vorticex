import { useState, useEffect } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { Trophy, Flame, Target, CalendarDays, Activity, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
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

  if (loading) return <div className="loading-state">Calculando estadísticas...</div>;

  // Cálculos de EXP
  const level = userData.level || 1;
  const exp = userData.exp || 0;
  const expParaSiguiente = level * 1000;
  const expActualNivel = exp % 1000;
  const pctProgreso = Math.min(100, Math.max(0, (expActualNivel / expParaSiguiente) * 100));

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
      
      {/* 1. SECCIÓN DE GAMIFICACIÓN (EXP Y NIVEL) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1.1rem', position: 'relative', overflow: 'hidden' }}>
        {/* Lottie Fire background sutil */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', opacity: 0.1, transform: 'scale(1.5)' }}>
            <Player autoplay loop src="https://assets3.lottiefiles.com/packages/lf20_touohxv0.json" style={{ width: '150px', height: '150px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', zIndex: 2 }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)', border: '3px solid #1e293b'
          }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{level}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.3rem' }}>
               <h2 style={{ color: 'white', margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>Nivel {level}</h2>
               <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.9rem' }}>{getRango(level)}</span>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.5)', height: '14px', borderRadius: '10px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ 
                width: `${pctProgreso}%`, height: '100%', 
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                borderRadius: '10px', transition: 'width 1s ease-in-out'
              }}></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              <span>{expActualNivel} EXP</span>
              <span>{expParaSiguiente} EXP</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. CALENDARIO DE ENTRENAMIENTO (HEATMAP) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
           <h3 style={{ color: '#06b6d4', fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, letterSpacing: '0.5px' }}>
             <CalendarDays size={14} color="#06b6d4" /> RACHA
           </h3>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
             <button onClick={() => setHeatmapMonthOffset(prev => prev - 1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}><ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /></button>
             <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 800, minWidth: '85px', textAlign: 'center', textTransform: 'capitalize' }}>
               {new Date(new Date().setMonth(new Date().getMonth() + heatmapMonthOffset)).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).replace('.', '')}
             </span>
             <button onClick={() => setHeatmapMonthOffset(prev => prev + 1)} disabled={heatmapMonthOffset >= 0} style={{ background: 'transparent', border: 'none', color: heatmapMonthOffset >= 0 ? 'transparent' : '#94a3b8', cursor: heatmapMonthOffset >= 0 ? 'default' : 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}><ChevronRight size={16} /></button>
           </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, idx) => (
             <div key={`${d}-${idx}`} style={{ textAlign: 'center', color: '#64748b', fontSize: '0.7rem', fontWeight: 800 }}>{d}</div>
          ))}
          
          {heatMapDays.map((dia, i) => {
             if (dia.empty) return <div key={`empty-${i}`} style={{ aspectRatio: '1', borderRadius: '6px' }}></div>;
             return (
               <div key={dia.date} title={`${dia.date}: ${dia.count} eventos`} style={{
                 aspectRatio: '1',
                 borderRadius: '6px',
                 background: dia.isActive ? (dia.count > 10 ? '#10b981' : 'rgba(16, 185, 129, 0.4)') : 'rgba(255,255,255,0.03)',
                 border: dia.isActive ? '1px solid rgba(16, 185, 129, 0.8)' : '1px solid rgba(255,255,255,0.05)',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 fontSize: '0.6rem', color: dia.isActive ? 'black' : '#64748b', fontWeight: 900,
                 transition: 'all 0.2s', cursor: 'pointer'
               }}>
                 {dia.isActive ? '✓' : dia.date.split('-')[2]}
               </div>
             )
          })}
        </div>
        <p style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'center', marginTop: '0.85rem', marginBottom: 0, fontWeight: 600 }}>
          Si no entrenás por más de 1 día perdés EXP, pero nunca tu nivel. ¡Mantené la racha!
        </p>
      </motion.div>

      {/* 3. RANKING Y LOGROS */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.1rem' }}>
          <Player autoplay loop src="https://assets2.lottiefiles.com/packages/lf20_t24tpvcu.json" style={{ width: '70px', height: '70px', marginBottom: '0.4rem' }} />
          <h4 style={{ color: 'white', margin: '0', fontSize: '1rem', fontWeight: 900 }}>Top 5%</h4>
          <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem', fontWeight: 600 }}>En tu categoría de edad</span>
        </div>

        <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.1rem' }}>
          <div style={{ width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,182,212,0.08)', borderRadius: '50%', marginBottom: '0.4rem' }}>
            <Activity size={36} color="#06b6d4" />
          </div>
          <h4 style={{ color: 'white', margin: '0', fontSize: '1rem', fontWeight: 900 }}>{timeline.filter(e => e.type === 'GymSession').length} Sesiones</h4>
          <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem', fontWeight: 600 }}>Últimos 30 días</span>
        </div>
      </motion.div>

    </div>
  );
}
