import { useState, useEffect } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { Trophy, Flame, Target, CalendarDays, Activity, ChevronRight } from 'lucide-react';
import API from '../config';
import { useLanguage } from '../LanguageContext';

export default function GraficosView({ perfil }) {
  const { t, lang } = useLanguage();
  const [userData, setUserData] = useState({ level: 1, exp: 0 });
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/perfil/${perfil}`).then(r => r.ok ? r.json() : {}),
      fetch(`${API}/api/graficos/timeline?perfil=${perfil}&limit=1000`).then(r => r.ok ? r.json() : {})
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
  const hoy = new Date();
  const heatMapDays = [];
  // Últimos 28 días
  for (let i = 27; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Contar eventos GymSession o Gym para ese día
    const eventosDia = timeline.filter(ev => ev.timestamp && ev.timestamp.startsWith(dateStr) && (ev.type === 'GymSession' || ev.type === 'Gym'));
    heatMapDays.push({
      date: dateStr,
      diaSemana: d.getDay(),
      count: eventosDia.length,
      isActive: eventosDia.length > 0
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem', maxWidth: '500px', margin: '0 auto' }}>
      
      {/* 1. SECCIÓN DE GAMIFICACIÓN (EXP Y NIVEL) */}
      <div className="hevy-card" style={{ padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
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
      </div>

      {/* 2. CALENDARIO DE ENTRENAMIENTO (HEATMAP) */}
      <div className="hevy-card">
        <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 900, margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarDays size={20} color="#10b981" /> Racha de Entrenamiento
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
             <div key={d} style={{ textAlign: 'center', color: '#64748b', fontSize: '0.7rem', fontWeight: 800 }}>{d}</div>
          ))}
          {/* Rellenar espacios vacíos para que el primer día cuadre (simplificado) */}
          {Array(heatMapDays[0].diaSemana).fill(0).map((_, i) => <div key={`empty-${i}`}></div>)}
          
          {heatMapDays.map((dia, i) => (
             <div key={i} title={`${dia.date}: ${dia.count} eventos`} style={{
               aspectRatio: '1',
               borderRadius: '6px',
               background: dia.isActive ? (dia.count > 10 ? '#10b981' : 'rgba(16, 185, 129, 0.4)') : 'rgba(255,255,255,0.03)',
               border: dia.isActive ? '1px solid rgba(16, 185, 129, 0.8)' : '1px solid rgba(255,255,255,0.05)',
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               fontSize: '0.6rem', color: dia.isActive ? 'black' : 'transparent', fontWeight: 900,
               transition: 'all 0.2s', cursor: 'pointer'
             }}>
               {dia.isActive ? '✓' : ''}
             </div>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
          Si no entrenás por más de 1 día perdés EXP, pero nunca tu nivel. ¡Mantené la racha!
        </p>
      </div>

      {/* 3. RANKING Y LOGROS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="hevy-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem 1rem' }}>
          <Player autoplay loop src="https://assets2.lottiefiles.com/packages/lf20_t24tpvcu.json" style={{ width: '80px', height: '80px', marginBottom: '0.5rem' }} />
          <h4 style={{ color: 'white', margin: '0', fontSize: '1rem', fontWeight: 900 }}>Top 5%</h4>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>En tu categoría de edad</span>
        </div>

        <div className="hevy-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem 1rem' }}>
          <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '50%', marginBottom: '0.5rem' }}>
            <Activity size={40} color="#38bdf8" />
          </div>
          <h4 style={{ color: 'white', margin: '0', fontSize: '1rem', fontWeight: 900 }}>{timeline.filter(e => e.type === 'GymSession').length} Sesiones</h4>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Últimos 30 días</span>
        </div>
      </div>

    </div>
  );
}
