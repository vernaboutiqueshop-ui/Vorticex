import { useState, useRef } from 'react';
import { Zap, ChevronRight, ChevronLeft, Camera, Check, X, Eye, EyeOff } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import API from '../config';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// ── Validaciones client-side ──────────────────────────────
const COMMON_PASSWORDS = new Set(['123456','password','contraseña','111111','qwerty','123123','abcdef','000000','password1','12345678']);

const validateNombre = (raw) => {
  const v = (raw || '').trim();
  if (v.length < 3) return 'Mínimo 3 caracteres';
  if (v.length > 20) return 'Máximo 20 caracteres';
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]/.test(v)) return 'Debe empezar con una letra (no símbolos ni números)';
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9_ ]+$/.test(v)) return 'Solo letras, números, espacios y _ (sin puntos, guiones, etc.)';
  const letters = v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]/g, '');
  if (letters.length < 2) return 'Necesita al menos 2 letras';
  if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(v)) return 'Nombre no parece válido — usá tu nombre o un apodo';
  return null; // null = válido
};

const validatePassword = (v) => {
  if ((v || '').length < 6) return 'Mínimo 6 caracteres';
  if (COMMON_PASSWORDS.has((v || '').toLowerCase())) return 'Contraseña demasiado común — elegí otra';
  return null;
};

const validateEdad = (v) => {
  const n = parseInt(v);
  if (!v || isNaN(n)) return 'Requerido';
  if (n < 10 || n > 100) return 'Entre 10 y 100 años';
  return null;
};

const validatePeso = (v) => {
  const n = parseFloat(v);
  if (!v || isNaN(n)) return 'Requerido';
  if (n < 30 || n > 300) return 'Entre 30 y 300 kg';
  return null;
};

const validateAltura = (v) => {
  if (!v || v === '') return null; // opcional
  const n = parseFloat(v);
  if (isNaN(n)) return 'Número inválido';
  if (n < 50 || n > 250) return 'Entre 50 y 250 cm';
  return null;
};

// Parsea el array detail[] de Pydantic 422 en un string legible
const parsearErrorBackend = (data) => {
  if (!data) return 'Error desconocido';
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map(d => d.msg?.replace('Value error, ', '') || d.message || JSON.stringify(d))
      .join(' · ');
  }
  if (data.error) return data.error;
  if (data.message) return data.message;
  return 'Error al crear el perfil';
};

const FieldError = ({ error, show }) => {
  if (!show || !error) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.3rem' }}>
      <X size={11} color="#ef4444" />
      <span style={{ fontSize: '0.62rem', color: '#f87171', fontWeight: 700 }}>{error}</span>
    </div>
  );
};

const FieldOK = ({ valid, show }) => {
  if (!show || !valid) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.3rem' }}>
      <Check size={11} color="#22c55e" />
      <span style={{ fontSize: '0.62rem', color: '#4ade80', fontWeight: 700 }}>OK</span>
    </div>
  );
};

const METAS = [
  { id: 'bajar_peso', icon: '🔥', label: 'Bajar de peso', desc: 'Déficit calórico inteligente' },
  { id: 'ganar_musculo', icon: '💪', label: 'Ganar músculo', desc: 'Hipertrofia y fuerza' },
  { id: 'rendimiento', icon: '⚡', label: 'Mejorar rendimiento', desc: 'Velocidad y resistencia' },
  { id: 'bienestar', icon: '🧘', label: 'Bienestar general', desc: 'Salud y energía diaria' },
];

const DEPORTES = [
  { id: 'gym',       icon: '🏋️', label: 'Gym' },
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
  { id: 'mma',       icon: '🥋', label: 'MMA' },
  { id: 'hockey',    icon: '🏑', label: 'Hockey' },
  { id: 'otro',      icon: '✨', label: 'Otro' },
];

const STEP_LABELS = ['Cuenta', 'Cuerpo', 'Meta', 'Deportes', 'Foto'];

