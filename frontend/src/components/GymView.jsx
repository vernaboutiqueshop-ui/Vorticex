import { useState, useEffect, useCallback } from 'react';
import { Play, Plus, Search, X, Check, Trash2, ChevronRight, Info, TrendingUp, Trophy, MoreVertical, Edit2, Trash } from 'lucide-react';
import MuscleMap from './MuscleMap';
import { API } from '../config';
import { useLanguage } from '../LanguageContext';

export default function GymView({ perfil, pendingRutina, onRutinaLoaded }) {
  const { t, lang } = useLanguage();
  const [ejerciciosMasterLive, setEjerciciosMasterLive] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [semanticResults, setSemanticResults] = useState([]);
  const [activeInternalTab, setActiveInternalTab] = useState('entrenar');
  const [rutinasGuardadas, setRutinasGuardadas] = useState([]);
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [nombreRutinaNueva, setNombreRutinaNueva] = useState('');
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);
  
  // Nuevo estado para el Modal de Ejercicio
  const [selectedExerciseDetails, setSelectedExerciseDetails] = useState(null);
  
  // Estado para recompensa
  const [rewardMsg, setRewardMsg] = useState(null);

  // Estados para CRUD de Rutinas
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const MUSCLE_MAP = {
    'Pecho': ['chest', 'pectorals', 'pecho'],
    'Espalda': ['back', 'lats', 'espalda', 'upper back'],
    'Piernas': ['quads', 'hamstrings', 'calves', 'glutes', 'legs', 'piernas'],
    'Hombros': ['shoulders', 'delts', 'hombros'],
    'Brazos': ['biceps', 'triceps', 'forearms', 'arms', 'brazos'],
    'Abs': ['abs', 'waist', 'core', 'abdominals']
  };

  const loadRoutines = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/gym/rutinas?perfil=${perfil}`);
      const data = await res.json();
      if (data.status === 'success') setRutinasGuardadas(data.rutinas);
    } catch (err) { console.error(err); }
  }, [perfil]);

  useEffect(() => { loadRoutines(); }, [loadRoutines]);

  useEffect(() => {
    const syncCatalog = async () => {
      try {
        const localRes = await fetch('/ejercicios.json');
        if (localRes.ok) setEjerciciosMasterLive(await localRes.json());
        const cloudRes = await fetch(`${API}/api/exercises`);
        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          if (cloudData.status === "success") setEjerciciosMasterLive(cloudData.ejercicios);
        }
      } catch (err) { console.warn(err); }
    };
    syncCatalog();
  }, []);

  useEffect(() => {
    if (searchTerm.length < 3) return setSemanticResults([]);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/exercises/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        if (data.status === 'success') setSemanticResults(data.ejercicios);
      } catch (e) { console.error(e); }
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const [rutina, setRutina] = useState([]); 
  const [sessionActive, setSessionActive] = useState(false);
  const [timer, setTimer] = useState(0);

  // Cargar historial de pesos al iniciar una rutina
  const startRoutineWithHistory = async (rutinaBase) => {
     const exerciseIds = rutinaBase.map(e => e.id_ejercicio || e.id);
     let historicalWeights = {};
     try {
        const res = await fetch(`${API}/api/gym/historial/pesos`, {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({ perfil, exercise_ids: exerciseIds })
        });
        const data = await res.json();
        if(data.status === 'success') historicalWeights = data.pesos;
     } catch (e) { console.error("Error loading history", e); }

     const routineWithHistory = rutinaBase.map(e => {
        const eid = e.id_ejercicio || e.id;
        const history = historicalWeights[eid] || { kg: '', reps: e.reps_default || '12' };
        return {
           ...e,
           sets: Array(e.sets_count || 3).fill(0).map(() => ({ reps: history.reps, kg: history.kg, done: false }))
        };
     });
     
     setRutina(routineWithHistory);
     setSessionActive(true);
     setActiveInternalTab('entrenar');
  };

  useEffect(() => {
    if (pendingRutina && pendingRutina.length > 0) {
      startRoutineWithHistory(pendingRutina);
      if (onRutinaLoaded) onRutinaLoaded();
    }
  }, [pendingRutina, onRutinaLoaded]);

  useEffect(() => {
    let interval = null;
    if (sessionActive) interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const ejerciciosFiltrados = (searchTerm.length >= 3 && semanticResults.length > 0)
    ? semanticResults
    : ejerciciosMasterLive.filter(ej => {
        const n = (ej.nombre_es || ej.name || "").toLowerCase();
        const matchSearch = n.includes(searchTerm.toLowerCase());
        if (selectedMuscle === 'Todos') return matchSearch;
        const target = (ej.target || "").toLowerCase();
        const bodyPart = (ej.body_part || "").toLowerCase();
        const allowedTags = MUSCLE_MAP[selectedMuscle] || [];
        const matchMuscle = allowedTags.some(tag => target.includes(tag) || bodyPart.includes(tag));
        return matchSearch && matchMuscle;
      });

  const handleAddExerciseFromModal = () => {
    if(!selectedExerciseDetails) return;
    const ej = selectedExerciseDetails;
    const newEj = { ...ej, sets: [{ reps: '12', kg: '', done: false }, { reps: '12', kg: '', done: false }, { reps: '12', kg: '', done: false }] };
    
    if (isCreatingRoutine || sessionActive) {
      setRutina(prev => [...prev, newEj]);
      if (!isCreatingRoutine) setSessionActive(true);
    } else {
      setRutina([newEj]);
      setSessionActive(true);
    }
    setSelectedExerciseDetails(null);
    setActiveInternalTab('entrenar');
  };

  const finishSession = async () => {
     try {
        const res = await fetch(`${API}/api/gym/sesion/guardar`, {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({ perfil, rutina })
        });
        const data = await res.json();
        if(data.status === 'success') {
           setRewardMsg(`¡Entrenamiento completado! +${data.exp_ganada} EXP`);
           setTimeout(() => setRewardMsg(null), 4000);
        }
     } catch(e) { console.error(e); }
     setSessionActive(false);
     setRutina([]);
     setTimer(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '5rem', maxWidth: '500px', margin: '0 auto' }}>
      
      {/* TABS PRINCIPALES */}
      <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
        {['entrenar', 'explorar', 'historial'].map(tKey => (
          <button
            key={tKey}
            onClick={() => { setActiveInternalTab(tKey); setIsCreatingRoutine(false); }}
            style={{
              flex: 1, padding: '1rem', borderRadius: '18px', border: 'none', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px',
              background: activeInternalTab === tKey ? 'var(--accent-gym)' : 'transparent',
              color: activeInternalTab === tKey ? 'white' : '#64748b',
              transition: 'all 0.3s'
            }}
          >
            {t(tKey)}
          </button>
        ))}
      </div>

      {rewardMsg && (
         <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: 'white', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 800 }} className="animate-in">
            <Trophy color="#10b981" /> {rewardMsg}
         </div>
      )}

      <div style={{ minHeight: '60vh' }}>
        {activeInternalTab === 'entrenar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {isCreatingRoutine ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <button onClick={() => { setIsCreatingRoutine(false); setEditingRoutineId(null); setRutina([]); setNombreRutinaNueva(''); }} className="hevy-btn"><X size={20}/></button>
                   <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{editingRoutineId ? (lang === 'es' ? 'Editar Rutina' : 'Edit Routine') : (lang === 'es' ? 'Crear Rutina' : 'Create Routine')}</h2>
                   <button 
                     onClick={async () => {
                        if(!nombreRutinaNueva) return;
                        const payload = { perfil, nombre: nombreRutinaNueva, ejercicios: rutina.map(e => ({ id_ejercicio: e.id_ejercicio || e.id, sets_count: e.sets.length, reps_default: e.sets[0]?.reps || '12' })) };
                        if (editingRoutineId) {
                           await fetch(`${API}/api/gym/rutina/${editingRoutineId}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
                        } else {
                           await fetch(`${API}/api/gym/rutina/nueva`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
                        }
                        setIsCreatingRoutine(false); setRutina([]); setNombreRutinaNueva(''); setEditingRoutineId(null); loadRoutines();
                     }}
                     className="hevy-btn hevy-btn-primary"
                   >{t('save')}</button>
                </div>
                <div className="hevy-card">
                   <input value={nombreRutinaNueva} onChange={e => setNombreRutinaNueva(e.target.value)} placeholder={lang === 'es' ? 'Nombre de la rutina' : 'Routine Name'} style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '1.4rem', fontWeight: 900, outline: 'none' }} />
                </div>
                 {rutina.map((ej, index) => (
                   <div key={index} className="hevy-card">
                     <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                           <img src={ej.gif_url} style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'white', objectFit: 'cover' }} />
                           <h4 style={{ color: 'white', margin: 0, fontWeight: 900, fontSize: '1.05rem' }}>{lang === 'en' && ej.nombre_en ? ej.nombre_en : ej.nombre_es}</h4>
                        </div>
                        <button onClick={() => setRutina(rutina.filter((_, i) => i !== index))} style={{ color: '#ef4444', background: 'transparent', border: 'none' }}><Trash2 size={18}/></button>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       {ej.sets?.map((s, si) => (
                         <div key={si} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 900 }}>SET {si+1}</div>
                            <input value={s.kg} onChange={e => { const nw = [...rutina]; nw[index].sets[si].kg = e.target.value; setRutina(nw); }} placeholder="kg" className="hevy-input" style={{ textAlign: 'center' }} />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                               <input value={s.reps} onChange={e => { const nw = [...rutina]; nw[index].sets[si].reps = e.target.value; setRutina(nw); }} placeholder="reps" className="hevy-input" style={{ flex: 1, textAlign: 'center' }} />
                               <button onClick={() => { const nw = [...rutina]; nw[index].sets = nw[index].sets.filter((_, idx) => idx !== si); setRutina(nw); }} style={{ color: '#64748b', background: 'transparent', border: 'none', padding: '0.2rem' }}><X size={16}/></button>
                            </div>
                         </div>
                       ))}
                     </div>
                     <button onClick={() => { const nw = [...rutina]; const lastReps = ej.sets && ej.sets.length > 0 ? ej.sets[ej.sets.length-1].reps : '12'; nw[index].sets = [...(ej.sets || []), {reps: lastReps, kg: '', done:false}]; setRutina(nw); }} className="hevy-btn" style={{ marginTop: '1rem', width: '100%', border: '1px dashed var(--border-color)', background: 'transparent' }}>+ Agregar Serie</button>
                   </div>
                 ))}
                <button onClick={() => setActiveInternalTab('explorar')} className="hevy-btn" style={{ padding: '1.2rem', border: '1px dashed var(--border-color)' }}>
                   <Plus size={20} /> {t('add_exercise')}
                </button>
              </div>
            ) : rutina.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-in">
                <div className="hevy-card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div>
                      <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{t('active_session')}</h2>
                      <div style={{ color: 'var(--accent-gym)', fontWeight: 800, fontSize: '1.2rem', marginTop: '0.2rem' }}>{formatTime(timer)}</div>
                   </div>
                   <div style={{ width: '60px', height: '80px' }}><MuscleMap targets={rutina.map(e => e.target)} /></div>
                </div>
                {rutina.map((ej, index) => (
                  <div key={index} className="hevy-card">
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                       <img src={ej.gif_url} style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'white', objectFit: 'cover' }} />
                       <h4 style={{ color: 'white', margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>{lang === 'en' && ej.nombre_en ? ej.nombre_en : ej.nombre_es}</h4>
                    </div>
                    {ej.sets.map((s, si) => (
                      <div key={si} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                         <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 900 }}>SET {si+1}</div>
                         <input value={s.kg} onChange={e => { const nw = [...rutina]; nw[index].sets[si].kg = e.target.value; setRutina(nw); }} placeholder="kg" className="hevy-input" />
                         <input value={s.reps} onChange={e => { const nw = [...rutina]; nw[index].sets[si].reps = e.target.value; setRutina(nw); }} placeholder="reps" className="hevy-input" />
                         <button onClick={() => { const nw = [...rutina]; nw[index].sets[si].done = !nw[index].sets[si].done; setRutina(nw); }} className="hevy-btn" style={{ background: s.done ? 'var(--accent-gym)' : 'rgba(255,255,255,0.05)', color: s.done ? 'white' : '#64748b' }}><Check size={18}/></button>
                      </div>
                    ))}
                    <button onClick={() => { const nw = [...rutina]; nw[index].sets.push({reps: ej.sets[ej.sets.length-1]?.reps || '12', kg: ej.sets[ej.sets.length-1]?.kg || '', done:false}); setRutina(nw); }} className="hevy-btn" style={{ marginTop: '0.5rem' }}>+ Agregar Serie</button>
                  </div>
                ))}
                <button onClick={() => setActiveInternalTab('explorar')} className="hevy-btn" style={{ padding: '1.2rem', border: '1px dashed var(--border-color)' }}>+ Añadir más ejercicios</button>
                <button onClick={finishSession} className="hevy-btn hevy-btn-primary" style={{ padding: '1.2rem', fontSize: '1.1rem' }}>{t('finish_workout')}</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="hevy-card" style={{ padding: '1.5rem' }}>
                  <button onClick={() => { setRutina([]); setIsCreatingRoutine(true); }} className="hevy-btn" style={{ padding: '1.2rem', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                       <div style={{ background: 'var(--accent-gym)', padding: '0.5rem', borderRadius: '10px' }}><Plus size={20} color="white"/></div>
                       <span style={{ fontSize: '1.1rem' }}>{t('new_routine')}</span>
                    </div>
                    <ChevronRight size={20} color="#64748b" />
                  </button>
                </div>
                <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 900, margin: '1rem 0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={20} color="var(--accent-gym)"/> {t('my_routines')}</h3>
                {rutinasGuardadas.map(r => {
                  const formatAvgTime = (secs) => {
                     if (!secs) return null;
                     const h = Math.floor(secs / 3600);
                     const m = Math.floor((secs % 3600) / 60);
                     if (h > 0) return `${h}h ${m}m`;
                     return `${m}m`;
                  };
                  return (
                  <div key={r.id} className="hevy-card" style={{ position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => {
                      setEditingRoutineId(r.id); 
                      setNombreRutinaNueva(r.name); 
                      const rutinaEditable = r.ejercicios.map(ej => ({
                         ...ej,
                         sets: Array(ej.sets_count || 3).fill(0).map(() => ({ reps: ej.reps_default || '12', kg: '', done: false }))
                      }));
                      setRutina(rutinaEditable); 
                      setIsCreatingRoutine(true); 
                  }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                           <h4 style={{ color: 'white', margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>{r.name}</h4>
                           {r.avg_duration_seconds > 0 && (
                              <div style={{ marginTop: '0.3rem' }}>
                                 <span style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                                    ⏱️ {formatAvgTime(r.avg_duration_seconds)}
                                 </span>
                              </div>
                           )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                           <div style={{ height: '40px', width: '30px' }}><MuscleMap targets={r.ejercicios.map(e => e.target)} /></div>
                           <div style={{ position: 'relative' }}>
                             <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === r.id ? null : r.id); }} className="hevy-btn" style={{ background: 'transparent', padding: '0.4rem', border: 'none', color: '#64748b' }}>
                                <MoreVertical size={20} />
                             </button>
                             {activeMenuId === r.id && (
                                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, background: 'white', borderRadius: '12px', padding: '0.5rem', zIndex: 50, width: '200px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                   <button onClick={async () => { setActiveMenuId(null); if(window.confirm(lang === 'es' ? '¿Seguro que deseas eliminar esta rutina?' : 'Delete this routine?')){ await fetch(`${API}/api/gym/rutina/${r.id}`, { method: 'DELETE' }); loadRoutines(); } }} className="hevy-btn" style={{ background: 'transparent', color: '#ef4444', justifyContent: 'flex-start', padding: '0.8rem', width: '100%' }}>
                                      <Trash size={18} style={{ marginRight: '0.5rem' }} /> {lang === 'es' ? 'Eliminar rutina' : 'Delete routine'}
                                   </button>
                                </div>
                             )}
                           </div>
                        </div>
                     </div>
                     <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1rem 0', fontWeight: 500 }}>
                        {r.ejercicios.length > 0 
                           ? r.ejercicios.slice(0, 3).map(e => lang === 'en' && e.nombre_en ? e.nombre_en : e.nombre_es).join(', ') + '...'
                           : 'Sin ejercicios'}
                     </p>
                     <button onClick={(e) => { e.stopPropagation(); startRoutineWithHistory(r.ejercicios); }} className="hevy-btn hevy-btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', marginTop: '0.5rem' }}>
                        <Play fill="currentColor" size={16} style={{marginRight: '0.5rem'}}/> {lang === 'es' ? 'Empezar Entrenamiento' : 'Start Workout'}
                     </button>
                  </div>
                )})}
              </div>
            )}
          </div>
        )}

        {activeInternalTab === 'explorar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-in">
             <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '1.2rem', top: '1.2rem', color: '#64748b' }} size={20} />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('search_placeholder')} className="hevy-input" style={{ paddingLeft: '3.5rem', textAlign: 'left' }} />
             </div>
             <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                {['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Abs'].map(m => (
                   <button key={m} onClick={() => setSelectedMuscle(m)} className="hevy-btn" style={{ padding: '0.6rem 1.2rem', borderRadius: '14px', background: selectedMuscle === m ? 'var(--accent-gym)' : 'rgba(255,255,255,0.05)', color: selectedMuscle === m ? 'white' : '#94a3b8', whiteSpace: 'nowrap' }}>{m}</button>
                ))}
             </div>
             <div style={{ display: 'grid', gap: '1rem' }}>
                {ejerciciosFiltrados.slice(0, 40).map((ej, idx) => (
                   <div key={idx} className="hevy-card exercise-card-hover" style={{ flexDirection: 'row', alignItems: 'center', padding: '1rem' }}>
                      <div onClick={() => setSelectedExerciseDetails(ej)} style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}>
                         <img src={ej.gif_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div onClick={() => setSelectedExerciseDetails(ej)} style={{ flex: 1, cursor: 'pointer' }}>
                         <div style={{ color: 'white', fontWeight: 800, fontSize: '1.05rem' }}>{lang === 'en' && ej.nombre_en ? ej.nombre_en : ej.nombre_es}</div>
                         <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.3rem' }}>{ej.target}</div>
                      </div>
                      <button onClick={(e) => {
                          e.stopPropagation();
                          const newEj = { ...ej, sets: [{ reps: '12', kg: '', done: false }, { reps: '12', kg: '', done: false }, { reps: '12', kg: '', done: false }] };
                          if (isCreatingRoutine || sessionActive) { setRutina(prev => [...prev, newEj]); if(!isCreatingRoutine) setSessionActive(true); } 
                          else { setRutina([newEj]); setSessionActive(true); }
                          setActiveInternalTab('entrenar');
                      }} className="hevy-btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.6rem', borderRadius: '12px', zIndex: 10 }}>
                          <Plus size={24} color="var(--accent-gym)" />
                      </button>
                   </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLES DE EJERCICIO */}
      {selectedExerciseDetails && (
         <div className="modal-overlay" onClick={() => setSelectedExerciseDetails(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, margin: 0, flex: 1 }}>{lang === 'en' && selectedExerciseDetails.nombre_en ? selectedExerciseDetails.nombre_en : selectedExerciseDetails.nombre_es}</h2>
                  <button onClick={() => setSelectedExerciseDetails(null)} className="hevy-btn" style={{ padding: '0.5rem' }}><X size={24} /></button>
               </div>
               
               <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <img src={selectedExerciseDetails.gif_url} style={{ width: '100%', maxWidth: '300px', objectFit: 'cover' }} />
               </div>

               <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                     <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Objetivo Principal</div>
                     <div style={{ color: 'var(--accent-gym)', fontSize: '1.1rem', fontWeight: 900, marginTop: '0.2rem', textTransform: 'capitalize' }}>{selectedExerciseDetails.target}</div>
                  </div>
                  <div style={{ width: '80px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <MuscleMap targets={[selectedExerciseDetails.target]} />
                  </div>
               </div>

               <button onClick={handleAddExerciseFromModal} className="hevy-btn hevy-btn-primary" style={{ padding: '1.2rem', fontSize: '1.1rem' }}>
                  <Plus size={24} /> {lang === 'es' ? 'Añadir a la Rutina' : 'Add to Routine'}
               </button>
            </div>
         </div>
      )}
    </div>
  );
}
