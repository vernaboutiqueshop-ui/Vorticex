import { useState, useEffect } from 'react';
import { X, Users, FileText, Star, Calendar } from 'lucide-react';
import { API, authFetch } from '../config';

function Avatar({ src, name, size = 48, level = 1 }) {
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {src ? (
        <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(6,182,212,0.4)' }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 900, fontSize: size * 0.3,
          border: '2px solid rgba(6,182,212,0.4)',
        }}>{initials}</div>
      )}
      <div style={{
        position: 'absolute', bottom: -4, right: -4,
        background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
        borderRadius: '50%', width: size * 0.38, height: size * 0.38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.18, fontWeight: 900, color: '#fff',
        border: '1.5px solid #050508',
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

export default function PublicProfileModal({ nombre, onClose, currentUser }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!nombre) return;
    setLoading(true);
    authFetch(`${API}/api/user/${encodeURIComponent(nombre)}/public`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') setPerfil(data.perfil);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [nombre]);

  const handleFollow = async () => {
    if (!currentUser || currentUser.toLowerCase() === nombre.toLowerCase()) return;
    setFollowing(f => !f);
    try {
      await authFetch(`${API}/api/comunidad/follow/${nombre}?user=${currentUser}`, { method: 'POST' });
    } catch (e) {}
  };

  const expProgress = perfil ? Math.min(100, ((perfil.exp % 1000) / 1000) * 100) : 0;
  const isOwnProfile = currentUser?.toLowerCase() === nombre?.toLowerCase();

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'linear-gradient(180deg, #0f172a 0%, #050508 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px 24px 0 0',
          padding: '1.5rem',
          maxHeight: '85vh', overflowY: 'auto',
          animation: 'slideUp 0.25s ease-out',
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 28, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99, margin: '0 auto' }} />
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(6,182,212,0.1)', borderTopColor: '#06b6d4', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !perfil ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Usuario no encontrado</p>
        ) : (
          <>
            {/* Avatar + nombre */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Avatar src={perfil.profile_pic} name={perfil.name} size={80} level={perfil.level} />
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ margin: 0, color: '#fff', fontWeight: 900, fontSize: '1.3rem' }}>{perfil.name}</h2>
                <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.75rem' }}>
                  Nivel {perfil.level} · Desde {new Date(perfil.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Botón seguir */}
              {!isOwnProfile && (
                <button
                  onClick={handleFollow}
                  style={{
                    padding: '0.5rem 1.5rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                    background: following ? 'rgba(6,182,212,0.1)' : 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                    border: following ? '1px solid rgba(6,182,212,0.3)' : 'none',
                    color: following ? '#06b6d4' : '#fff',
                  }}
                >
                  {following ? '✓ Siguiendo' : '+ Seguir'}
                </button>
              )}
            </div>

            {/* EXP bar */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>EXP</span>
                <span style={{ color: '#06b6d4', fontSize: '0.7rem', fontWeight: 900 }}>{perfil.exp} pts</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${expProgress}%`, background: 'linear-gradient(90deg, #06b6d4, #7c3aed)', borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { icon: Users, label: 'Seguidores', value: perfil.followers },
                { icon: Users, label: 'Siguiendo', value: perfil.following },
                { icon: FileText, label: 'Posts', value: perfil.total_posts },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                  <Icon size={16} color="#06b6d4" style={{ marginBottom: '0.3rem' }} />
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: '1rem' }}>{value}</div>
                  <div style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Posts recientes */}
            {perfil.recent_posts?.length > 0 && (
              <>
                <h4 style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>Publicaciones recientes</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {perfil.recent_posts.map(post => (
                    <div key={post.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '0.75rem' }}>
                      {post.routine_name && (
                        <div style={{ color: '#06b6d4', fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.3rem' }}>🏋️ {post.routine_name}</div>
                      )}
                      {post.content && (
                        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.8rem', lineHeight: 1.5, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                        <span style={{ color: '#64748b', fontSize: '0.62rem' }}>{timeAgo(post.created_at)}</span>
                        <span style={{ color: '#64748b', fontSize: '0.62rem' }}>❤️ {post.likes_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
