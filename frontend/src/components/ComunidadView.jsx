import { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, MessageCircle, Send, Image as ImageIcon, X, Dumbbell, Loader, UserPlus, UserCheck, Play, Trash2, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { API, authFetch, track } from '../config';
import PublicProfileModal from './PublicProfileModal';
import { useLanguage } from '../LanguageContext';

const i18n = {
  es: {
    placeholder: (p) => `¿Qué entrenaste hoy, ${p}? Escribí @ para adjuntar rutina`,
    routine: 'Rutina', publish: 'Publicar', publishing: 'Publicando...',
    cloneEdit: 'Clonar y Editar', sharedRoutine: 'Rutina compartida — cloná para verla completa',
    noPostsYet: 'Sin publicaciones aún', beFirst: '¡Sé el primero en compartir!',
    noMorePosts: 'No hay más publicaciones',
    clonedOk: (name) => `¡Rutina "${name}" clonada! Andá a Gym para editarla.`,
    cloneError: 'Error al clonar',
  },
  en: {
    placeholder: (p) => `What did you train today, ${p}? Write @ to attach a routine`,
    routine: 'Routine', publish: 'Publish', publishing: 'Publishing...',
    cloneEdit: 'Clone & Edit', sharedRoutine: 'Shared routine — clone to see full details',
    noPostsYet: 'No posts yet', beFirst: 'Be the first to share!',
    noMorePosts: 'No more posts',
    clonedOk: (name) => `Routine "${name}" cloned! Go to Gym to edit it.`,
    cloneError: 'Error cloning',
  },
};

const MAX_MEDIA_BYTES = 3 * 1024 * 1024;

const sanitizeAvatar = (src) => {
  if (!src) return null;
  if (src === 'string' || src === 'null' || src === 'undefined') return null;
  if (src.startsWith('data:image') || src.startsWith('http') || src.startsWith('/')) return src;
  return null;
};

const Avatar = ({ src, name, size = 36, level }) => {
  src = sanitizeAvatar(src);
  const badgeSize = Math.max(14, size * 0.4);
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.3,
        background: src ? `url(${src}) center/cover no-repeat` : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, color: 'white', fontSize: size * 0.38,
        border: '2px solid rgba(6,182,212,0.25)',
      }}>
        {!src && (name?.[0] || '?').toUpperCase()}
      </div>
      {level != null && (
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          minWidth: badgeSize, height: badgeSize, borderRadius: 99,
          background: '#06b6d4', color: '#000',
          fontSize: size < 30 ? '0.35rem' : '0.42rem',
          fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid #0a0a12', padding: '0 2px',
        }}>{level}</div>
      )}
    </div>
  );
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

