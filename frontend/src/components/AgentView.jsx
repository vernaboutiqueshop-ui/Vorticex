import { useState, useEffect, useRef } from 'react';
import { Send, Dumbbell, Flame, Loader2 } from 'lucide-react';

export default function AgentView({ perfil, onLoadRutina }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch initial history
  useEffect(() => {
    fetch(`http://localhost:8000/api/chat/historial?perfil=${perfil}`)
      .then(res => res.json())
      .then(data => {
        if (data.historial) {
          setMessages(data.historial.map(h => ({
            rol: h.rol,
            contenido: h.contenido,
            tipo: 'chat_normal'
          })));
        }
      })
      .catch(err => console.error("Error fetching chat:", err));
  }, [perfil]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { rol: 'user', contenido: userText, tipo: 'chat_normal' }]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, mensaje: userText })
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        const newMsg = {
          rol: 'assistant',
          contenido: data.respuesta,
          tipo: data.tipo_intencion || 'chat_normal',
          rutina_generada: data.rutina_generada || null,
          nutricion_detectada: data.nutricion_detectada || null
        };
        setMessages(prev => [...prev, newMsg]);
      } else {
        setMessages(prev => [...prev, { rol: 'assistant', contenido: '❌ Error: ' + data.error, tipo: 'error' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { rol: 'assistant', contenido: '❌ Sin conexión con el backend.', tipo: 'error' }]);
    }
    setLoading(false);
  };

  const handleLoadRutina = (rutina) => {
    if (onLoadRutina) onLoadRutina(rutina);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚡</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Vórtice Coach</h3>
            <p>Preguntame lo que necesites: rutinas, nutrición, consejos, seguimiento.</p>
            <div className="chat-suggestions">
              {["Armame una rutina de pecho", "Hoy comí 2 empanadas", "¿Cómo voy con mi progreso?"].map((s, i) => (
                <button key={i} className="suggestion-chip" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.rol === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
            {/* Bubble del mensaje */}
            <div style={{
              background: msg.rol === 'user' 
                ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)' 
                : 'var(--bg-card)',
              color: msg.rol === 'user' ? '#000' : 'var(--text-primary)',
              padding: '0.75rem 1rem',
              borderRadius: '16px',
              borderBottomRightRadius: msg.rol === 'user' ? '4px' : '16px',
              borderBottomLeftRadius: msg.rol === 'assistant' ? '4px' : '16px',
              lineHeight: '1.5',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              fontSize: '0.92rem',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.contenido}
            </div>

            {/* Card de Rutina Generada */}
            {msg.rutina_generada && msg.rutina_generada.length > 0 && (
              <div className="inline-card rutina-card animate-slide-up">
                <div className="inline-card-header">
                  <div className="icon-circle" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                    <Dumbbell size={16} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Rutina Sugerida</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{msg.rutina_generada.length} ejercicios optimizados</span>
                  </div>
                </div>
                <div className="inline-card-body">
                  {msg.rutina_generada.map((ej, j) => (
                    <div key={j} className="inline-ejercicio">
                      <span className="inline-ejercicio-num">{j + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ej.nombre_es}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{ej.target} • 3 sets</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: '1rem', fontSize: '0.85rem', padding: '0.7rem', width: '100%', borderRadius: '12px' }}
                  onClick={() => handleLoadRutina(msg.rutina_generada)}
                >
                  <Dumbbell size={16} /> Cargar en Gym
                </button>
              </div>
            )}

            {/* Card de Nutrición Detectada */}
            {msg.nutricion_detectada && (
              <div className="inline-card nutri-card animate-slide-up">
                <div className="inline-card-header">
                  <div className="icon-circle" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    <Flame size={16} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Nutrición Registrada</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Análisis biométrico completado</span>
                  </div>
                </div>
                <div className="macro-card-grid">
                  <div className="macro-chip" style={{ borderColor: '#ef4444' }}>
                    <span className="m-val">{msg.nutricion_detectada.calorias}</span>
                    <span className="m-lbl">kcal</span>
                  </div>
                  <div className="macro-chip" style={{ borderColor: '#3b82f6' }}>
                    <span className="m-val">{msg.nutricion_detectada.proteinas}g</span>
                    <span className="m-lbl">Prot</span>
                  </div>
                  <div className="macro-chip" style={{ borderColor: '#10b981' }}>
                    <span className="m-val">{msg.nutricion_detectada.carbos}g</span>
                    <span className="m-lbl">Carbs</span>
                  </div>
                  <div className="macro-chip" style={{ borderColor: '#f59e0b' }}>
                    <span className="m-val">{msg.nutricion_detectada.grasas}g</span>
                    <span className="m-lbl">Grasas</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: '16px', color: 'var(--text-secondary)' }}>
            <Loader2 size={16} className="spin" />
            Pensando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pedí una rutina, registrá comida, o consultá..." 
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()} 
          className="chat-send-btn"
          style={{ opacity: (loading || !input.trim()) ? 0.4 : 1 }}
        >
          <Send size={20} style={{ marginLeft: '-2px' }}/>
        </button>
      </form>
    </div>
  );
}