export default function LoginView({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [recoverUsername, setRecoverUsername] = useState('');
  const [recoverResult, setRecoverResult] = useState(null);

  const handleRecover = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setRecoverResult(null);
    try {
      const res = await fetch(`${API}/api/auth/recover?username=${encodeURIComponent(recoverUsername)}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await res.json();
      if (data.password) {
        setRecoverResult(data.password);
      } else {
        setError('Usuario no encontrado');
      }
    } catch {
      setError('Sin conexión con el servidor');
    }
    setLoading(false);
  };
  const [wizardData, setWizardData] = useState({
    nombre: '', password: '', edad: '', peso: '', altura: '',
    meta: '', deportes: [], profilePic: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({}); // tracks which fields user has interacted with
  const fileRef = useRef(null);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('vortice_token', data.access_token);
        localStorage.setItem('vortice_user', data.username);
        onLogin(data.username, data.access_token);
      } else {
        setError(data.detail || 'Error con Google Login');
      }
    } catch {
      setError('Sin conexión con el servidor');
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const form = new URLSearchParams();
      form.append('username', loginData.username);
      form.append('password', loginData.password);
      const res = await fetch(`${API}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'ngrok-skip-browser-warning': 'true' },
        body: form,
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('vortice_token', data.access_token);
        localStorage.setItem('vortice_user', loginData.username);
        onLogin(loginData.username, data.access_token);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch {
      setError('Sin conexión con el servidor');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true); setError('');
    try {
      const payload = {
          nombre: wizardData.nombre,
          password: wizardData.password,
          edad: parseInt(wizardData.edad) || 0,
          peso: parseFloat(wizardData.peso) || 0,
          altura: parseFloat(wizardData.altura) || 0,
          meta: wizardData.meta || '',
          deportes: wizardData.deportes || [],
          profile_pic: wizardData.profilePic || null,
      };
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('vortice_token', data.access_token);
        localStorage.setItem('vortice_user', wizardData.nombre);
        onLogin(wizardData.nombre, data.access_token);
      } else {
        setError(parsearErrorBackend(data));
      }
    } catch (err) {
      console.error('Register error:', err);
      setError('Sin conexión con el servidor');
    }
    setLoading(false);
  };

  const handleProfilePic = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setWizardData(p => ({ ...p, profilePic: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleDeporte = (id) => {
    setWizardData(p => ({
      ...p,
      deportes: p.deportes.includes(id)
        ? p.deportes.filter(d => d !== id)
        : [...p.deportes, id],
    }));
  };

  const stepValid = [
    () => !validateNombre(wizardData.nombre) && !validatePassword(wizardData.password),
    () => !validateEdad(wizardData.edad) && !validatePeso(wizardData.peso) && !validateAltura(wizardData.altura),
    () => wizardData.meta !== '',
    () => wizardData.deportes.length > 0,
    () => true,
  ];

  // When user tries to go next: mark all current step fields as touched so errors show
  const handleNext = () => {
    if (step === 0) setTouched(t => ({ ...t, nombre: true, password: true }));
    if (step === 1) setTouched(t => ({ ...t, edad: true, peso: true, altura: true }));
    if (!canContinue) return; // block
    setStep(s => s + 1);
  };

  const canContinue = stepValid[step]?.() ?? false;
  const isLastStep = step === 4;

  const cardStyle = {
    background: 'var(--surface-2)', backdropFilter: 'blur(40px)',
    border: '1px solid var(--surface-3)', borderRadius: '24px',
    padding: '2rem 1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    width: '100%', maxWidth: '420px',
  };

  const inputStyle = {
    width: '100%', padding: '0.8rem 1rem', background: 'var(--surface-hover)',
    border: '1px solid var(--border-default)', borderRadius: '14px',
    color: '#fff', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)',
    letterSpacing: '0.5px', marginBottom: '0.35rem', display: 'block',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(0,201,255,0.08) 0%, #050508 60%)',
      padding: '1.5rem',
    }}>
      {/* Logo — always visible */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16, margin: '0 auto 0.6rem',
          background: 'linear-gradient(135deg, var(--color-primary), #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,201,255,0.3)',
        }}>
          <Zap size={26} color="#000" />
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
          Vórtice
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.15rem' }}>
          {mode === 'login' ? 'Tu coach de salud inteligente' : STEP_LABELS[step]}
        </p>
      </div>

      <div style={cardStyle}>
        {/* ═══ WIZARD PROGRESS ═══ */}
        {mode === 'wizard' && (
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.5rem' }}>
            {STEP_LABELS.map((label, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{
                  height: 3, width: '100%', borderRadius: 99,
                  background: i <= step ? 'var(--color-primary)' : 'var(--surface-2)',
                  transition: 'all 0.3s',
                }} />
                <span style={{
                  fontSize: '0.45rem', fontWeight: 800, letterSpacing: '0.5px',
                  color: i <= step ? 'var(--color-primary)' : 'var(--surface-3)',
                }}>{label.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        {/* ═══ LOGIN ═══ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={labelStyle}>NOMBRE DE USUARIO</label>
              <input
                style={inputStyle} type="text" placeholder="Gonzalo"
                value={loginData.username}
                onChange={e => setLoginData(p => ({ ...p, username: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>CONTRASEÑA</label>
              <input
                style={inputStyle} type="password" placeholder="••••••"
                value={loginData.password}
                onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '0.6rem 0.8rem', color: '#f87171', fontSize: '0.78rem', fontWeight: 600 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              background: 'linear-gradient(135deg, var(--color-primary), #3b82f6)', color: '#000',
              border: 'none', borderRadius: '14px', padding: '0.85rem',
              fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem',
              opacity: loading ? 0.6 : 1, marginTop: '0.25rem',
            }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            {/* Google login */}
            {GOOGLE_CLIENT_ID && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--surface-3)' }} />
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>o continuá con</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--surface-3)' }} />
                </div>
                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Error con Google')}
                    theme="filled_black" shape="pill" size="large" locale="es" />
                </GoogleOAuthProvider>
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              ¿Primera vez?{' '}
              <button type="button" onClick={() => { setMode('wizard'); setStep(0); setError(''); }}
                style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
                Creá tu perfil
              </button>
              {' · '}
              <button type="button" onClick={() => { setMode('recover'); setError(''); setRecoverResult(null); setRecoverUsername(''); }}
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                Olvidé mi contraseña
              </button>
            </div>
          </form>
        )}

        {/* ═══ RECOVER ═══ */}
        {mode === 'recover' && (
          <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: '0 0 0.3rem' }}>Recuperar contraseña</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>Ingresá tu nombre de usuario</p>
            </div>
            <div>
              <label style={labelStyle}>NOMBRE DE USUARIO</label>
              <input
                style={inputStyle} type="text" placeholder="Gonzalo"
                value={recoverUsername}
                onChange={e => setRecoverUsername(e.target.value)}
                required
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '0.6rem 0.8rem', color: '#f87171', fontSize: '0.78rem', fontWeight: 600 }}>
                {error}
              </div>
            )}
            {recoverResult && (
              <div style={{ background: 'rgba(0,201,255,0.08)', border: '1px solid rgba(0,201,255,0.2)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 800, marginBottom: '0.3rem' }}>TU CONTRASEÑA ES</div>
                <div style={{ color: 'var(--color-primary)', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.05em' }}>{recoverResult}</div>
              </div>
            )}
            {!recoverResult && (
              <button type="submit" disabled={loading || !recoverUsername.trim()} style={{
                background: 'linear-gradient(135deg, var(--color-primary), #3b82f6)', color: '#000',
                border: 'none', borderRadius: '14px', padding: '0.85rem',
                fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem',
                opacity: (loading || !recoverUsername.trim()) ? 0.6 : 1,
              }}>
                {loading ? 'Buscando...' : 'Ver contraseña'}
              </button>
            )}
            <button type="button" onClick={() => { setMode('login'); setError(''); setRecoverResult(null); }}
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
              ← Volver al login
            </button>
          </form>
        )}

        {/* ═══ WIZARD STEPS ═══ */}
        {mode === 'wizard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Step 0: Name + Password */}
            {step === 0 && (
              <>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', margin: '0 0 0.15rem' }}>¿Cómo te llamás?</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>Tu nombre de usuario y una contraseña para ingresar</p>
                </div>

                {/* Google Sign-In */}
                {GOOGLE_CLIENT_ID && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Error al iniciar con Google')}
                        theme="filled_black"
                        shape="pill"
                        size="large"
                        text="continue_with"
                        locale="es"
                      />
                    </GoogleOAuthProvider>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--surface-3)' }} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>o con email</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--surface-3)' }} />
                    </div>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>TU NOMBRE O APODO</label>
                  <input
                    style={{ ...inputStyle, borderColor: touched.nombre ? (validateNombre(wizardData.nombre) ? 'rgba(239,68,68,0.55)' : 'rgba(34,197,94,0.45)') : undefined }}
                    type="text" placeholder="Ej: Gonzalo, MatiasX, gonza_fit"
                    value={wizardData.nombre}
                    onChange={e => { setWizardData(p => ({ ...p, nombre: e.target.value })); setTouched(t => ({ ...t, nombre: true })); }}
                    maxLength={20} autoComplete="username" />
                  <FieldError error={validateNombre(wizardData.nombre)} show={touched.nombre} />
                  <FieldOK valid={!validateNombre(wizardData.nombre)} show={touched.nombre && wizardData.nombre.length >= 3} />
                  {!touched.nombre && <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Solo letras, números, espacios y _ (sin puntos ni guiones)</div>}
                </div>

                <div>
                  <label style={labelStyle}>CONTRASEÑA</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{ ...inputStyle, paddingRight: '2.5rem', borderColor: touched.password ? (validatePassword(wizardData.password) ? 'rgba(239,68,68,0.55)' : 'rgba(34,197,94,0.45)') : undefined }}
                      type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                      value={wizardData.password}
                      onChange={e => { setWizardData(p => ({ ...p, password: e.target.value })); setTouched(t => ({ ...t, password: true })); }}
                      autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <FieldError error={validatePassword(wizardData.password)} show={touched.password} />
                  <FieldOK valid={!validatePassword(wizardData.password)} show={touched.password && wizardData.password.length >= 6} />
                  {wizardData.password && (
                    <div style={{ marginTop: '0.3rem', height: 3, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, transition: 'all 0.3s', width: `${Math.min((wizardData.password.length / 12) * 100, 100)}%`, background: wizardData.password.length < 6 ? '#ef4444' : wizardData.password.length < 10 ? '#f59e0b' : '#22c55e' }} />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 1: Body stats */}
            {step === 1 && (
              <>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', margin: '0 0 0.15rem' }}>Tus medidas</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>Para calcular calorías y macros exactas</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <label style={labelStyle}>EDAD</label>
                    <input style={{ ...inputStyle, borderColor: touched.edad ? (validateEdad(wizardData.edad) ? 'rgba(239,68,68,0.55)' : 'rgba(34,197,94,0.45)') : undefined }}
                      type="number" placeholder="28" min={10} max={100}
                      value={wizardData.edad} onChange={e => { setWizardData(p => ({ ...p, edad: e.target.value })); setTouched(t => ({ ...t, edad: true })); }} />
                    <FieldError error={validateEdad(wizardData.edad)} show={touched.edad} />
                  </div>
                  <div>
                    <label style={labelStyle}>PESO (KG)</label>
                    <input style={{ ...inputStyle, borderColor: touched.peso ? (validatePeso(wizardData.peso) ? 'rgba(239,68,68,0.55)' : 'rgba(34,197,94,0.45)') : undefined }}
                      type="number" placeholder="75" min={30} max={300}
                      value={wizardData.peso} onChange={e => { setWizardData(p => ({ ...p, peso: e.target.value })); setTouched(t => ({ ...t, peso: true })); }} />
                    <FieldError error={validatePeso(wizardData.peso)} show={touched.peso} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>ALTURA (CM) <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>— opcional</span></label>
                  <input style={{ ...inputStyle, borderColor: touched.altura && validateAltura(wizardData.altura) ? 'rgba(239,68,68,0.55)' : undefined }}
                    type="number" placeholder="175" min={50} max={250}
                    value={wizardData.altura} onChange={e => { setWizardData(p => ({ ...p, altura: e.target.value })); setTouched(t => ({ ...t, altura: true })); }} />
                  <FieldError error={validateAltura(wizardData.altura)} show={touched.altura} />
                </div>
              </>
            )}

            {/* Step 2: Goal */}
            {step === 2 && (
              <>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', margin: '0 0 0.15rem' }}>¿Cuál es tu meta?</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>Define cómo el coach orienta tus rutinas</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {METAS.map(m => {
                    const sel = wizardData.meta === m.id;
                    return (
                      <button key={m.id} onClick={() => setWizardData(p => ({ ...p, meta: m.id }))}
                        style={{
                          padding: '0.85rem 0.7rem', borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
                          border: sel ? '2px solid var(--color-primary)' : '1px solid var(--surface-2)',
                          background: sel ? 'rgba(0,201,255,0.08)' : 'var(--surface-1)',
                          transition: 'all 0.2s',
                        }}>
                        <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>{m.icon}</div>
                        <div style={{ fontWeight: 800, color: sel ? 'var(--color-primary)' : 'var(--text-primary)', fontSize: '0.82rem' }}>{m.label}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.62rem', marginTop: '0.1rem', fontWeight: 600 }}>{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Step 3: Sports (multi-select) */}
            {step === 3 && (
              <>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', margin: '0 0 0.15rem' }}>¿Qué actividades hacés?</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>Elegí todas las que apliquen</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', maxHeight: '280px', overflowY: 'auto' }}>
                  {DEPORTES.map(d => {
                    const sel = wizardData.deportes.includes(d.id);
                    return (
                      <button key={d.id} onClick={() => toggleDeporte(d.id)}
                        style={{
                          padding: '0.6rem 0.3rem', borderRadius: '12px', cursor: 'pointer',
                          border: sel ? '2px solid var(--color-primary)' : '1px solid var(--surface-2)',
                          background: sel ? 'rgba(0,201,255,0.1)' : 'var(--surface-1)',
                          textAlign: 'center', transition: 'all 0.15s', position: 'relative',
                        }}>
                        {sel && (
                          <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 99,
                            background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={8} color="#000" strokeWidth={3} />
                          </div>
                        )}
                        <div style={{ fontSize: '1.2rem' }}>{d.icon}</div>
                        <div style={{ fontWeight: 700, color: sel ? 'var(--color-primary)' : 'var(--text-secondary)', fontSize: '0.6rem', marginTop: '0.15rem' }}>{d.label}</div>
                      </button>
                    );
                  })}
                </div>
                {wizardData.deportes.length > 0 && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 800 }}>
                    {wizardData.deportes.length} seleccionado{wizardData.deportes.length > 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}

            {/* Step 4: Profile pic */}
            {step === 4 && (
              <>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', margin: '0 0 0.15rem' }}>Tu foto de perfil</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>Opcional — podés agregarla después</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleProfilePic} style={{ display: 'none' }} />
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: 110, height: 110, borderRadius: 28, cursor: 'pointer',
                      background: wizardData.profilePic
                        ? `url(${wizardData.profilePic}) center/cover`
                        : 'linear-gradient(135deg, rgba(0,201,255,0.15), rgba(59,130,246,0.1))',
                      border: '2px dashed rgba(0,201,255,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                    {!wizardData.profilePic && <Camera size={32} color="var(--color-primary)" style={{ opacity: 0.6 }} />}
                  </div>
                  <button onClick={() => fileRef.current?.click()} style={{
                    background: 'rgba(0,201,255,0.08)', border: '1px solid rgba(0,201,255,0.2)',
                    borderRadius: '12px', padding: '0.5rem 1.2rem', cursor: 'pointer',
                    color: 'var(--color-primary)', fontWeight: 800, fontSize: '0.75rem',
                  }}>
                    {wizardData.profilePic ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '0.6rem 0.8rem', color: '#f87171', fontSize: '0.78rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
              <button
                onClick={() => step === 0 ? setMode('login') : setStep(s => s - 1)}
                style={{
                  padding: '0.75rem 0.9rem', border: '1px solid var(--surface-3)',
                  borderRadius: '14px', background: 'var(--surface-1)',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                }}>
                <ChevronLeft size={15} /> {step === 0 ? 'Login' : 'Atrás'}
              </button>

              {!isLastStep ? (
                <button
                  onClick={handleNext}
                  disabled={false}
                  style={{
                    flex: 1, border: 'none', borderRadius: '14px', padding: '0.75rem',
                    fontWeight: 900, cursor: canContinue ? 'pointer' : 'not-allowed',
                    fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                    background: canContinue ? 'linear-gradient(135deg, var(--color-primary), #3b82f6)' : 'var(--surface-2)',
                    color: canContinue ? '#000' : '#475569',
                    transition: 'all 0.2s',
                  }}>
                  Continuar <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  style={{
                    flex: 1, border: 'none', borderRadius: '14px', padding: '0.75rem',
                    fontWeight: 900, cursor: 'pointer', fontSize: '0.88rem',
                    background: 'linear-gradient(135deg, #10b981, var(--color-primary))',
                    color: '#000', opacity: loading ? 0.6 : 1,
                  }}>
                  {loading ? 'Creando...' : 'Empezar'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
