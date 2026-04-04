import { useState, useEffect } from 'react';
import { Play, Plus, Search, Dumbbell, Brain, X, CheckCircle2, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function GymView({ perfil }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  
  // AI Generator
  const [promptRutina, setPromptRutina] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Planner / Session State
  const [rutina, setRutina] = useState([]); // [{id_ejercicio, nombre_es, body_part, target, sets: [{reps:'', kg:'', done:false}]}]
  const [sessionActive, setSessionActive] = useState(false);
  const [timer, setTimer] = useState(0);
  
  // Rest Timer
  const [restTime, setRestTime] = useState(0); // in seconds
  const [isResting, setIsResting] = useState(false);

  // Fetch full catalog
  useEffect(() => {
    fetch('http://localhost:8000/api/ejercicios')
      .then(res => res.json())
      .then(data => {
        if (data.ejercicios) setEjercicios(data.ejercicios);
      })
      .catch(console.error);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (sessionActive) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive]);

  // Rest Timer logic
  useEffect(() => {
    let interval = null;
    if (isResting && restTime > 0) {
      interval = setInterval(() => setRestTime(t => t - 1), 1000);
    } else if (isResting && restTime === 0) {
      setIsResting(false);
      // Play beep and vibrate
      try {
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.start();
        setTimeout(() => osc.stop(), 500);
      } catch (err) { console.error('Audio api error', err); }
    }
    return () => clearInterval(interval);
  }, [isResting, restTime]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const pedirRutinaIA = async () => {
    if (!promptRutina) return;
    setLoadingAi(true);
    try {
      const res = await fetch('http://localhost:8000/api/rutinas/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo: promptRutina, dias: 1 })
      });
      const data = await res.json();
      if (data.status === 'success' && data.rutina.ejercicios) {
        // Map AI response to Catalog
        const newRutina = [];
        data.rutina.ejercicios.forEach(nombreIA => {
          // Find best match in catalog
          const match = ejercicios.find(e => 
            e.nombre_es.toLowerCase().includes(nombreIA.toLowerCase()) || 
            nombreIA.toLowerCase().includes(e.nombre_es.toLowerCase())
          );
          if (match) {
            newRutina.push({
              ...match,
              sets: [{ reps: '', kg: '', done: false }, { reps: '', kg: '', done: false }, { reps: '', kg: '', done: false }] 
            });
          } else {
            // Fallback si no está exacto
            newRutina.push({
              id_ejercicio: 'custom_' + Math.random(),
              nombre_es: nombreIA,
              body_part: 'Generado',
              target: 'Varios',
              sets: [{ reps: '', kg: '', done: false }, { reps: '', kg: '', done: false }, { reps: '', kg: '', done: false }]
            });
          }
        });
        setRutina(newRutina);
      }
    } catch(e) { console.error(e); }
    setLoadingAi(false);
  };

  const addEjercicioManual = (eje) => {
    setRutina([...rutina, { ...eje, sets: [{ reps: '', kg: '', done: false }] }]);
  };

  const removeEjercicio = (index) => {
    const nw = [...rutina];
    nw.splice(index, 1);
    setRutina(nw);
  };

  const toggleSet = (eIdx, sIdx) => {
    const nw = [...rutina];
    nw[eIdx].sets[sIdx].done = !nw[eIdx].sets[sIdx].done;
    setRutina(nw);
    
    // Start Rest Timer if marked done
    if (nw[eIdx].sets[sIdx].done) {
      setRestTime(120); // 2 minutos
      setIsResting(true);
    }
  };

  const updateSet = (eIdx, sIdx, field, val) => {
    const nw = [...rutina];
    nw[eIdx].sets[sIdx][field] = val;
    setRutina(nw);
  };

  const addSet = (eIdx) => {
    const nw = [...rutina];
    nw[eIdx].sets.push({ reps: '', kg: '', done: false });
    setRutina(nw);
  };

  const mapMuscle = (bp) => {
      bp = bp.toLowerCase();
      if(bp.includes('chest') || bp.includes('pecho')) return 'Pecho';
      if(bp.includes('back') || bp.includes('espalda')) return 'Espalda';
      if(bp.includes('leg') || bp.includes('pierna') || bp.includes('thigh') || bp.includes('calv')) return 'Piernas';
      if(bp.includes('arm') || bp.includes('brazo') || bp.includes('bicep') || bp.includes('tricep')) return 'Brazos';
      if(bp.includes('shoulder') || bp.includes('hombro')) return 'Hombros';
      if(bp.includes('waist') || bp.includes('core') || bp.includes('ab')) return 'Core';
      return 'Otros';
  };

  const muscleGroups = ['All', 'Pecho', 'Espalda', 'Piernas', 'Brazos', 'Hombros', 'Core'];

  const filteredEjercicios = ejercicios.filter(e => {
    const sSearch = searchTerm.toLowerCase();
    const matchesSearch = e.nombre_es.toLowerCase().includes(sSearch) || e.body_part.toLowerCase().includes(sSearch);
    const matchesMuscle = selectedMuscle === 'All' || mapMuscle(e.body_part) === selectedMuscle;
    return matchesSearch && matchesMuscle;
  }).slice(0, 50); // Muestra max 50 en la lista para no colgar la UI

  // Calcs for Summary
  const totalSets = rutina.reduce((acc, curr) => acc + curr.sets.length, 0);
  
  // Muscle Data for Chart
  const muscleMap = {};
  rutina.forEach(ej => {
    const mus = ej.target !== 'Varios' ? ej.target : ej.body_part;
    if(!muscleMap[mus]) muscleMap[mus] = 0;
    muscleMap[mus] += ej.sets.length;
  });
  
  const chartData = Object.keys(muscleMap).map(k => ({ name: k.substring(0,10), sets: muscleMap[k] })).sort((a,b) => b.sets - a.sets);

  const finalizarSesion = async () => {
    if (!sessionActive) {
       setSessionActive(true);
       return;
    }
    // Si ya esta activa, guarda
    try {
      const payload = { perfil, rutina };
      await fetch('http://localhost:8000/api/gym/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch(e) { console.error('Error guardando', e); }
    
    setSessionActive(false);
    setRutina([]);
    setTimer(0);
    setIsResting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* 1. PLANNER & SESSION */}
      <div className="card" style={{ background: sessionActive ? '#0f172a' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', position: 'relative' }}>
        
        {/* Header de Sesion */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{color: 'var(--accent-gym)', display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <Dumbbell size={20} /> Entrenamientos
          </h2>
          {sessionActive && (
             <div style={{display:'flex', gap:'1rem'}}>
               {isResting && (
                 <div style={{ background: '#ef4444', padding:'0.3rem 0.6rem', borderRadius:'8px', color:'white', fontWeight:'bold', display:'flex', gap:'0.4rem', alignItems:'center', animation: 'fadeIn 0.5s infinite alternate'}}>
                   A descansar! {formatTime(restTime)}
                 </div>
               )}
               <div style={{ background: 'rgba(56, 189, 248, 0.2)', padding:'0.3rem 0.6rem', borderRadius:'8px', color:'var(--accent-gym)', fontWeight:'bold', display:'flex', gap:'0.4rem', alignItems:'center'}}>
                 <Clock size={16}/> {formatTime(timer)}
               </div>
             </div>
          )}
        </div>

        {/* Resumen Numerico Top */}
        <div style={{display: 'flex', gap: '2rem', margin: '1rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom:'1rem'}}>
          <div>
            <p style={{fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '1px'}}>EJERCICIOS</p>
            <p style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{rutina.length}</p>
          </div>
          <div>
            <p style={{fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '1px'}}>SERIES</p>
            <p style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{totalSets}</p>
          </div>
        </div>

        {/* Lista de Ejercicios en la Rutina */}
        {rutina.length === 0 ? (
          <div style={{background: '#020617', padding: '1.5rem', borderRadius: '12px', textAlign: 'center'}}>
             <p className="text-muted">Rutina vacía. Usa el Catálogo o el Asistente IA para agregar ejercicios.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rutina.map((ej, eIdx) => (
              <div key={eIdx} style={{ background: '#020617', borderRadius: '12px', padding: '1rem' }}>
                
                {/* Header Ejercicio */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-gym)' }}>{ej.nombre_es}</div>
                  <button onClick={() => removeEjercicio(eIdx)} style={{ background:'transparent', border:'none', color:'var(--danger-color)', cursor:'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Sub-Header Columnas */}
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', padding:'0 0.5rem'}}>
                  <span style={{color: 'var(--text-secondary)', fontSize:'0.75rem', width:'30px', textAlign:'center'}}>SET</span>
                  <span style={{color: 'var(--text-secondary)', fontSize:'0.75rem', width:'60px', textAlign:'center'}}>KG</span>
                  <span style={{color: 'var(--text-secondary)', fontSize:'0.75rem', width:'60px', textAlign:'center'}}>REPS</span>
                  <span style={{color: 'var(--text-secondary)', fontSize:'0.75rem', width:'35px', textAlign:'center'}}><CheckCircle2 size={14}/></span>
                </div>

                {/* Sets */}
                {ej.sets.map((s, sIdx) => {
                  const isDone = s.done;
                  return (
                    <div key={sIdx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isDone ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-card)', padding: '0.4rem', borderRadius: '8px', marginBottom: '0.3rem', transition: 'all 0.2s'}}>
                      
                      <div style={{width:'30px', textAlign:'center', fontWeight:'bold', fontSize:'0.85rem', color: isDone ? 'var(--accent-gym)': 'white'}}>{sIdx + 1}</div>
                      
                      <input type="number" value={s.kg} onChange={(e) => updateSet(eIdx, sIdx, 'kg', e.target.value)} style={{width:'60px', background: isDone ? 'transparent' : 'var(--bg-outer)', border:'none', color: isDone ? 'var(--accent-gym)' : 'white', textAlign:'center', padding:'0.3rem', borderRadius:'6px', fontWeight: isDone ? 'bold':'normal'}} placeholder="-" disabled={isDone && !sessionActive}/>
                      
                      <input type="number" value={s.reps} onChange={(e) => updateSet(eIdx, sIdx, 'reps', e.target.value)} style={{width:'60px', background: isDone ? 'transparent' : 'var(--bg-outer)', border:'none', color: isDone ? 'var(--accent-gym)' : 'white', textAlign:'center', padding:'0.3rem', borderRadius:'6px', fontWeight: isDone ? 'bold':'normal'}} placeholder="-" disabled={isDone && !sessionActive}/>
                      
                      <button onClick={() => toggleSet(eIdx, sIdx)} style={{width:'35px', height:'32px', borderRadius:'6px', border:'none', background: isDone ? 'var(--accent-gym)' : 'var(--bg-outer)', color: isDone ? '#000': 'var(--text-secondary)', cursor:'pointer'}}>
                        {isDone ? '✓' : ''}
                      </button>
                    </div>
                  );
                })}
                
                <button onClick={() => addSet(eIdx)} style={{width:'100%', background:'transparent', border:'1px dashed var(--border-color)', color:'var(--text-secondary)', padding:'0.4rem', borderRadius:'8px', marginTop:'0.5rem', cursor:'pointer', fontSize:'0.85rem'}}>
                  + Add Set
                </button>
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={() => setShowCatalogModal(true)} 
          style={{ width: '100%', padding: '0.8rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-gym)', border: '1px dashed var(--accent-gym)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}
        >
          + Añadir Ejercicio
        </button>

        <button className="btn btn-primary" onClick={finalizarSesion} style={{marginTop: '1.5rem', background: sessionActive ? '#ef4444' : 'var(--accent-gym)', color: sessionActive ? 'white' : '#000'}}>
          {sessionActive ? 'Finalizar Entrenamiento' : 'Iniciar Sesión'}
        </button>
      </div>

      {/* 2. MUSCLE BREAKDOWN (CHART) */}
      {rutina.length > 0 && chartData.length > 0 && (
        <div className="card">
           <h3 style={{fontSize:'1rem', marginBottom:'1rem', color:'var(--text-secondary)'}}>Muscle Breakdown</h3>
           <div style={{height: 200, width: '100%', marginLeft: '-15px'}}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false}/>
                 <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: 'var(--bg-card)', border:'none', borderRadius:'8px'}} />
                 <Bar dataKey="sets" fill="var(--accent-gym)" radius={[0, 4, 4, 0]} barSize={12} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      )}

      {/* 3. CREADOR IA */}
      <div className="card">
        <h2 style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'1.1rem'}}><Brain size={18} color="var(--accent-gym)" /> Asistente de Rutinas</h2>
        <p className="text-muted" style={{fontSize: '0.8rem', padding:'0.5rem 0'}}>La IA diseñará un esquema de ejercicios base en segundos.</p>
        <div style={{display:'flex', gap:'0.5rem', marginTop: '0.75rem'}}>
          <input 
             type="text" 
             value={promptRutina}
             onChange={e => setPromptRutina(e.target.value)}
             className="chat-input" 
             placeholder="Ej: ¿Qué grupos musculares te gustaría destruir hoy?"
             style={{flex: 1}}
          />
          <button className="btn btn-primary" style={{width:'auto', padding:'0 1rem', marginBottom: 0}} onClick={pedirRutinaIA} disabled={loadingAi}>
            {loadingAi ? '...' : <Play size={18}/>}
          </button>
        </div>
      </div>

      {/* 4. CATALOGO MODAL (HEVY STYLE) */}
      {showCatalogModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-app)', zIndex: 9999, display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out' }}>
          
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Añadir Ejercicio</h2>
            <button onClick={() => setShowCatalogModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
            <div style={{position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '1rem'}}>
              <Search size={18} color="var(--text-secondary)" style={{position: 'absolute', left: '1rem'}} />
              <input 
                   type="text" 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="chat-input" 
                   placeholder="Buscar ejercicio..."
                   style={{width: '100%', paddingLeft: '2.8rem'}}
              />
            </div>

            {/* Muscle Filter Scroll */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              {muscleGroups.map(mg => (
                <button
                  key={mg}
                  onClick={() => setSelectedMuscle(mg)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: selectedMuscle === mg ? 'var(--accent-gym)' : 'var(--border-color)',
                    background: selectedMuscle === mg ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                    color: selectedMuscle === mg ? 'var(--accent-gym)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {mg === 'All' ? 'Todos' : mg}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredEjercicios.map(ej => (
                <div key={ej.id_ejercicio} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 0', borderBottom:'1px solid var(--border-color)'}}>
                  <div style={{display:'flex', gap:'1rem', alignItems:'center', flex: 1}}>
                    {ej.gif_url ? (
                       <img src={ej.gif_url} alt={ej.nombre_es} style={{width:'60px', height:'60px', objectFit:'cover', borderRadius:'8px', background:'white'}} loading="lazy" />
                    ) : (
                       <div style={{width:'60px', height:'60px', borderRadius:'8px', background:'var(--bg-outer)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                          <Dumbbell size={24} color="var(--text-secondary)" />
                       </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{fontWeight:'600', fontSize:'0.9rem', color:'var(--text-primary)'}}>{ej.nombre_es}</div>
                      <div style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>{ej.body_part} - {ej.target}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                        addEjercicioManual(ej);
                        // Optional: You can choose to automatically close the modal, or leave it open to add multiple. Hitting 'Hevy' style we keep it open and maybe show a success icon briefly.
                    }}
                    style={{background:'transparent', border:'none', color:'var(--accent-gym)', cursor:'pointer', padding:'0.5rem'}}
                  >
                     <Plus size={24} />
                  </button>
                </div>
              ))}
              {filteredEjercicios.length === 50 && (
                 <p style={{fontSize:'0.7rem', color:'var(--text-secondary)', textAlign:'center', marginTop:'1rem', paddingBottom:'2rem'}}>Demasiados resultados. Se muestran los primeros 50.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
