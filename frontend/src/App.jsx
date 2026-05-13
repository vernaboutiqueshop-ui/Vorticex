import { useState, useEffect, useRef, lazy, Suspense, memo, useMemo, useCallback, createContext, useContext } from 'react';
import { Flame, Dumbbell, Users, TrendingUp, CircleUser, Zap, Send, X, Bell, Heart, MessageCircle, Lock, Smartphone, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { API, authFetch, track } from './config';

// ── TOAST SYSTEM ─────────────────────────────────────
export const ToastContext = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success', duration = 2500) => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);
  const icons = { success: '✅', info: '💧', error: '❌', warning: '⚠️' };
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} className={`toast toast-${t.type === 'info' ? 'info' : t.type === 'error' ? 'error' : 'success'}`}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
              <span style={{ fontSize: '1rem' }}>{icons[t.type] || '✅'}</span>
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
import { ErrorBoundary } from './components/ErrorBoundary';

// Retry wrapper para lazy imports — evita pantalla blanca por fallo de red en mobile
const lazyWithRetry = (fn) => lazy(() => fn().catch(() => fn()));

// Lazy loading para views pesadas (reduce bundle inicial ~60%)
const GymView = lazyWithRetry(() => import('./components/GymView'));
const NutricionView = lazyWithRetry(() => import('./components/NutricionView'));
const ComunidadView = lazyWithRetry(() => import('./components/ComunidadView'));
const GraficosView = lazyWithRetry(() => import('./components/GraficosView'));
const PerfilView = lazyWithRetry(() => import('./components/PerfilView'));

// Componentes críticos que cargan inmediatamente
import WorkoutTracker from './components/WorkoutTracker';
import LoginView from './components/LoginView';
import { LanguageProvider, useLanguage } from './LanguageContext';
import './index.css';

// Lazy loading para vista pública
const PublicRoutineView = lazyWithRetry(() => import('./components/PublicRoutineView'));

// Componente de loading para Suspense
const TabLoader = memo(function TabLoader() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '60vh', gap: '1rem',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid rgba(0,201,255,0.1)',
        borderTopColor: 'var(--color-primary)',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});

