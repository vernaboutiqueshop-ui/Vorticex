import { useState } from 'react';
import { Zap, User, Lock, ChevronRight, Scale, Target, Trophy, Dumbbell, Waves, PersonStanding, Timer, Flame } from 'lucide-react';
import API from '../config';

const METAS = [
  { id: 'bajar_peso', icon: '🔥', label: 'Bajar de peso', desc: 'Déficit calórico inteligente' },
  { id: 'ganar_musculo', icon: '💪', label: 'Ganar músculo', desc: 'Hipertrofia y fuerza' },
  { id: 'rendimiento', icon: '⚡', label: 'Mejorar rendimiento', desc: 'Velocidad y resistencia' },
  { id: 'bienestar', icon: '🧘', label: 'Bienestar general', desc: 'Salud y energía diaria' },
];

const DEPORTES = [
  { id: 'gym',       icon: '🏋️', label: 'Gym / Musculación' },
  { id: 'futbol',    icon: '⚽', label: 'Fútbol' },
  { id: 'rugby',     icon: '🏉', label: 'Rugby' },
  { id: 'boxeo',     icon: '🥊', label: 'Boxeo' },
  { id: 'crossfit',  icon: '🔥', label: 'CrossFit' },
  { id: 'running',   icon: '🏃', label: 'Running' },
  { id: 'natacion',  icon: '🏊', label: 'Natación' },
  { id: 'calistenia',icon: '🤸', label: 'Calistenia' },
  { id: 'padel',     icon: '🎾', label: 'Pádel' },
  { id: 'tenis',     icon: '🎾', label: 'Tenis' },
  { id: 'voley',     icon: '🏐', label: 'Vóley' },
  { id: 'basket',    icon: '🏀', label: 'Básquet' },
  { id: 'ciclismo',  icon: '🚴', label: 'Ciclismo' },
  { id: 'mma',       icon: '🥋', label: 'MMA / Artes Marciales' },
  { id: 'hockey',    icon: '🏑', label: 'Hockey' },
  { id: 'otro',      icon: '✨', label: 'Otro deporte' },
];

