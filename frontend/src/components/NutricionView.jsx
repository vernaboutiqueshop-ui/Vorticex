import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Camera, Search, Plus, X, ChefHat, Loader2, Flame, Clock, Play, Square } from 'lucide-react';

const API = 'http://localhost:8000';

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
  
  // Alacena
  const [alacena, setAlacena] = useState([]);
  const [newIngrediente, setNewIngrediente] = useState('');
  const [receta, setReceta] = useState('');
  const [loadingReceta, setLoadingReceta] = useState(false);

  // Ayuno
  const [ayuno, setAyuno] = useState({ en_ayuno: false, inicio: null, meta_horas: 16 });
  const [horasAyunoStr, setHorasAyunoStr] = useState('00:00:00');
  const [progresoAyuno, setProgresoAyuno] = useState(0);

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

  const fetchAyuno = () => {
    fetch(`${API}/api/nutricion/ayuno?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if(d.ayuno) setAyuno(d.ayuno); })
      .catch(console.error);
  };

  // Cargar macros del día y alacena
  useEffect(() => {
    fetchMacros();
    fetchAlacena();
    fetchAyuno();
  }, [perfil]);

  useEffect(() => {
    let interval;
    if (ayuno.en_ayuno && ayuno.inicio) {
      interval = setInterval(() => {
        const start = new Date(ayuno.inicio);
        const now = new Date();
        const diffMs = now - start;
        const diffHrs = diffMs / (1000 * 60 * 60);
        
        let hrs = Math.floor(diffHrs);
        let mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        let secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        setHorasAyunoStr(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        
        let pct = (diffHrs / ayuno.meta_horas) * 100;
        if (pct > 100) pct = 100;
        setProgresoAyuno(pct);
      }, 1000);
    } else {
      setHorasAyunoStr('00:00:00');
      setProgresoAyuno(0);
    }
    return () => clearInterval(interval);
  }, [ayuno]);

  const toggleAyuno = () => {
    const nuevoEstado = !ayuno.en_ayuno;
    const inicio = nuevoEstado ? new Date().toISOString() : null;
    fetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, en_ayuno: nuevoEstado, inicio_iso: inicio, meta_horas: ayuno.meta_horas })
    }).then(() => fetchAyuno()).catch(console.error);
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
        fetchMacros(); // Refrescar brújula
      }
    } catch (e) { console.error(e); }
    setSearching(false);
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
      if (data.resultado) {
        setPhotoResult(data.resultado);
        fetchMacros();
      }
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
    await fetch(`${API}/api/alacena/${id}`, { method: 'DELETE' });
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

  // Chart data
  const macrosData = [
    { name: 'Proteína', value: macrosHoy.proteinas || 0, color: '#3b82f6' },
    { name: 'Carbohidratos', value: macrosHoy.carbos || 0, color: '#10b981' },
    { name: 'Grasas', value: macrosHoy.grasas || 0, color: '#f59e0b' }
  ];
  const totalMacros = macrosData.reduce((a, b) => a + b.value, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      
      {/* 1. Brújula Metabólica (Datos REALES) */}
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
      <div className="card" style={{ background: ayuno.en_ayuno ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'var(--bg-card)', border: ayuno.en_ayuno ? '1px solid #10b981' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h2 style={{fontSize: '1.1rem', display:'flex', alignItems:'center', gap:'0.5rem', color: ayuno.en_ayuno ? '#10b981' : 'var(--text-primary)'}}>
             <Clock size={18} /> Ayuno Intermitente
           </h2>
           <button onClick={toggleAyuno} className="btn" style={{width:'auto', padding:'0.4rem 0.8rem', background: ayuno.en_ayuno ? '#ef4444' : '#10b981', color:'white', fontWeight:'bold', border:'none', marginBottom: 0, display:'flex', alignItems:'center', gap:'0.5rem'}}>
             {ayuno.en_ayuno ? <><Square size={14} fill="currentColor" /> Terminar</> : <><Play size={14} fill="currentColor" /> Iniciar Ayuno</>}
           </button>
        </div>

        {ayuno.en_ayuno && (
          <div style={{marginTop: '1.5rem', textAlign: 'center'}}>
            <div style={{ fontSize: '2.5rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#10b981', textShadow: '0px 0px 10px rgba(16,185,129,0.3)' }}>
              {horasAyunoStr}
            </div>
            <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem'}}>
               Objetivo: {ayuno.meta_horas}hs
            </p>
            <div style={{background: 'var(--bg-outer)', height: '10px', borderRadius: '5px', overflow: 'hidden', width: '100%'}}>
               <div style={{height: '100%', width: `${progresoAyuno}%`, background: '#10b981', transition: 'width 1s linear', borderRadius: '5px'}}></div>
            </div>
            {progresoAyuno >= 100 && (
               <p style={{color: '#10b981', fontWeight: 'bold', marginTop: '0.5rem', fontSize: '0.85rem'}}>¡Objetivo cumplido!</p>
            )}
          </div>
        )}
      </div>

      {/* 3. Búsqueda de Alimento */}
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

      {/* 3. Alacena Inteligente */}
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
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {alacena.map(item => (
              <div key={item.id} className="alacena-chip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.6rem 0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{item.ingrediente}</span>
                  <button onClick={() => eliminarAlacena(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0', marginLeft: '0.5rem' }}>
                    <X size={14} />
                  </button>
                </div>
                {item.calorias > 0 && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>~{item.calorias} kcal</span>
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
          <div style={{ marginTop: '0.75rem', background: 'var(--bg-outer)', padding: '1rem', borderRadius: '12px', fontSize: '0.88rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {receta}
          </div>
        )}
      </div>
    </div>
  );
}

const NutriResult = ({ data, label }) => (
  <div className="inline-card nutri-card" style={{ marginTop: '0.75rem' }}>
    <div className="inline-card-header"><Flame size={16} /><span>{label}: {data.alimento}</span></div>
    {data.descripcion && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>{data.descripcion}</p>}
    <div className="macro-grid">
      <div className="macro-item" style={{ '--mc': '#ef4444' }}><span className="macro-val">{data.calorias}</span><span className="macro-label">kcal</span></div>
      <div className="macro-item" style={{ '--mc': '#3b82f6' }}><span className="macro-val">{data.proteinas}g</span><span className="macro-label">Prot</span></div>
      <div className="macro-item" style={{ '--mc': '#10b981' }}><span className="macro-val">{data.carbos}g</span><span className="macro-label">Carbs</span></div>
      <div className="macro-item" style={{ '--mc': '#f59e0b' }}><span className="macro-val">{data.grasas}g</span><span className="macro-label">Grasas</span></div>
    </div>
  </div>
);
