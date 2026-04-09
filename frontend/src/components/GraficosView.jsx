import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Calendar, Activity, PieChart as PieIcon, TrendingUp, History } from 'lucide-react';
import API from '../config';

export default function GraficosView({ perfil }) {
  const [trainingData, setTrainingData] = useState({ por_dia: [], por_musculo: [] });
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/graficos/entrenamientos?perfil=${perfil}`).then(r => r.json()),
      fetch(`${API}/api/graficos/timeline?perfil=${perfil}`).then(r => r.json())
    ]).then(([train, time]) => {
      if (train.data) setTrainingData(train.data);
      if (time.eventos) setTimeline(time.eventos);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [perfil]);

  const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

  if (loading) return <div className="loading-state">Analizando datos biométricos...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      
      {/* 1. Volumen Semanal */}
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
          <TrendingUp size={18} color="#38bdf8" /> Volumen de Entrenamiento (kg)
        </h2>
        <div style={{ height: '220px', width: '100%', marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...trainingData.por_dia].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="fecha" 
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '8px', color: 'white' }}
                itemStyle={{ color: '#38bdf8' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="volumen" fill="url(#colorVol)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* 2. Distribución Muscular */}
        <div className="card">
          <h2 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Músculos</h2>
          <div style={{ height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={trainingData.por_musculo} 
                  innerRadius={35} 
                  outerRadius={55} 
                  paddingAngle={5} 
                  dataKey="sets"
                >
                  {trainingData.por_musculo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Últimos 30 días
          </div>
        </div>

        {/* 3. Stats Rápidas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '0.8rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Series Totales</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
              {trainingData.por_dia.reduce((a, b) => a + b.series, 0)}
            </div>
          </div>
          <div className="card" style={{ padding: '0.8rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ejercicios</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>
              {trainingData.por_dia.length > 0 ? Math.max(...trainingData.por_dia.map(d => d.ejercicios)) : 0}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Timeline de Eventos */}
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
          <History size={18} color="var(--text-secondary)" /> Línea de Tiempo
        </h2>
        <div className="timeline-container">
          {timeline.map((ev, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-marker" style={{ 
                background: ev.tipo === 'Gym' ? '#38bdf8' : (ev.tipo === 'Nutricion' ? '#ef4444' : '#94a3b8') 
              }}></div>
              <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev.tipo}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {new Date(ev.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>{ev.descripcion}</div>
                {ev.tipo === 'Nutricion' && ev.calorias > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', fontWeight: 500 }}>
                    🔥 {ev.calorias} kcal | {ev.proteinas}g Prot
                  </div>
                )}
              </div>
            </div>
          ))}
          {timeline.length === 0 && <p className="text-muted" style={{textAlign:'center', fontSize:'0.85rem'}}>Sin eventos registrados todavía.</p>}
        </div>
      </div>
    </div>
  );
}
