import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Dumbbell, Flame, Loader2, Trash2, ChevronsDown, Sparkles, BrainCircuit } from 'lucide-react';
import API from '../config';

export default function AgentView({ perfil, onLoadRutina }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/chat/historial?perfil=${perfil}`)
      .then(res => res.json())
      .then(data => {
        if (data.historial) {
          setMessages(data.historial.map(h => ({ rol: h.rol, contenido: h.contenido, tipo: 'chat_normal' })));
        }
      })
      .catch(err => console.error('Error fetching chat:', err));
  }, [perfil]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  const handleScroll = (e) => {
    const el = e.target;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const handleClearChat = async () => {
    if (!window.confirm('¿Borrar toda la conversación? Esta acción no se puede deshacer.')) return;
    try {
      await fetch(`${API}/api/chat/historial?perfil=${perfil}`, { method: 'DELETE' });
      setMessages([]);
    } catch (e) { console.error('Error borrando historial:', e); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const userText = input.trim();
    // Zen: Validación, Bloqueo y filtro de "ruido" (símbolos)
    if (!userText || userText.length < 3 || /^[\W_]+$/.test(userText) || loading) return; 
    
    setInput('');
    setMessages(prev => [...prev, { rol: 'user', contenido: userText, tipo: 'chat_normal' }]);
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, mensaje: userText })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMessages(prev => [...prev, {
          rol: 'assistant', contenido: data.respuesta,
          tipo: data.tipo_intencion || 'chat_normal',
          rutina_generada: data.rutina_generada || null,
          nutricion_detectada: data.nutricion_detectada || null
        }]);
      } else {
        setMessages(prev => [...prev, { rol: 'assistant', contenido: '❌ Error: ' + data.error, tipo: 'error' }]);
      }
    } catch {
      setMessages(prev => [...prev, { rol: 'assistant', contenido: '❌ Sin conexión con el backend.', tipo: 'error' }]);
    }
    setLoading(false);
  };

  const SUGGESTIONS = [
    { icon: '🏋️', text: 'Armame una rutina de pecho y espalda' },
    { icon: '🍽️', text: 'Hoy comí 2 empanadas' },
    { icon: '📊', text: '¿Cómo voy con mi progreso?' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', marginBottom: '0.25rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BrainCircuit size={16} color="var(--accent-chat, #38bdf8)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {messages.length > 0 ? `${messages.length} mensajes` : 'Conversación nueva'}
          </span>
        </div>
        <button
          onClick={handleClearChat}
          title="Nueva conversación"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '20px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem' }}
        >
          <Trash2 size={12} /> Nueva conversación
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingBottom: '0.5rem' }}
      >
        {/* Estado vacío */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2rem 1rem', gap: '1.25rem' }}>
            <div className="animate-in" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(99, 102, 241, 0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              🦾
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Vórtice IA</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '280px' }}>
                Tu coach personal de alto rendimiento. ¿Qué desafío tenemos hoy?
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '300px' }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="glass-card animate-in"
                  onClick={() => setInput(s.text)}
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                    marginBottom: 0, cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.3s'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensajes */}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.rol === 'user' ? 'flex-end' : 'flex-start', gap: '0.4rem' }}>
            {/* Avatar pequeño para assistant */}
            {msg.rol === 'assistant' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: '0.25rem' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={10} color="white" />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Coach</span>
              </div>
            )}

            {/* Burbuja */}
            <div className="animate-in" style={{
              maxWidth: msg.rol === 'user' ? '80%' : '90%',
              background: msg.rol === 'user'
                ? 'linear-gradient(135deg, var(--accent-gym), #4f46e5)'
                : 'var(--bg-glass)',
              backdropFilter: msg.rol === 'user' ? 'none' : 'blur(10px)',
              border: msg.rol === 'user' ? 'none' : '1px solid var(--border-glass)',
              color: 'white',
              padding: '0.8rem 1.1rem',
              borderRadius: msg.rol === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              lineHeight: '1.6',
              boxShadow: msg.rol === 'user' ? '0 8px 20px rgba(99, 102, 241, 0.3)' : 'var(--shadow-sm)',
              fontSize: '0.92rem',
              whiteSpace: 'pre-wrap',
              fontWeight: msg.rol === 'user' ? 600 : 500,
            }}>
              {msg.contenido}
            </div>

            {/* Card Rutina Generada */}
            {msg.rutina_generada && msg.rutina_generada.length > 0 && (
              <div style={{ width: '90%', background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(56,189,248,0.2)' }}>
                <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(56,189,248,0.05)' }}>
                  <Dumbbell size={15} color="#38bdf8" />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#38bdf8' }}>Rutina Generada · {msg.rutina_generada.length} ejercicios</span>
                </div>
                <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {msg.rutina_generada.map((ej, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: j === msg.rutina_generada.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{j + 1}</span>

                      {ej.gif_url && (
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: 'white' }}>
                          <img src={ej.gif_url} alt={ej.nombre_es} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ej.nombre_es}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{ej.target}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '0.75rem 1rem', paddingTop: 0 }}>
                  <button
                    onClick={() => onLoadRutina && onLoadRutina(msg.rutina_generada)}
                    style={{ width: '100%', background: '#38bdf8', color: '#000', border: 'none', borderRadius: '10px', padding: '0.6rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Dumbbell size={15} /> Cargar en Gym
                  </button>
                </div>
              </div>
            )}

            {/* Card Nutrición */}
            {msg.nutricion_detectada && (
              <div style={{ width: '90%', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', overflow: 'hidden' }}>
                <div style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(239,68,68,0.05)' }}>
                  <Flame size={14} color="#ef4444" />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444' }}>{msg.nutricion_detectada.alimento}</span>
                </div>
                <div style={{ padding: '0.65rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', padding: '0.2rem 0.6rem', fontSize: '0.78rem', fontWeight: 700 }}>{msg.nutricion_detectada.calorias} kcal</span>
                  <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '8px', padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}>{msg.nutricion_detectada.proteinas}g prot</span>
                  <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '8px', padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}>{msg.nutricion_detectada.carbos}g carbs</span>
                  <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '8px', padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}>{msg.nutricion_detectada.grasas}g grasas</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start', padding: '0.6rem 0.9rem', background: 'var(--bg-card)', borderRadius: '16px 16px 16px 4px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Loader2 size={14} className="spin" />
            <span>Pensando...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Botón flotante scroll */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          style={{ position: 'absolute', bottom: '70px', right: '0.75rem', background: '#38bdf8', color: '#000', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', zIndex: 100 }}
        >
          <ChevronsDown size={18} />
        </button>
      )}

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: 'var(--bg-glass-heavy)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border-glass)', margin: '0 -1rem' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Habla con tu coach..."
          className="premium-input"
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="chat-send-btn"
          style={{ 
            opacity: (loading || !input.trim()) ? 0.4 : 1,
            background: 'var(--accent-gym)',
            color: 'white'
          }}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
