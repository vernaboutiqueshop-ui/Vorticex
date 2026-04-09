import { useState, useEffect, useCallback } from 'react';
import { Play, Plus, Search, Dumbbell, Brain, X, CheckCircle2, Clock, RotateCcw, Image as ImageIcon, ChevronDown, ChevronUp, Timer } from 'lucide-react';

/**
 * GymView - El Módulo de Entrenamiento de Vórtice
 * Rediseñado para UX Premium, Localización Argentina y Simplicidad.
 */
export default function GymView({ perfil, pendingRutina, onRutinaLoaded }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [gifModal, setGifModal] = useState(null);
  const [misRutinas, setMisRutinas] = useState([]);
  const [showMisRutinas, setShowMisRutinas] = useState(false);
  const [showGuardarModal, setShowGuardarModal] = useState(false);
  const [nombreRutina, setNombreRutina] = useState('');
  
  // AI Generator
  const [promptRutina, setPromptRutina] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Planner / Session State
  const [rutina, setRutina] = useState([]); 
  const [sessionActive, setSessionActive] = useState(false);
  const [timer, setTimer] = useState(0);
  
  // Mover pendingRutina a rutina cuando esté presente (desde el Chat)
  useEffect(() => {
    if (pendingRutina && pendingRutina.length > 0) {
      setRutina(pendingRutina.map(e => ({
        ...e,
        sets: e.sets && e.sets.length > 0 ? e.sets : [{reps:'12',kg:'',done:false},{reps:'12',kg:'',done:false},{reps:'12',kg:'',done:false}]
      })));
      if (onRutinaLoaded) onRutinaLoaded();
    }
  }, [pendingRutina, onRutinaLoaded]);
  
  // Feedback post-entrenamiento
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [sessionDataToSave, setSessionDataToSave] = useState(null);
  
  // Rest Timer
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [descansoPreferido, setDescansoPreferido] = useState(90); 
  
  // Ejercicios colapsados
  const [collapsedExercises, setCollapsedExercises] = useState(new Set());
  const toggleCollapse = (idx) => setCollapsedExercises(prev => {
    const next = new Set(prev);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    return next;
  });

  // Fetch catalog
  useEffect(() => {
    fetch('http://localhost:8000/api/ejercicios')
      .then(res => res.json())
      .then(data => { if (data.ejercicios) setEjercicios(data.ejercicios); })
      .catch(console.error);
  }, []);

  // Timer de sesión
  useEffect(() => {
    let interval = null;
    if (sessionActive) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive]);

  // Timer de descanso
  useEffect(() => {
    let interval = null;
    if (isResting && restTime > 0) {
      interval = setInterval(() => setRestTime(t => t - 1), 1000);
    } else if (isResting && restTime === 0) {
      setIsResting(false);
      try {
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.start();
        setTimeout(() => osc.stop(), 300);
      } catch (err) {}
    }
    return () => clearInterval(interval);
  }, [isResting, restTime]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const pedirRutinaIA = async (suggestion = null) => {
    const prompt = (suggestion || promptRutina).trim();
    if (!prompt || prompt.length < 3 || loadingAi) return; // Zen: Validación y Bloqueo
    setLoadingAi(true);
    try {
      const res = await fetch('http://localhost:8000/api/rutinas/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, prompt })
      });
      const data = await res.json();
      if (data.status === 'success' && data.rutina && data.rutina.length > 0) {
        setRutina(data.rutina.map(e => ({
          ...e,
          sets: e.sets && e.sets.length > 0 ? e.sets : [{reps:'12',kg:'',done:false},{reps:'12',kg:'',done:false},{reps:'12',kg:'',done:false}]
        })));
        setPromptRutina('');
      }
    } catch(e) { console.error(e); }
    setLoadingAi(false);
  };

  const reemplazarEjercicio = async (eIdx) => {
    const ejActual = rutina[eIdx];
    try {
      const res = await fetch('http://localhost:8000/api/rutinas/reemplazar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfil,
          ejercicio_actual: ejActual.nombre_es,
          target: ejActual.target || ejActual.body_part
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.alternativa) {
        const nw = [...rutina];
        nw[eIdx] = { ...data.alternativa, sets: ejActual.sets.map(s => ({ ...s, done: false })) };
        setRutina(nw);
      }
    } catch(e) { console.error(e); }
  };

  const toggleSet = (eIdx, sIdx) => {
    const nw = [...rutina];
    nw[eIdx].sets[sIdx].done = !nw[eIdx].sets[sIdx].done;
    setRutina(nw);
    
    if (nw[eIdx].sets[sIdx].done) {
      setRestTime(descansoPreferido);
      setIsResting(true);
    }
  };

  const MUSCLE_GROUPS = {
    'Todos': 'All',
    'Pecho': 'chest',
    'Espalda': 'lats',
    'Piernas': 'quadriceps',
    'Brazos': 'biceps',
    'Hombros': 'shoulders',
    'Core': 'abdominals'
  };

  const totalSetsDone = rutina.reduce((acc, curr) => acc + curr.sets.filter(s => s.done).length, 0);
  const totalSets = rutina.reduce((acc, curr) => acc + curr.sets.length, 0);
  const progress = totalSets > 0 ? (totalSetsDone / totalSets) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '5rem', maxWidth: '500px', margin: '0 auto' }}>
      
      {/* 1. HEADER DE SESIÓN / STATUS */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: '24px',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', margin: 0 }}>Entrenamiento</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{sessionActive ? 'Sesión en progreso...' : '¿Qué entrenamos hoy?'}</p>
          </div>
          {sessionActive ? (
            <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-gym)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                 <Clock size={18}/> {formatTime(timer)}
               </div>
            </div>
          ) : (
            <Dumbbell size={32} color="var(--accent-gym)" style={{ opacity: 0.5 }} />
          )}
        </div>

        {/* Progress Bar (if active) */}
        {rutina.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span>Progreso del entrenamiento</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-gym)', borderRadius: '10px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>EJERCICIOS</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{rutina.length}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL SERIES</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{totalSets}</div>
          </div>
        </div>

        <button 
          className="btn" 
          onClick={() => sessionActive ? setShowFeedbackModal(true) : setSessionActive(true)}
          style={{ 
            width: '100%', 
            padding: '1.1rem', 
            borderRadius: '18px', 
            fontSize: '1.05rem', 
            fontWeight: 900,
            background: sessionActive ? '#ef4444' : 'var(--accent-gym)',
            color: sessionActive ? 'white' : 'black',
            boxShadow: sessionActive ? '0 4px 20px rgba(239, 68, 68, 0.4)' : '0 4px 25px rgba(56, 189, 248, 0.4)',
            transition: 'all 0.2s ease',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {sessionActive ? 'Terminar Sesión' : 'Iniciar Entrenamiento'}
        </button>
      </div>

      {/* 2. ACCESOS RÁPIDOS (PRESETS) - RESTORED */}
      {!sessionActive && (
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.2rem', scrollbarWidth: 'none' }}>
           {[
             { n: 'Pecho y Tríceps', p: 'Rutina de pecho y triceps con hipertrofia' },
             { n: 'Espalda y Bíceps', p: 'Rutina de espalda y biceps pesado' },
             { n: 'Piernas', p: 'Rutina de piernas con sentadilla y prensa' },
             { n: 'Full Body', p: 'Rutina full body funcional' }
           ].map(pr => (
             <button 
                key={pr.n}
                onClick={() => { setPromptRutina(pr.p); pedirRutinaIA(pr.p); }}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  padding: '0.75rem 1.2rem', 
                  borderRadius: '14px', 
                  color: 'white', 
                  fontSize: '0.8rem', 
                  fontWeight: 700, 
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
             >
               {pr.n}
             </button>
           ))}
        </div>
      )}

      {/* 2. REEST TIMER LIVE (Sticky-ish) */}
      {isResting && (
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.95)', 
          backdropFilter: 'blur(10px)',
          border: '2px solid #ef4444',
          borderRadius: '20px',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ animation: 'pulse 2s infinite' }}>⏲️</div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>Descanso activo</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Próxima serie en...</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ef4444', fontFamily: 'monospace' }}>
              {formatTime(restTime)}
            </span>
            <button onClick={() => setIsResting(false)} style={{ background: '#ef4444', border: 'none', borderRadius: '10px', color: 'white', padding: '0.5rem 1rem', fontWeight: 800, cursor: 'pointer' }}>LISTO</button>
          </div>
        </div>
      )}

      {/* 3. LISTA DE EJERCICIOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {rutina.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
             <Dumbbell size={48} color="#1e293b" style={{ marginBottom: '1rem' }} />
             <h3 style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Tu rutina está vacía</h3>
             <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Usá el asistente IA o agregalos manualmente.</p>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {['Pecho y Tríceps', 'Piernas full', 'Espalda y Bíceps'].map(s => (
                  <button key={s} onClick={() => pedirRutinaIA(s)} style={{ padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: 'var(--accent-gym)', fontSize: '0.8rem', cursor: 'pointer' }}>{s}</button>
                ))}
             </div>
          </div>
        ) : (
          rutina.map((ej, eIdx) => (
            <div key={eIdx} style={{ 
              background: '#0f172a', 
              borderRadius: '20px', 
              border: `1px solid ${collapsedExercises.has(eIdx) ? 'transparent' : 'rgba(255,255,255,0.05)'}`,
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              {/* Card Header */}
              <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: collapsedExercises.has(eIdx) ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                <div 
                  onClick={() => setGifModal(ej)}
                  style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'white', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}
                >
                  <img src={ej.gif_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => toggleCollapse(eIdx)}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ej.nombre_es}</div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-gym)', background: 'rgba(56,189,248,0.1)', padding: '0.1rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
                    {ej.body_part || 'Fuerza'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                   <button onClick={() => reemplazarEjercicio(eIdx)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', color: '#94a3b8', padding: '0.5rem', cursor: 'pointer' }}><RotateCcw size={16}/></button>
                   <button onClick={() => toggleCollapse(eIdx)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', color: '#94a3b8', padding: '0.5rem', cursor: 'pointer' }}>{collapsedExercises.has(eIdx) ? <ChevronDown size={18}/> : <ChevronUp size={18}/>}</button>
                </div>
              </div>

              {!collapsedExercises.has(eIdx) && (
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '0.5rem', textAlign: 'center' }}>
                    <div style={{ width: '30px' }}>SET</div>
                    <div style={{ flex: 1 }}>PESO (KG)</div>
                    <div style={{ flex: 1 }}>REPS</div>
                    <div style={{ width: '40px' }}></div>
                  </div>
                  {ej.sets.map((s, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <div style={{ width: '30px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 800, color: s.done ? 'var(--accent-gym)' : '#334155' }}>{sIdx + 1}</div>
                      <input 
                        type="number" 
                        value={s.kg} 
                        placeholder="0"
                        onChange={(e) => {
                          const nw = [...rutina];
                          nw[eIdx].sets[sIdx].kg = e.target.value;
                          setRutina(nw);
                        }}
                        style={{ flex: 1, background: '#1e293b', border: 'none', borderRadius: '10px', padding: '0.6rem', color: 'white', textAlign: 'center', fontWeight: 700 }}
                      />
                      <input 
                        type="number" 
                        value={s.reps} 
                        placeholder="12"
                        onChange={(e) => {
                          const nw = [...rutina];
                          nw[eIdx].sets[sIdx].reps = e.target.value;
                          setRutina(nw);
                        }}
                        style={{ flex: 1, background: '#1e293b', border: 'none', borderRadius: '10px', padding: '0.6rem', color: 'white', textAlign: 'center', fontWeight: 700 }}
                      />
                      <button 
                        onClick={() => toggleSet(eIdx, sIdx)}
                        style={{ 
                          width: '40px', height: '40px', borderRadius: '12px', border: 'none',
                          background: s.done ? 'var(--accent-gym)' : '#1e293b',
                          color: s.done ? 'black' : '#475569',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                        const nw = [...rutina];
                        nw[eIdx].sets.push({ reps: '12', kg: '', done: false });
                        setRutina(nw);
                    }}
                    style={{ width: '100%', background: 'transparent', border: '1px dashed #334155', borderRadius: '12px', color: '#64748b', padding: '0.6rem', marginTop: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                  >+ AÑADIR SERIE</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 4. MAGIC AI GENERATOR BOX */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(56,189,248,0.1) 0%, rgba(99,102,241,0.1) 100%)', 
        border: '1.5px solid rgba(56,189,248,0.3)',
        borderRadius: '24px',
        padding: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-gym)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Brain size={20} color="black" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>Asistente IA</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Pedí una rutina como te salga (ej: "pecho y triceps 1 hora")</p>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <input 
            value={promptRutina}
            onChange={(e) => setPromptRutina(e.target.value)}
            disabled={loadingAi}
            placeholder="¿Qué entrenamos hoy?"
            style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '16px', padding: '1rem 3.5rem 1rem 1rem', color: 'white', boxSizing: 'border-box' }}
          />
          <button 
            onClick={() => pedirRutinaIA()}
            disabled={loadingAi || !promptRutina}
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'var(--accent-gym)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (loadingAi || !promptRutina) ? 0.3 : 1 }}
          >
            {loadingAi ? '...' : <Play size={18} color="black" />}
          </button>
        </div>
      </div>

      {/* FAB (Añadir manual) */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100 }}>
         <button 
           onClick={() => setShowCatalogModal(true)}
           style={{ width: '56px', height: '56px', borderRadius: '28px', background: 'var(--accent-gym)', border: 'none', color: 'black', boxShadow: '0 8px 30px rgba(56, 189, 248, 0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
         >
           <Plus size={28} />
         </button>
      </div>

      {/* MODAL CATALOGO */}
      {showCatalogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#0f172a', width: '100%', height: '100%', borderRadius: '24px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 900 }}>Catálogo</h2>
               <button onClick={() => setShowCatalogModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '10px' }}><X/></button>
            </div>
            {/* Filtros */}
            <div style={{ padding: '1rem' }}>
               <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Search size={18} color="#475569" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscador..." style={{ width: '100%', background: '#1e293b', border: 'none', padding: '0.8rem 0.8rem 0.8rem 2.5rem', borderRadius: '12px', color: 'white', boxSizing: 'border-box' }}/>
               </div>
               <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {Object.keys(MUSCLE_GROUPS).map(m => (
                    <button key={m} onClick={() => setSelectedMuscle(m)} style={{ padding: '0.4rem 1rem', borderRadius: '10px', background: selectedMuscle === m ? 'var(--accent-gym)' : '#1e293b', color: selectedMuscle === m ? 'black' : 'white', border: 'none', whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.8rem' }}>{m}</button>
                  ))}
               </div>
            </div>
            {/* Lista Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem' }}>
               {ejercicios
                  .filter(e => {
                    const matchesSearch = e.nombre_es.toLowerCase().includes(searchTerm.toLowerCase());
                    const targetLower = (e.target || '').toLowerCase();
                    const groupTarget = MUSCLE_GROUPS[selectedMuscle].toLowerCase();
                    const matchesMuscle = selectedMuscle === 'Todos' || targetLower.includes(groupTarget);
                    return matchesSearch && matchesMuscle;
                  })
                  .slice(0, 40)
                  .map(e => (
                 <div key={e.id_ejercicio} style={{ padding: '0.75rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={e.gif_url} style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'white' }} />
                    <div style={{ flex: 1 }}>
                       <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>{e.nombre_es}</div>
                       <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{e.target}</div>
                    </div>
                    <button onClick={() => { setRutina([...rutina, { ...e, sets:[{reps:'12',kg:'',done:false}] }]); setShowCatalogModal(false); }} style={{ background: 'var(--accent-gym)', borderRadius: '8px', padding: '0.4rem', border: 'none' }}><Plus size={18}/></button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL (Simple, directo) */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
           <div style={{ background: '#0f172a', padding: '2rem', borderRadius: '24px', width: '100%', maxWidth: '380px', border: '1px solid rgba(56,189,248,0.2)' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '3rem' }}>🔥</span>
                <h2 style={{ color: 'white', margin: '0.5rem 0' }}>¡Gran trabajo!</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Completaste un entrenamiento épico.</p>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>¿Qué tal estuvo el nivel?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                 {[1,2,3,4,5].map(n => (
                   <button key={n} onClick={() => setFeedbackRating(n)} style={{ fontSize: '1.5rem', background: 'none', border: 'none', filter: feedbackRating >= n ? 'grayscale(0)' : 'grayscale(1)', cursor: 'pointer' }}>⭐</button>
                 ))}
              </div>
              <button onClick={() => { setSessionActive(false); setRutina([]); setShowFeedbackModal(false); setTimer(0); }} style={{ width: '100%', padding: '1rem', background: 'var(--accent-gym)', color: 'black', border: 'none', borderRadius: '14px', fontWeight: 900 }}>GUARDAR SESIÓN</button>
           </div>
        </div>
      )}

      {/* GIF MODAL */}
      {gifModal && (
        <div onClick={() => setGifModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
           <div onClick={e => e.stopPropagation()} style={{ background: '#0f172a', borderRadius: '24px', width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
              <img src={gifModal.gif_url} style={{ width: '100%', background: 'white' }} />
              <div style={{ padding: '1.5rem' }}>
                 <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>{gifModal.nombre_es}</h2>
                 <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Objetivo: {gifModal.target}</p>
                 <button onClick={() => setGifModal(null)} style={{ width: '100%', padding: '0.8rem', background: '#1e293b', border: 'none', color: 'white', borderRadius: '12px', marginTop: '1rem', fontWeight: 800 }}>CERRAR</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