export default function LoginView({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'wizard'
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // Wizard state
  const [wizardData, setWizardData] = useState({
    nombre: '', password: '', edad: '', peso: '',
    altura: '', meta: '', deporte: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const form = new URLSearchParams();
      form.append('username', loginData.username);
      form.append('password', loginData.password);
      const res = await fetch(`${API}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('vortice_token', data.access_token);
        localStorage.setItem('vortice_user', loginData.username);
        onLogin(loginData.username, data.access_token);
      } else {
        setError('Usuario o contraseña incorrectos. Verificá y volvé a intentar.');
      }
    } catch {
      setError('No hay conexión con el servidor. ¿Está corriendo el backend?');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: wizardData.nombre,
          password: wizardData.password,
          edad: parseInt(wizardData.edad),
          peso: parseFloat(wizardData.peso),
          meta: wizardData.meta,
          deporte: wizardData.deporte,
        }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('vortice_token', data.access_token);
        localStorage.setItem('vortice_user', wizardData.nombre);
        onLogin(wizardData.nombre, data.access_token);
      } else {
        setError('Error al crear el perfil. Intentá de nuevo.');
      }
    } catch {
      setError('Sin conexión con el servidor.');
    }
    setLoading(false);
  };

  const wizardSteps = [
    {
      title: '¿Cómo te llamás?',
      subtitle: 'Tu nombre y contraseña para ingresar',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">Tu nombre</label>
            <input
              className="chat-input" type="text" placeholder="Ej: Gonzalo"
              value={wizardData.nombre}
              onChange={e => setWizardData(p => ({ ...p, nombre: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Contraseña</label>
            <input
              className="chat-input" type="password" placeholder="Mínimo 4 caracteres"
              value={wizardData.password}
              onChange={e => setWizardData(p => ({ ...p, password: e.target.value }))}
            />
          </div>
        </div>
      ),
      valid: () => wizardData.nombre.trim().length > 1 && wizardData.password.length >= 4,
    },
    {
      title: '¿Cuántos años tenés y cuánto pesás?',
      subtitle: 'Necesito esto para calcular tus calorías y macros exactas',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="input-group">
              <label className="input-label">Edad (años)</label>
              <input
                className="chat-input" type="number" placeholder="28"
                value={wizardData.edad}
                onChange={e => setWizardData(p => ({ ...p, edad: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Peso (kg)</label>
              <input
                className="chat-input" type="number" placeholder="75"
                value={wizardData.peso}
                onChange={e => setWizardData(p => ({ ...p, peso: e.target.value }))}
              />
            </div>
          </div>
        </div>
      ),
      valid: () => wizardData.edad > 0 && wizardData.peso > 0,
    },
    {
      title: '¿Cuál es tu meta principal?',
      subtitle: 'Esto define cómo el coach va a orientar tus rutinas y nutrición',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          {METAS.map(m => (
            <button
              key={m.id}
              onClick={() => setWizardData(p => ({ ...p, meta: m.id }))}
              style={{
                padding: '0.9rem 0.75rem', borderRadius: '12px', cursor: 'pointer',
                border: wizardData.meta === m.id ? '2px solid #38bdf8' : '1px solid var(--border-color)',
                background: wizardData.meta === m.id ? 'rgba(56,189,248,0.1)' : 'var(--bg-card)',
                textAlign: 'left', transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{m.icon}</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{m.label}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '0.1rem' }}>{m.desc}</div>
            </button>
          ))}
        </div>
      ),
      valid: () => wizardData.meta !== '',
    },
    {
      title: '¿Qué deporte o actividad hacés?',
      subtitle: 'Vórtice se especializa según tu disciplina',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {DEPORTES.map(d => (
            <button
              key={d.id}
              onClick={() => setWizardData(p => ({ ...p, deporte: d.id }))}
              style={{
                padding: '0.75rem 0.5rem', borderRadius: '12px', cursor: 'pointer',
                border: wizardData.deporte === d.id ? '2px solid #38bdf8' : '1px solid var(--border-color)',
                background: wizardData.deporte === d.id ? 'rgba(56,189,248,0.12)' : 'var(--bg-card)',
                textAlign: 'center', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
              }}
            >
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{d.icon}</span>
              <span style={{ fontWeight: 600, color: wizardData.deporte === d.id ? '#38bdf8' : 'var(--text-primary)', fontSize: '0.8rem', textAlign: 'left', lineHeight: 1.2 }}>{d.label}</span>
            </button>
          ))}
        </div>
      ),
      valid: () => wizardData.deporte !== '',
    },
  ];

  const currentStep = wizardSteps[step];
  const canContinue = currentStep?.valid();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main)', padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'var(--bg-card)', borderRadius: '20px',
        border: '1px solid var(--border-color)',
        padding: '2rem 1.75rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 0.75rem',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            Vórtice
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            {mode === 'login' ? 'Tu coach de salud inteligente' : `Paso ${step + 1} de ${wizardSteps.length}`}
          </p>
        </div>

        {/* Wizard progress bar */}
        {mode === 'wizard' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {wizardSteps.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: '4px', borderRadius: '2px',
                  background: i <= step ? '#38bdf8' : 'var(--border-color)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Nombre de usuario</label>
              <input
                className="chat-input" type="text" placeholder="Gonzalo"
                value={loginData.username}
                onChange={e => setLoginData(p => ({ ...p, username: e.target.value }))}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Contraseña</label>
              <input
                className="chat-input" type="password" placeholder="••••••"
                value={loginData.password}
                onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.65rem 0.85rem', color: '#ef4444', fontSize: '0.8rem' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: 'white',
                border: 'none', borderRadius: '12px', padding: '0.85rem',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem',
                opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              ¿Primera vez?{' '}
              <button
                type="button"
                onClick={() => { setMode('wizard'); setStep(0); setError(''); }}
                style={{ color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                Creá tu perfil
              </button>
            </div>
          </form>
        )}

        {/* WIZARD ONBOARDING */}
        {mode === 'wizard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                {currentStep.title}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                {currentStep.subtitle}
              </p>
            </div>

            {currentStep.content}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.65rem 0.85rem', color: '#ef4444', fontSize: '0.8rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                onClick={() => step === 0 ? setMode('login') : setStep(s => s - 1)}
                style={{
                  padding: '0.75rem 1rem', border: '1px solid var(--border-color)',
                  borderRadius: '12px', background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem',
                }}
              >
                {step === 0 ? 'Volver' : 'Atrás'}
              </button>

              {step < wizardSteps.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canContinue}
                  style={{
                    flex: 1, background: canContinue ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'var(--border-color)',
                    color: 'white', border: 'none', borderRadius: '12px',
                    padding: '0.75rem', fontWeight: 700, cursor: canContinue ? 'pointer' : 'not-allowed',
                    fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    transition: 'all 0.2s',
                  }}
                >
                  Continuar <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={!canContinue || loading}
                  style={{
                    flex: 1, background: canContinue ? 'linear-gradient(135deg, #10b981, #0ea5e9)' : 'var(--border-color)',
                    color: 'white', border: 'none', borderRadius: '12px',
                    padding: '0.75rem', fontWeight: 700, cursor: canContinue ? 'pointer' : 'not-allowed',
                    fontSize: '0.9rem', opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Creando perfil...' : '¡Empezar!'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
