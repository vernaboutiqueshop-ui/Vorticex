import { useState, useEffect } from 'react';
import { X, Users, FileText, Dumbbell, Copy, Check, Zap } from 'lucide-react';
import { API, authFetch } from '../config';

function Avatar({ src, name, size = 48, level = 1 }) {
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  const sanitized = src && src !== 'null' && src !== 'undefined' ? src : null;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {sanitized ? (
        <img src={sanitized} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(6,182,212,0.5)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 900, fontSize: size * 0.3,
          border: '3px solid rgba(6,182,212,0.5)', boxShadow: '0 0 20px rgba(6,182,212,0.3)',
        }}>{initials}</div>
      )}
      <div style={{
        position: 'absolute', bottom: -2, right: -2,
        background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
        borderRadius: '50%', width: size * 0.36, height: size * 0.36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.17, fontWeight: 900, color: '#fff',
        border: '2px solid #050508',
      }}>{level}</div>
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const SECTION_LABEL = {
  fontWeight: 800, fontSize: '0.65rem', letterSpacing: '1.5px',
  textTransform: 'uppercase', color: '#475569', marginBottom: '0.6rem',
};

export default function PublicProfileModal({ nombre, onClose, currentUser }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('rutinas');
  const [clonedIds, setClonedIds] = useState({});
  const [cloningId, setCloningId] = useState(null);

  useEffect(() => {
    if (!nombre) return;
    setLoading(true);
    setPerfil(null);
    authFetch(`${API}/api/user/${encodeURIComponent(nombre)}/public`)
      .then(r => r.json())
      .then(data => { if (data.status === 'success') setPerfil(data.perfil); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [nombre]);

  const handleFollow = async () => {
    if (!currentUser || currentUser.toLowerCase() === nombre.toLowerCase()) return;
    setFollowing(f => !f);
    try { await authFetch(`${API}/api/comunidad/follow/${nombre}?user=${currentUser}`, { method: 'POST' }); } catch (e) {}
  };

  const handleClone = async (routineId, routineName) => {
    if (cloningId) return;
    setCloningId(routineId);
    try {
      const res = await authFetch(`${API}/api/comunidad/clone-routine/${routineId}?user=${currentUser}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') setClonedIds(prev => ({ ...prev, [routineId]: true }));
    } catch (e) {}
    setCloningId(null);
  };

  const expProgress = perfil ? Math.min(100, ((perfil.exp % 1000) / 1000) * 100) : 0;
  const isOwnProfile = currentUser?.toLowerCase() === nombre?.toLowerCase();
  const hasRutinas = perfil?.rutinas?.length > 0;
  const hasPosts = false; // Tab Posts deshabilitado

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '28px 28px 0 0', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <style>{`
          @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

        {/* Hero banner + avatar */}
        <div style={{ position: 'relative', height: 110, background: 'linear-gradient(135deg, #06b6d415 0%, #7c3aed25 50%, #06b6d410 100%)', borderRadius: '28px 28px 0 0', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -10, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
          {/* Close btn */}
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', backdropFilter: 'blur(4px)' }}>
            <X size={15} />
          </button>
          {/* Pill handle */}
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }} />
          {/* Avatar posicionado sobre el banner */}
          {!loading && perfil && (
            <div style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)' }}>
              <Avatar src={perfil.profile_pic} name={perfil.name} size={80} level={perfil.level} />
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0 3rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(6,182,212,0.1)', borderTopColor: '#06b6d4', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : !perfil ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '5rem 2rem 3rem' }}>Usuario no encontrado</p>
        ) : (
          <div style={{ padding: '3rem 1.25rem 2rem' }}>

            {/* Nombre + fecha */}
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: '0 0 0.2rem', color: '#fff', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>{perfil.name}</h2>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
                Miembro desde {new Date(perfil.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Botón seguir */}
            {!isOwnProfile && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <button onClick={handleFollow} style={{
                  padding: '0.55rem 2rem', borderRadius: '14px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                  background: following ? 'rgba(6,182,212,0.08)' : 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  border: following ? '1px solid rgba(6,182,212,0.3)' : '1px solid transparent',
                  color: following ? '#06b6d4' : '#fff',
                  transition: 'all 0.2s', letterSpacing: '0.5px',
                }}>
                  {following ? '✓ Siguiendo' : '+ Seguir'}
                </button>
              </div>
            )}

            {/* EXP bar */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '0.9rem 1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Zap size={13} color="#f59e0b" />
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>Nivel {perfil.level}</span>
                </div>
                <span style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: 900 }}>{perfil.exp.toLocaleString()} EXP</span>
              </div>
              <div style={{ height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${expProgress}%`, background: 'linear-gradient(90deg, #06b6d4, #7c3aed)', borderRadius: 99, transition: 'width 0.6s ease', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Seguidores', value: perfil.followers },
                { label: 'Siguiendo', value: perfil.following },
                { label: 'Posts', value: perfil.total_posts },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '0.8rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.15rem', lineHeight: 1 }}>{value}</div>
                  <div style={{ color: '#475569', fontSize: '0.6rem', fontWeight: 700, marginTop: '0.25rem' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Rutinas */}
            {hasRutinas && (
              <>
                <p style={{ ...SECTION_LABEL, margin: '0 0 0.6rem' }}>🏋️ Rutinas</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {perfil.rutinas.map(rt => (
                      <div key={rt.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: rt.preview_gifs?.length ? '0.7rem' : 0 }}>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.9rem' }}>{rt.name}</div>
                            <div style={{ color: '#475569', fontSize: '0.65rem', fontWeight: 700, marginTop: '0.15rem' }}>
                              <Dumbbell size={10} style={{ display: 'inline', marginRight: 3 }} />{rt.ejercicios_count} ejercicios
                            </div>
                          </div>
                          {!isOwnProfile && (
                            <button
                              onClick={() => handleClone(rt.id, rt.name)}
                              disabled={!!clonedIds[rt.id] || cloningId === rt.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.4rem 0.8rem', borderRadius: '10px', border: 'none', cursor: clonedIds[rt.id] ? 'default' : 'pointer',
                                background: clonedIds[rt.id] ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.12)',
                                color: clonedIds[rt.id] ? '#22c55e' : '#06b6d4',
                                fontWeight: 800, fontSize: '0.7rem', transition: 'all 0.2s',
                                border: `1px solid ${clonedIds[rt.id] ? 'rgba(34,197,94,0.2)' : 'rgba(6,182,212,0.2)'}`,
                                flexShrink: 0,
                              }}
                            >
                              {clonedIds[rt.id] ? <><Check size={12} /> Clonada</> : cloningId === rt.id ? '...' : <><Copy size={12} /> Clonar</>}
                            </button>
                          )}
                        </div>
                        {/* Preview GIFs */}
                        {rt.preview_gifs?.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {rt.preview_gifs.map((gif, i) => (
                              <div key={i} style={{ width: 52, height: 52, borderRadius: '10px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                <img src={gif} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </>
            )}

            {!hasRutinas && !hasPosts && (
              <p style={{ color: '#475569', textAlign: 'center', fontSize: '0.8rem', padding: '1rem 0' }}>Sin actividad pública aún</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