function ComingSoon({ label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '70vh', gap: '1.2rem', textAlign: 'center', padding: '2rem',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(0,201,255,0.08)', border: '2px solid rgba(0,201,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Lock size={32} color="var(--color-primary)" />
      </div>
      <h2 style={{ color: '#fff', margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>
        {label}
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, maxWidth: 280, lineHeight: 1.5 }}>
        Próximamente disponible. Estamos trabajando para traerte esta funcionalidad.
      </p>
      <div style={{
        background: 'rgba(0,201,255,0.1)', border: '1px solid rgba(0,201,255,0.2)',
        borderRadius: '12px', padding: '0.6rem 1.2rem',
        color: 'var(--color-primary)', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '1px',
      }}>
        🚀 COMING SOON
      </div>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('gym');
  const [pendingRutina, setPendingRutina] = useState(null);
  const [publicRoutineId, setPublicRoutineId] = useState(null);
  const [mountedTabs, setMountedTabs] = useState({ gym: true });

  // Optimizado: solo actualiza si el tab no está montado
  useEffect(() => {
    setMountedTabs(prev => {
      if (prev[activeTab]) return prev; // No recrea objeto si ya existe
      return { ...prev, [activeTab]: true };
    });
  }, [activeTab]);
  
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/(?:\/public)?\/(rutina|routine)\/(\d+)/);
    if (match) {
      setPublicRoutineId(match[2]);
    }
  }, []);

  const { t } = useLanguage();

  // AUTH STATE
  const [authUser, setAuthUser] = useState(() => localStorage.getItem('vortice_user') || null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('vortice_token') || null);

  // ── Global session state (lifted from GymView) ──
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionExercises, setSessionExercises] = useState([]);
  const [sessionRoutineId, setSessionRoutineId] = useState(null);
  const [sessionRoutineName, setSessionRoutineName] = useState('');
  const [sessionResult, setSessionResult] = useState(null);

  // ── PWA Install Banner ──
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (isStandalone) return false;
    return localStorage.getItem('vortice_hide_install') !== 'true';
  });
  const [installExpanded, setInstallExpanded] = useState(false);
  const [installPlatform, setInstallPlatform] = useState(() =>
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android'
  );

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('vortice_hide_install', 'true');
  };

  // ── Backend health check — banner no intrusivo, auto-retry cada 30s ──
  const [backendDown, setBackendDown] = useState(false);
  useEffect(() => {
    let iv;
    const check = () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      fetch(`${API}/api/health`, { signal: ctrl.signal, headers: { 'ngrok-skip-browser-warning': 'true' } })
        .then(r => { clearTimeout(t); setBackendDown(!r.ok); })
        .catch(() => { clearTimeout(t); setBackendDown(true); });
    };
    check();
    iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  // ── Notifications (must be before early returns) ──
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    const poll = () => authFetch(`${API}/api/comunidad/notifications/count?user=${authUser}`)
      .then(r => r.json()).then(d => { if (d.status === 'success') setNotifCount(d.count); }).catch(() => {});
    poll();
    const iv = setInterval(poll, 60000);
    return () => clearInterval(iv);
  }, [authUser]);

  const handleLogin = useCallback((username, token) => {
    setAuthUser(username);
    setAuthToken(token);
    track('login', { username });
  }, []);

  const handleLogout = useCallback(() => {
    track('logout');
    localStorage.removeItem('vortice_user');
    localStorage.removeItem('vortice_token');
    setAuthUser(null);
    setAuthToken(null);
  }, []);

  const handleLoadRutina = useCallback((rutina) => {
    setPendingRutina(rutina);
    setActiveTab('gym');
  }, []);

  const handleLoginRedirect = useCallback(() => {
    setPublicRoutineId(null);
    window.history.pushState({}, '', '/');
  }, []);

  // ── Session handlers (DEBEN estar antes de cualquier early return) ──
  const handleStartSession = useCallback((exercises, routineId, routineName) => {
    setSessionExercises(exercises);
    setSessionRoutineId(routineId);
    setSessionRoutineName(routineName);
    setSessionActive(true);
  }, []);

  const handleSessionFinish = useCallback((result) => {
    setSessionActive(false);
    setSessionResult(result);
  }, []);

  const handleSessionCancel = useCallback(() => {
    setSessionActive(false);
  }, []);

  // Memoizado: tabs no cambian entre renders
  const tabs = useMemo(() => [
    { id: 'nutricion', icon: Flame,       label: t('nutrition') },
    { id: 'gym',       icon: Dumbbell,    label: t('gym') },
    { id: 'comunidad', icon: Users,       label: t('community') },
    { id: 'graficos',  icon: TrendingUp,  label: t('stats') },
    { id: 'perfil',    icon: CircleUser,  label: t('profile') },
  ], [t]);

  // ═══ EARLY RETURNS (después de todos los hooks) ═══
  if (publicRoutineId) {
    return (
      <ErrorBoundary>
      <Suspense fallback={<TabLoader />}>
        <PublicRoutineView 
          routineId={publicRoutineId} 
          onLoginRedirect={handleLoginRedirect} 
          perfil={authUser} 
          onClone={() => {
            setPublicRoutineId(null);
            window.history.pushState({}, '', '/');
            setActiveTab('gym');
          }}
        />
      </Suspense>
      </ErrorBoundary>
    );
  }

  if (!authUser || !authToken) {
    return <LoginView onLogin={handleLogin} />;
  }

  const perfil = authUser;
  const isAdmin = perfil?.toLowerCase() === 'gonza';

  return (
    <>
      <header className="top-header">
        <div className="title-main">
          <div className="logo-pulse">
            <Zap size={22} color="var(--color-primary)" />
          </div>
          <span style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vórtice</span>
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <button onClick={() => setShowNotifs(true)} style={{
              position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem',
            }}>
              <Bell size={20} color={notifCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
              <AnimatePresence>
                {notifCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    style={{
                      position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: '50%',
                      background: 'var(--color-danger)', color: '#fff', fontSize: '0.5rem', fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--color-bg)',
                    }}>{notifCount > 9 ? '9+' : notifCount}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <button
              onClick={() => setActiveTab('perfil')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="profile-active-tag">
                <span className="dot pulse"></span>
                {perfil}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Backend Down Banner ═══ */}
      {backendDown && (
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', margin: '0.5rem 0.75rem', padding: '0.6rem 0.9rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          <span style={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600 }}>
            Servidor no disponible — reconectando automáticamente…
          </span>
        </div>
      )}

      {/* ═══ PWA Install Banner ═══ */}
      {showInstallBanner && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,201,255,0.12) 0%, var(--surface-2) 100%)',
          border: '1px solid rgba(0,201,255,0.2)', borderRadius: '14px',
          margin: '0.5rem 0.75rem', padding: '0.7rem 0.85rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(0,201,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Smartphone size={16} color="var(--color-primary)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
                {t('install_title') || 'Instalá la app'}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', lineHeight: 1.3, marginTop: '0.1rem' }}>
                {t('install_subtitle') || 'Mejor experiencia, acceso directo'}
              </div>
            </div>
            <button
              onClick={() => setInstallExpanded(!installExpanded)}
              style={{
                background: 'rgba(0,201,255,0.15)', border: '1px solid rgba(0,201,255,0.3)',
                borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.2s', transform: installExpanded ? 'rotate(180deg)' : 'none',
              }}
            >
              <ChevronDown size={14} color="var(--color-primary)" />
            </button>
            <button
              onClick={dismissInstallBanner}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem',
              }}
            >
              <X size={14} color="var(--text-muted)" />
            </button>
          </div>

          {installExpanded && (
            <div style={{
              marginTop: '0.7rem', paddingTop: '0.6rem',
              borderTop: '1px solid var(--surface-2)',
            }}>
              {/* Platform toggle */}
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
                {[
                  { id: 'ios', label: '🍎 iPhone' },
                  { id: 'android', label: '🤖 Android / Chrome' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setInstallPlatform(p.id)}
                    style={{
                      flex: 1, padding: '0.35rem', borderRadius: 8, fontSize: '0.65rem', fontWeight: 800,
                      cursor: 'pointer', transition: '0.15s',
                      background: installPlatform === p.id ? 'rgba(0,201,255,0.2)' : 'var(--surface-hover)',
                      border: installPlatform === p.id ? '1px solid rgba(0,201,255,0.4)' : '1px solid var(--surface-3)',
                      color: installPlatform === p.id ? 'var(--color-primary)' : 'var(--text-muted)',
                    }}
                  >{p.label}</button>
                ))}
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {(installPlatform === 'ios' ? [
                  { n: '1', text: 'Abrí en Safari y tocá el botón compartir (□↑)' },
                  { n: '2', text: '"Añadir a pantalla de inicio"' },
                  { n: '3', text: 'Tocá "Agregar" y listo' },
                ] : [
                  { n: '1', text: 'Tocá el menú (⋮) arriba a la derecha en Chrome' },
                  { n: '2', text: '"Instalar app" o "Añadir a inicio"' },
                  { n: '3', text: 'Confirmá y listo' },
                ]).map(s => (
                  <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      background: 'rgba(0,201,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 900, color: 'var(--color-primary)',
                    }}>{s.n}</div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <nav className="tabs-nav">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); track('tab', { tab: tab.id }); }}
              whileTap={{ scale: 0.94 }}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="tab-btn-pill"
                  transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
                />
              )}
              <Icon size={18} />
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </nav>

      <main className="main-content">
        <ErrorBoundary>
        <Suspense fallback={<TabLoader />}>
          <div style={{ display: activeTab === 'nutricion' ? 'block' : 'none' }}>
            {mountedTabs.nutricion && (isAdmin ? <NutricionView perfil={perfil} onNavigateTo={setActiveTab} /> : <ComingSoon label={t('nutrition')} />)}
          </div>
          <div style={{ display: activeTab === 'gym' ? 'block' : 'none' }}>
            {mountedTabs.gym && <GymView perfil={perfil} onStartSession={handleStartSession} sessionActive={sessionActive} sessionResult={sessionResult} onClearResult={() => { setSessionResult(null); }} />}
          </div>
          <div style={{ display: activeTab === 'comunidad' ? 'block' : 'none' }}>
            {mountedTabs.comunidad && <ComunidadView perfil={perfil} />}
          </div>
          <div style={{ display: activeTab === 'graficos' ? 'block' : 'none' }}>
            {mountedTabs.graficos && (isAdmin ? <GraficosView perfil={perfil} /> : <ComingSoon label={t('stats')} />)}
          </div>
          <div style={{ display: activeTab === 'perfil' ? 'block' : 'none' }}>
            {mountedTabs.perfil && <PerfilView perfil={perfil} onLogout={handleLogout} />}
          </div>
        </Suspense>
        </ErrorBoundary>
      </main>
      {/* Notifications Modal */}
      {showNotifs && <NotificationsModal perfil={perfil} onClose={() => { setShowNotifs(false); setNotifCount(0); }} />}

      {/* Global WorkoutTracker — visible across all tabs when minimized */}
      {sessionActive && (
        <WorkoutTracker
          exercises={sessionExercises}
          routineId={sessionRoutineId}
          routineName={sessionRoutineName}
          perfil={perfil}
          onFinish={handleSessionFinish}
          onCancel={handleSessionCancel}
        />
      )}
      <FeedbackBubble perfil={perfil} />
    </>
  );
}