export default function ComunidadView({ perfil }) {
  const { lang } = useLanguage();
  const tx = i18n[lang] || i18n.es;
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [activeComments, setActiveComments] = useState({});
  const [commentsData, setCommentsData] = useState({});
  const [newComment, setNewComment] = useState({});
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null);
  const [currentUserLevel, setCurrentUserLevel] = useState(1);
  const [myRoutines, setMyRoutines] = useState([]);
  const [showRoutinePicker, setShowRoutinePicker] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaBase64, setMediaBase64] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [followState, setFollowState] = useState({});
  const [mediaViewerUrl, setMediaViewerUrl] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIdx, setMentionIdx] = useState(-1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const sentinelRef = useRef(null);

  const PAGE_SIZE = 15;

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [feedRes, profileRes, routinesRes] = await Promise.all([
        authFetch(`${API}/api/comunidad/feed?user=${perfil}&limit=${PAGE_SIZE}&offset=0`),
        authFetch(`${API}/api/perfil/${perfil}`),
        authFetch(`${API}/api/gym/rutinas?perfil=${perfil}`),
      ]);
      const [feedData, profileData, routinesData] = await Promise.all([
        feedRes.json(), profileRes.json(), routinesRes.json()
      ]);
      if (feedRes.ok) {
        setPosts(feedData.posts || []);
        setHasMore(feedData.has_more ?? false);
      }
      if (profileData.perfil) {
        setCurrentUserAvatar(profileData.perfil.profile_pic);
        setCurrentUserLevel(profileData.perfil.level || 1);
      }
      if (routinesData.status === 'success') setMyRoutines(routinesData.rutinas || []);
    } catch (err) {
      console.error("Error al cargar el feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [perfil]);

  useEffect(() => {
    fetchPosts();
    const iv = setInterval(() => {
      if (!document.hidden) fetchPosts(true);
    }, 30000);
    return () => clearInterval(iv);
  }, [fetchPosts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await authFetch(`${API}/api/comunidad/feed?user=${perfil}&limit=${PAGE_SIZE}&offset=${posts.length}`);
      const data = await res.json();
      if (res.ok) {
        setPosts(prev => [...prev, ...(data.posts || [])]);
        setHasMore(data.has_more ?? false);
      }
    } catch (e) { console.error(e); }
    setLoadingMore(false);
  }, [loadingMore, hasMore, perfil, posts.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(); }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_MEDIA_BYTES) {
      alert("El archivo es muy grande (máx 3MB)");
      return;
    }
    const type = file.type.startsWith('video/') ? 'video' : file.type === 'image/gif' ? 'gif' : 'image';
    setMediaType(type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaBase64(reader.result);
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearMedia = () => { setMediaPreview(null); setMediaBase64(null); setMediaType(null); };

  const handlePost = async () => {
    if (!newPost.trim() && !selectedRoutineId && !mediaBase64) return;
    setIsPosting(true);
    try {
      const res = await authFetch(`${API}/api/comunidad/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfil, content: newPost,
          routine_id: selectedRoutineId,
          image_url: mediaBase64 || null,
          media_type: mediaType,
        })
      });
      if (res.ok) {
        setNewPost("");
        setSelectedRoutineId(null);
        setShowRoutinePicker(false);
        clearMedia();
        fetchPosts(true);
      }
    } catch (err) { console.error("Error al publicar:", err); }
    finally { setIsPosting(false); }
  };

  const handleLike = async (postId) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = !p.user_has_liked;
        return { ...p, user_has_liked: isLiked ? 1 : 0, likes_count: isLiked ? p.likes_count + 1 : p.likes_count - 1 };
      }
      return p;
    }));
    track('like', { post: postId });
    try { await authFetch(`${API}/api/comunidad/like/${postId}?user=${perfil}`, { method: 'POST' }); }
    catch (err) { console.error(err); }
  };

  const handleFollow = async (targetUser) => {
    if (targetUser.toLowerCase() === perfil.toLowerCase()) return;
    setFollowState(prev => ({ ...prev, [targetUser]: !prev[targetUser] }));
    track('follow', { target: targetUser });
    try { await authFetch(`${API}/api/comunidad/follow/${targetUser}?user=${perfil}`, { method: 'POST' }); }
    catch (err) { console.error(err); }
  };

  const toggleComments = async (postId) => {
    if (activeComments[postId]) {
      setActiveComments(prev => ({ ...prev, [postId]: false }));
    } else {
      setActiveComments(prev => ({ ...prev, [postId]: true }));
      try {
        const res = await authFetch(`${API}/api/comunidad/post/${postId}/comments`);
        const data = await res.json();
        setCommentsData(prev => ({ ...prev, [postId]: data.comments }));
      } catch (e) { console.error(e); }
    }
  };

  const handleSendComment = async (postId) => {
    const txt = newComment[postId];
    if (!txt?.trim()) return;
    try {
      const res = await authFetch(`${API}/api/comunidad/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, user: perfil, content: txt })
      });
      if (res.ok) {
        setNewComment(prev => ({ ...prev, [postId]: "" }));
        const res2 = await authFetch(`${API}/api/comunidad/post/${postId}/comments`);
        const data2 = await res2.json();
        const comments = data2.comments || [];
        setCommentsData(prev => ({ ...prev, [postId]: comments }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: comments.length } : p));
        track('comment', { post: postId });
      }
    } catch (e) { console.error(e); }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('¿Eliminar esta publicación?')) return;
    try {
      const res = await authFetch(`${API}/api/comunidad/post/${postId}?user=${perfil}`, { method: 'DELETE' });
      if (res.ok) setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e) { console.error(e); }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await authFetch(`${API}/api/comunidad/comment/${commentId}?user=${perfil}`, { method: 'DELETE' });
      if (res.ok) {
        setCommentsData(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
      }
    } catch (e) { console.error(e); }
  };

  const handleCloneRoutine = async (routineId, routineName) => {
    try {
      const res = await authFetch(`${API}/api/comunidad/clone-routine/${routineId}?user=${perfil}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        alert(tx.clonedOk(routineName));
      } else { alert(tx.cloneError); }
    } catch { alert('Error al clonar'); }
  };

  const selectedRoutine = myRoutines.find(r => r.id === selectedRoutineId);

  return (
    <div className="view-container" style={{ position: 'relative' }}>

      {/* ═══ INLINE LOADING OVERLAY (not full-page) ═══ */}
      {(loading || refreshing) && (
        <div style={{
          position: loading ? 'relative' : 'absolute',
          top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: loading ? '4rem 0' : '1rem 0',
          zIndex: 10,
        }}>
          <div style={{
            background: 'rgba(5,5,8,0.85)', backdropFilter: 'blur(12px)',
            borderRadius: '16px', padding: '1rem 1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            border: '1px solid rgba(6,182,212,0.15)',
          }}>
            <Loader size={18} color="#06b6d4" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#06b6d4', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.5px' }}>
              {loading ? 'CARGANDO FEED...' : 'ACTUALIZANDO...'}
            </span>
          </div>
        </div>
      )}

      {/* Only show content after initial load */}
      {!loading && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

          {/* ════ COMPOSER ════ */}
          <div style={{
            background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px',
            padding: '1rem 1.1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <Avatar src={currentUserAvatar} name={perfil} size={38} level={currentUserLevel} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <textarea
                    ref={textareaRef}
                    placeholder={tx.placeholder(perfil)}
                    value={newPost}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewPost(val);
                      const cursor = e.target.selectionStart;
                      const before = val.slice(0, cursor);
                      const atMatch = before.match(/@([\w\s]*)$/);
                      if (atMatch) {
                        setMentionQuery(atMatch[1].toLowerCase());
                        setMentionIdx(0);
                      } else {
                        setMentionQuery(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (mentionQuery !== null) {
                        const filtered = myRoutines.filter(r => r.name.toLowerCase().includes(mentionQuery));
                        if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, filtered.length - 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); }
                        else if (e.key === 'Enter' && filtered.length > 0) {
                          e.preventDefault();
                          const r = filtered[Math.max(0, mentionIdx)];
                          const cursor = textareaRef.current.selectionStart;
                          const before = newPost.slice(0, cursor).replace(/@[\w\s]*$/, '');
                          const after = newPost.slice(cursor);
                          setNewPost(before + `@${r.name} ` + after);
                          setSelectedRoutineId(r.id);
                          setMentionQuery(null);
                        } else if (e.key === 'Escape') { setMentionQuery(null); }
                      }
                    }}
                    rows={2}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '12px', padding: '0.65rem 0.75rem', color: 'white', fontSize: '0.85rem',
                      resize: 'none', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  {/* @ mention dropdown */}
                  {mentionQuery !== null && (
                    <div className="animate-in" style={{
                      position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20,
                      marginTop: '0.25rem', borderRadius: '12px', overflow: 'hidden',
                      background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(6,182,212,0.2)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)', maxHeight: 180, overflowY: 'auto',
                    }}>
                      {myRoutines.length === 0 ? (
                        <div style={{ padding: '0.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>
                          No tenés rutinas cargadas. ¡Creá una desde el Gym!
                        </div>
                      ) : (
                        <>
                          <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.5rem', fontWeight: 900, color: '#64748b', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            ADJUNTAR RUTINA
                          </div>
                          {myRoutines.filter(r => r.name.toLowerCase().includes(mentionQuery)).length === 0 ? (
                            <div style={{ padding: '0.6rem', textAlign: 'center', color: '#475569', fontSize: '0.7rem' }}>Sin coincidencias</div>
                          ) : (
                            myRoutines.filter(r => r.name.toLowerCase().includes(mentionQuery)).map((r, i) => (
                              <button
                                key={r.id}
                                onClick={() => {
                                  const cursor = textareaRef.current?.selectionStart || newPost.length;
                                  const before = newPost.slice(0, cursor).replace(/@[\w\s]*$/, '');
                                  const after = newPost.slice(cursor);
                                  setNewPost(before + `@${r.name} ` + after);
                                  setSelectedRoutineId(r.id);
                                  setMentionQuery(null);
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                                  padding: '0.5rem 0.6rem', border: 'none', cursor: 'pointer', textAlign: 'left',
                                  background: i === mentionIdx ? 'rgba(6,182,212,0.12)' : 'transparent',
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                }}
                              >
                                <Dumbbell size={13} color="#06b6d4" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                                  <div style={{ fontSize: '0.5rem', color: '#64748b' }}>{Array.isArray(r.ejercicios) ? `${r.ejercicios.length} ejercicios` : ''}</div>
                                </div>
                              </button>
                            ))
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Media preview */}
                {mediaPreview && (
                  <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {mediaType === 'video' ? (
                      <video src={mediaPreview} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} muted />
                    ) : (
                      <img src={mediaPreview} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} alt="preview" />
                    )}
                    <button onClick={clearMedia} style={{
                      position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 99,
                      background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><X size={12} color="#fff" /></button>
                  </div>
                )}

                {/* Routine preview */}
                {selectedRoutine && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                    background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                    borderRadius: '10px', padding: '0.4rem 0.6rem',
                  }}>
                    <Dumbbell size={13} color="#06b6d4" />
                    <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: 800, color: '#06b6d4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedRoutine.name}
                    </span>
                    <button onClick={() => setSelectedRoutineId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <X size={12} color="#94a3b8" />
                    </button>
                  </div>
                )}

                {/* Actions row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <input
                      ref={fileInputRef} type="file" onChange={handleFileSelect}
                      accept="image/*,video/*,.gif" style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => fileInputRef.current.click()}
                      style={{
                        background: mediaPreview ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${mediaPreview ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '10px', padding: '0.35rem 0.6rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        color: mediaPreview ? '#06b6d4' : '#64748b', fontSize: '0.65rem', fontWeight: 800,
                      }}
                    >
                      <ImageIcon size={13} /> Media
                    </button>
                    {myRoutines.length > 0 && (
                      <button
                        onClick={() => setShowRoutinePicker(!showRoutinePicker)}
                        style={{
                          background: showRoutinePicker ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${showRoutinePicker ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '10px', padding: '0.35rem 0.6rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                          color: showRoutinePicker ? '#06b6d4' : '#64748b', fontSize: '0.65rem', fontWeight: 800,
                        }}
                      >
                        <Dumbbell size={13} /> {tx.routine}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handlePost}
                    disabled={isPosting || (!newPost.trim() && !selectedRoutineId && !mediaBase64)}
                    style={{
                      background: (isPosting || (!newPost.trim() && !selectedRoutineId && !mediaBase64))
                        ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                      color: (isPosting || (!newPost.trim() && !selectedRoutineId && !mediaBase64)) ? '#475569' : '#000',
                      border: 'none', borderRadius: '10px', padding: '0.4rem 1rem',
                      fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}
                  >
                    {isPosting ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                    {isPosting ? '' : tx.publish}
                  </button>
                </div>
              </div>
            </div>

            {/* Routine picker */}
            {showRoutinePicker && (
              <div className="animate-in no-scrollbar" style={{
                marginTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
                maxHeight: '160px', overflowY: 'auto',
              }}>
                <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#64748b', letterSpacing: '1px', marginBottom: '0.2rem' }}>
                  COMPARTIR RUTINA
                </div>
                {myRoutines.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRoutineId(r.id); setShowRoutinePicker(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: selectedRoutineId === r.id ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selectedRoutineId === r.id ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: '10px', padding: '0.5rem 0.6rem', cursor: 'pointer',
                      textAlign: 'left', width: '100%',
                    }}
                  >
                    <Dumbbell size={13} color={selectedRoutineId === r.id ? '#06b6d4' : '#475569'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 600 }}>
                        {Array.isArray(r.ejercicios) ? `${r.ejercicios.length} ejercicios` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ════ FEED ════ */}
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#475569' }}>
              <MessageCircle size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{tx.noPostsYet}</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', opacity: 0.5 }}>{tx.beFirst}</div>
            </div>
          )}

          {posts.map((post, postIdx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: postIdx * 0.05, duration: 0.3 }}
              style={{
              background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '18px', overflow: 'hidden',
            }}>
              {/* User Header */}
              <div style={{ padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <div onClick={() => setViewingProfile(post.user_name)} style={{ cursor: 'pointer' }}>
                    <Avatar src={post.user_avatar} name={post.user_name} size={38} level={post.user_level} />
                  </div>
                  <div>
                    <h4 onClick={() => setViewingProfile(post.user_name)} style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#ffffff', cursor: 'pointer' }}>{post.user_name}</h4>
                    <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>{timeAgo(post.created_at)}</span>
                  </div>
                </div>
                {post.user_name?.toLowerCase() !== perfil?.toLowerCase() && (
                  <button
                    onClick={() => handleFollow(post.user_name)}
                    style={{
                      background: followState[post.user_name] ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${followState[post.user_name] ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '10px', padding: '0.3rem 0.6rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.2rem',
                      color: followState[post.user_name] ? '#06b6d4' : '#64748b',
                      fontSize: '0.6rem', fontWeight: 800,
                    }}
                  >
                    {followState[post.user_name] ? <UserCheck size={12} /> : <UserPlus size={12} />}
                    {followState[post.user_name] ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: '0 1rem 0.9rem' }}>
                {post.content && (
                  <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: '#e2e8f0', whiteSpace: 'pre-wrap', margin: '0 0 0.6rem', fontWeight: 500 }}>{post.content}</p>
                )}

                {/* Media */}
                {post.image_url && (
                  <div
                    onClick={() => setMediaViewerUrl(post.image_url)}
                    style={{ borderRadius: '14px', overflow: 'hidden', marginBottom: '0.5rem', cursor: 'pointer', position: 'relative' }}
                  >
                    {post.media_type === 'video' ? (
                      <>
                        <video src={post.image_url} style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} muted />
                        <div style={{
                          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0,0,0,0.3)',
                        }}>
                          <Play size={40} color="#fff" fill="#fff" style={{ opacity: 0.9 }} />
                        </div>
                      </>
                    ) : (
                      <img src={post.image_url} style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} alt="" />
                    )}
                  </div>
                )}

                {/* Shared Routine Card */}
                {post.routine_id && post.routine_name && (
                  <div style={{
                    background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)',
                    borderRadius: '14px', overflow: 'hidden',
                  }}>
                    {/* Card header */}
                    <div style={{ padding: '0.65rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(6,182,212,0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Dumbbell size={14} color="#06b6d4" />
                        <span style={{ fontWeight: 900, fontSize: '0.75rem', color: '#06b6d4', letterSpacing: '0.3px' }}>
                          {post.routine_name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          onClick={() => handleCloneRoutine(post.routine_id, post.routine_name)}
                          style={{
                            background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.1))',
                            border: '1px solid rgba(6,182,212,0.3)',
                            borderRadius: '10px', padding: '0.3rem 0.65rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            fontSize: '0.6rem', fontWeight: 900, color: '#06b6d4',
                          }}
                        >
                          <Copy size={11} /> {tx.cloneEdit}
                        </button>
                      </div>
                    </div>
                    {/* Exercise thumbnails grid */}
                    {post.routine_exercises?.length > 0 && (
                      <div style={{ padding: '0.55rem 0.75rem', display: 'flex', gap: '0.35rem', overflowX: 'auto' }} className="no-scrollbar">
                        {post.routine_exercises.slice(0, 8).map((ex, i) => (
                          <div key={i} style={{ flexShrink: 0, textAlign: 'center', width: 48 }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: '10px', background: '#fff',
                              overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                              <img src={ex.gif_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <div style={{ fontSize: '0.42rem', color: '#94a3b8', fontWeight: 700, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ex.name || ''}
                            </div>
                          </div>
                        ))}
                        {post.routine_exercises.length > 8 && (
                          <div style={{
                            flexShrink: 0, width: 48, height: 48, borderRadius: '10px',
                            background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 900, color: '#06b6d4', border: '1px solid rgba(6,182,212,0.15)',
                          }}>
                            +{post.routine_exercises.length - 8}
                          </div>
                        )}
                      </div>
                    )}
                    {(!post.routine_exercises || post.routine_exercises.length === 0) && (
                      <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.65rem', color: '#475569', fontStyle: 'italic' }}>
                        {tx.sharedRoutine}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Interaction Bar */}
              <div style={{
                padding: '0.65rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', gap: '1.2rem',
              }}>
                <button
                  onClick={() => handleLike(post.id)}
                  style={{
                    background: 'none', border: 'none', display: 'flex',
                    alignItems: 'center', gap: '0.3rem', cursor: 'pointer',
                    color: post.user_has_liked ? '#f43f5e' : '#64748b',
                    transition: 'transform 0.15s',
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Heart size={18} fill={post.user_has_liked ? '#f43f5e' : 'none'} strokeWidth={2.5} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>{post.likes_count}</span>
                </button>
                <button
                  onClick={() => toggleComments(post.id)}
                  style={{
                    background: 'none', border: 'none', display: 'flex',
                    alignItems: 'center', gap: '0.3rem', cursor: 'pointer',
                    color: activeComments[post.id] ? '#06b6d4' : '#64748b',
                  }}
                >
                  <MessageCircle size={18} strokeWidth={2.5} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>{post.comments_count}</span>
                </button>
                {post.user_name?.toLowerCase() === perfil?.toLowerCase() && (
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: '#64748b', marginLeft: 'auto', opacity: 0.6 }}
                    title="Eliminar publicación"
                  >
                    <Trash2 size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Comments Section */}
              {activeComments[post.id] && (
                <div className="animate-in" style={{ background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.9rem 1rem' }}>
                  {commentsData[post.id]?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.7rem' }}>
                      {commentsData[post.id].map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: '0.45rem', alignItems: 'flex-start' }}>
                          <Avatar src={c.user_avatar} name={c.user_name} size={24} />
                          <div style={{
                            flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.6rem',
                            borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 900, fontSize: '0.6rem', color: '#06b6d4', marginBottom: '0.05rem' }}>{c.user_name}</div>
                              {c.user_name?.toLowerCase() === perfil?.toLowerCase() && (
                                <button
                                  onClick={() => handleDeleteComment(post.id, c.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', opacity: 0.5 }}
                                  title="Eliminar comentario"
                                >
                                  <Trash2 size={10} color="#64748b" />
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#e2e8f0', lineHeight: '1.35' }}>{c.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <Avatar src={currentUserAvatar} name={perfil} size={26} />
                    <input
                      placeholder="Comentar..."
                      value={newComment[post.id] || ""}
                      onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                      style={{
                        flex: 1, height: '2rem', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0 0.6rem',
                        color: '#fff', outline: 'none', fontFamily: 'inherit',
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post.id)}
                    />
                    <button
                      onClick={() => handleSendComment(post.id)}
                      style={{
                        width: '2rem', height: '2rem', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <Send size={12} color="#000" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* ═══ INFINITE SCROLL SENTINEL ═══ */}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
              <Loader size={18} color="#06b6d4" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.7rem', fontWeight: 700, padding: '0.5rem 0' }}>
              {tx.noMorePosts}
            </p>
          )}

        </div>
      )}

      {/* ═══ MEDIA VIEWER OVERLAY ═══ */}
      {mediaViewerUrl && (
        <div
          onClick={() => setMediaViewerUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 30000,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {mediaViewerUrl.startsWith('data:video') ? (
            <video src={mediaViewerUrl} controls autoPlay style={{ maxWidth: '95vw', maxHeight: '85vh', borderRadius: 12 }} onClick={e => e.stopPropagation()} />
          ) : (
            <img src={mediaViewerUrl} style={{ maxWidth: '95vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }} alt="" />
          )}
          <button style={{
            position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 99,
            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={18} color="#fff" /></button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {viewingProfile && (
        <PublicProfileModal
          nombre={viewingProfile}
          currentUser={perfil}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  );
}
