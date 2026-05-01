import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Apple, Activity, BarChart2, User, Zap, Send, X, Bell, Heart, MessageCircle, Lock, Download, Smartphone, Info, ChevronDown } from 'lucide-react';
import { API, authFetch } from './config';
import WorkoutTracker from './components/WorkoutTracker';
import GymView from './components/GymView';
import NutricionView from './components/NutricionView';
import ComunidadView from './components/ComunidadView';
import GraficosView from './components/GraficosView';
import PerfilView from './components/PerfilView';
import LoginView from './components/LoginView';
import { LanguageProvider, useLanguage } from './LanguageContext';
import './index.css';

import PublicRoutineView from './components/PublicRoutineView';

function ComingSoon({ label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '70vh', gap: '1.2rem', textAlign: 'center', padding: '2rem',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(6,182,212,0.08)', border: '2px solid rgba(6,182,212,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Lock size={32} color="#06b6d4" />
      </div>
      <h2 style={{ color: '#fff', margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>
        {label}
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, maxWidth: 280, lineHeight: 1.5 }}>
        Próximamente disponible. Estamos trabajando para traerte esta funcionalidad.
      </p>
      <div style={{
        background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)',
        borderRadius: '12px', padding: '0.6rem 1.2rem',
        color: '#06b6d4', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '1px',
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

  useEffect(() => {
    if (!mountedTabs[activeTab]) {
      setMountedTabs(prev => ({ ...prev, [activeTab]: true }));
    }
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

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('vortice_hide_install', 'true');
  };

  // ── Notifications (must be before early returns) ──
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    const poll = () => authFetch(`${API}/api/comunidad/notifications/count?user=${authUser}`)
      .then(r => r.json()).then(d => { if (d.status === 'success') setNotifCount(d.count); }).catch(() => {});
    poll();
    const iv = setInterval(poll, 15000);
    return () => clearInterval(iv);
  }, [authUser]);

  const handleLogin = (username, token) => {
    setAuthUser(username);
    setAuthToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('vortice_user');
    localStorage.removeItem('vortice_token');
    setAuthUser(null);
    setAuthToken(null);
  };

  const handleLoadRutina = (rutina) => {
    setPendingRutina(rutina);
    setActiveTab('gym');
  };

  const handleLoginRedirect = () => {
    setPublicRoutineId(null);
    window.history.pushState({}, '', '/');
  };

  if (publicRoutineId) {
    return (
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
    );
  }

  if (!authUser || !authToken) {
    return <LoginView onLogin={handleLogin} />;
  }

  const perfil = authUser;
  const isAdmin = perfil?.toLowerCase() === 'gonza';

  const handleStartSession = (exercises, routineId, routineName) => {
    setSessionExercises(exercises);
    setSessionRoutineId(routineId);
    setSessionRoutineName(routineName);
    setSessionActive(true);
  };

  const handleSessionFinish = (result) => {
    setSessionActive(false);
    setSessionResult(result);
  };

  const handleSessionCancel = () => {
    setSessionActive(false);
  };

  const tabs = [
    { id: 'nutricion', icon: Apple,         label: t('nutrition') },
    { id: 'gym',       icon: Activity,      label: t('gym') },
    { id: 'comunidad', icon: MessageSquare, label: t('community') },
    { id: 'graficos',  icon: BarChart2,     label: t('stats') },
    { id: 'perfil',    icon: User,          label: t('profile') },
  ];

  return (
    <>
      <header className="top-header">
        <div className="title-main">
          <Zap size={22} color="var(--accent-gym)" />
          <span>Vórtice</span>
          <span style={{fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '0.25rem'}}>v4.0 Elite</span>
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <button onClick={() => setShowNotifs(true)} style={{
              position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem',
            }}>
              <Bell size={20} color={notifCount > 0 ? '#06b6d4' : '#64748b'} />
              {notifCount > 0 && (
                <div style={{
                  position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: '50%',
                  background: '#ef4444', color: '#fff', fontSize: '0.5rem', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #050508',
                }}>{notifCount > 9 ? '9+' : notifCount}</div>
              )}
            </button>
            <div className="profile-active-tag">
              <span className="dot pulse"></span>
              {perfil}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ PWA Install Banner ═══ */}
      {showInstallBanner && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(15,23,42,0.95) 100%)',
          border: '1px solid rgba(6,182,212,0.2)', borderRadius: '14px',
          margin: '0.5rem 0.75rem', padding: '0.7rem 0.85rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Smartphone size={16} color="#06b6d4" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
                {t('install_title') || 'Instalá la app'}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8', lineHeight: 1.3, marginTop: '0.1rem' }}>
                {t('install_subtitle') || 'Mejor experiencia, acceso directo'}
              </div>
            </div>
            <button
              onClick={() => setInstallExpanded(!installExpanded)}
              style={{
                background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)',
                borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.2s', transform: installExpanded ? 'rotate(180deg)' : 'none',
              }}
            >
              <ChevronDown size={14} color="#06b6d4" />
            </button>
            <button
              onClick={dismissInstallBanner}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem',
              }}
            >
              <X size={14} color="#64748b" />
            </button>
          </div>

          {installExpanded && (
            <div style={{
              marginTop: '0.7rem', paddingTop: '0.6rem',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              {/iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {[
                    { n: '1', text: 'Tocá el botón de compartir (□↑) en Safari' },
                    { n: '2', text: '"Añadir a pantalla de inicio"' },
                    { n: '3', text: 'Tocá "Agregar" y listo' },
                  ].map(s => (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 900, color: '#06b6d4',
                      }}>{s.n}</div>
                      <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>{s.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {[
                    { n: '1', text: 'Tocá el menú (⋮) de Chrome' },
                    { n: '2', text: '"Instalar app" o "Añadir a inicio"' },
                    { n: '3', text: 'Confirmá y listo' },
                  ].map(s => (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 900, color: '#06b6d4',
                      }}>{s.n}</div>
                      <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>{s.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <nav className="tabs-nav">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              className={`tab-btn ${isActive ? 'active' : ''}`} 
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={19} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="main-content">
        <div style={{ display: activeTab === 'nutricion' ? 'block' : 'none' }}>
          {mountedTabs.nutricion && (isAdmin ? <NutricionView perfil={perfil} /> : <ComingSoon label={t('nutrition')} />)}
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
    if (diff < 60) return lang === 'es' ? 'ahora' : 'now';
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
        background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} color="#06b6d4" />
            <span style={{ fontWeight: 900, fontSize: '1rem', color: '#fff' }}>{lang === 'es' ? 'Notificaciones' : 'Notifications'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem' }}>{t('loading')}</div>
          ) : notifs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <Bell size={32} color="#1e293b" style={{ marginBottom: '0.75rem' }} />
              <div style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 700 }}>{lang === 'es' ? 'Sin notificaciones' : 'No notifications'}</div>
              <div style={{ color: '#334155', fontSize: '0.7rem', marginTop: '0.25rem' }}>{lang === 'es' ? 'Cuando alguien interactúe con tus posts, aparecerá acá' : 'When someone interacts with your posts, it will show here'}</div>
            </div>
          ) : (
            notifs.map(n => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.75rem',
                background: n.is_read ? 'transparent' : 'rgba(6,182,212,0.04)',
                borderRadius: '12px', marginBottom: '0.2rem',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                  background: n.from_avatar ? `url(${n.from_avatar}) center/cover` : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: '0.75rem',
                }}>{!n.from_avatar && (n.from_user || '?')[0].toUpperCase()}</div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#fff', lineHeight: 1.35 }}>
                    <span style={{ fontWeight: 900, color: '#06b6d4' }}>{n.from_user}</span>
                    {' '}
                    <span style={{ fontWeight: 600, color: '#94a3b8' }}>
                      {n.type === 'like'
                        ? (lang === 'es' ? 'le dio ❤️ a tu post' : 'liked ❤️ your post')
                        : (lang === 'es' ? 'comentó en tu post' : 'commented on your post')}
                    </span>
                  </div>
                  {n.type === 'comment' && n.message && (
                    <div style={{
                      fontSize: '0.68rem', color: '#64748b', fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem',
                    }}>"{n.message}"</div>
                  )}
                </div>

                {/* Icon + time */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', flexShrink: 0 }}>
                  {n.type === 'like'
                    ? <Heart size={14} color="#ef4444" fill="#ef4444" />
                    : <MessageCircle size={14} color="#06b6d4" />
                  }
                  <span style={{ fontSize: '0.5rem', color: '#475569', fontWeight: 700 }}>{timeAgo(n.created_at)}</span>
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
          background: 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(6,182,212,0.8))',
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
          background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
          padding: '0.75rem', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#06b6d4', letterSpacing: '0.5px' }}>SUGERENCIAS</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={14} color="#64748b" />
            </button>
          </div>
          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0', color: '#10b981', fontSize: '0.75rem', fontWeight: 800 }}>Enviado!</div>
          ) : status === 'limited' ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>Esperá {cooldown}s para enviar otro</div>
          ) : (
            <>
              <textarea
                value={msg} onChange={e => setMsg(e.target.value.slice(0, 300))}
                placeholder="Tu idea o sugerencia..."
                rows={3}
                style={{
                  width: '100%', resize: 'none', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                  padding: '0.5rem', color: '#fff', fontSize: '0.75rem', fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                <span style={{ fontSize: '0.5rem', color: '#334155' }}>{msg.length}/300</span>
                <button onClick={handleSend} disabled={!msg.trim() || cooldown > 0} style={{
                  background: msg.trim() ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.06)',
                  border: 'none', borderRadius: '8px', padding: '0.35rem 0.7rem', cursor: msg.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '0.2rem',
                  color: msg.trim() ? '#000' : '#475569', fontWeight: 900, fontSize: '0.65rem',
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
      <AppContent />
    </LanguageProvider>
  );
}