function NotificationsModal({ perfil, onClose }) {
  const { t, lang } = useLanguage();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${API}/api/comunidad/notifications?user=${perfil}`);
        const data = await res.json();
        if (data.status === 'success') setNotifs(data.notifications);
        await authFetch(`${API}/api/comunidad/notifications/read?user=${perfil}`, { method: 'POST' });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [perfil]);

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts + 'Z').getTime()) / 1000;
    if (diff < 60) return t('now_label');
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 15000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '4rem',
    }}>
      <div style={{
        width: 'min(92vw, 400px)', maxHeight: '70vh',
        background: 'var(--surface-2)', border: '1px solid var(--surface-3)',
        borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} color="var(--color-primary)" />
            <span style={{ fontWeight: 900, fontSize: '1rem', color: '#fff' }}>{t('notifications')}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t('loading')}</div>
          ) : notifs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <Bell size={32} color="var(--surface-2)" style={{ marginBottom: '0.75rem' }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>{t('no_notifications')}</div>
              <div style={{ color: 'var(--surface-3)', fontSize: '0.7rem', marginTop: '0.25rem' }}>{t('notif_hint')}</div>
            </div>
          ) : (
            notifs.map(n => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.75rem',
                background: n.is_read ? 'transparent' : 'rgba(0,201,255,0.04)',
                borderRadius: '12px', marginBottom: '0.2rem',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                  background: n.from_avatar ? `url(${n.from_avatar}) center/cover` : 'linear-gradient(135deg, var(--color-primary), #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: '0.75rem',
                }}>{!n.from_avatar && (n.from_user || '?')[0].toUpperCase()}</div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#fff', lineHeight: 1.35 }}>
                    <span style={{ fontWeight: 900, color: 'var(--color-primary)' }}>{n.from_user}</span>
                    {' '}
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {n.type === 'like'
                        ? (lang === 'es' ? 'le dio ❤️ a tu post' : 'liked ❤️ your post')
                        : n.type === 'admin_reply'
                        ? (lang === 'es' ? 'respondió a tu sugerencia' : 'replied to your feedback')
                        : (lang === 'es' ? 'comentó en tu post' : 'commented on your post')}
                    </span>
                  </div>
                  {(n.type === 'comment' || n.type === 'admin_reply') && n.message && (
                    <div style={{
                      fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem',
                    }}>"{n.message}"</div>
                  )}
                </div>

                {/* Icon + time */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', flexShrink: 0 }}>
                  {n.type === 'like'
                    ? <Heart size={14} color="#ef4444" fill="#ef4444" />
                    : n.type === 'admin_reply'
                    ? <Zap size={14} color="#f59e0b" />
                    : <MessageCircle size={14} color="var(--color-primary)" />
                  }
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>{timeAgo(n.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackBubble({ perfil }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState(null); // 'sent' | 'limited' | 'error'
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const handleSend = async () => {
    if (!msg.trim() || cooldown > 0) return;
    try {
      const res = await authFetch(`${API}/api/perfil/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, message: msg.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStatus('sent');
        setMsg('');
        setCooldown(60);
        timerRef.current = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; }), 1000);
        setTimeout(() => { setStatus(null); setOpen(false); }, 2000);
      } else if (data.status === 'rate_limited') {
        setStatus('limited');
        setCooldown(60);
        timerRef.current = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; }), 1000);
      }
    } catch { setStatus('error'); }
  };

  return (
    <>
      {/* Bubble trigger */}
      {!open && (
        <button onClick={() => setOpen(true)} style={{
          position: 'fixed', bottom: 'calc(5.2rem + env(safe-area-inset-bottom, 0px))',
          left: '0.75rem', zIndex: 8000, width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(0,201,255,0.8))',
          border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <MessageSquare size={16} color="#fff" />
        </button>
      )}

      {/* Mini panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 'calc(5.2rem + env(safe-area-inset-bottom, 0px))',
          left: '0.75rem', zIndex: 8000, width: 260,
          background: 'var(--surface-2)', backdropFilter: 'blur(20px)',
          border: '1px solid var(--surface-3)', borderRadius: '16px',
          padding: '0.75rem', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px' }}>SUGERENCIAS</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={14} color="var(--text-muted)" />
            </button>
          </div>
          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0', color: 'var(--color-prot)', fontSize: '0.75rem', fontWeight: 800 }}>Enviado!</div>
          ) : status === 'limited' ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0', color: 'var(--color-kcal)', fontSize: '0.7rem', fontWeight: 700 }}>Esperá {cooldown}s para enviar otro</div>
          ) : (
            <>
              <textarea
                value={msg} onChange={e => setMsg(e.target.value.slice(0, 300))}
                placeholder="Tu idea o sugerencia..."
                rows={3}
                style={{
                  width: '100%', resize: 'none', background: 'var(--surface-hover)',
                  border: '1px solid var(--surface-3)', borderRadius: '10px',
                  padding: '0.5rem', color: '#fff', fontSize: '0.75rem', fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                <span style={{ fontSize: '0.5rem', color: 'var(--surface-3)' }}>{msg.length}/300</span>
                <button onClick={handleSend} disabled={!msg.trim() || cooldown > 0} style={{
                  background: msg.trim() ? 'linear-gradient(135deg, var(--color-primary), #3b82f6)' : 'var(--surface-2)',
                  border: 'none', borderRadius: '8px', padding: '0.35rem 0.7rem', cursor: msg.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '0.2rem',
                  color: msg.trim() ? '#000' : 'var(--text-muted)', fontWeight: 900, fontSize: '0.65rem',
                }}>
                  <Send size={10} /> {cooldown > 0 ? `${cooldown}s` : 'Enviar'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LanguageProvider>
  );
}
