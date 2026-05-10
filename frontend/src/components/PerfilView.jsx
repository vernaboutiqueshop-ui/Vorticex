import { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, Scale, Ruler, Calendar, Camera, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { GiFlame, GiTrophy, GiMuscleUp, GiHeartBeats } from 'react-icons/gi';
import { MdGroups, MdFeedback, MdOutlineFitnessCenter } from 'react-icons/md';
import { IoCalendarOutline, IoScaleOutline, IoBodyOutline } from 'react-icons/io5';
import { HiOutlineClock } from 'react-icons/hi';
import { FiZap } from 'react-icons/fi';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch, track } from '../config';
import BodyMap, { MUSCLE_SLUG_MAP, SLUG_LABELS } from './BodyMap';
import { useLanguage } from '../LanguageContext';

const sanitizeAvatar = (src) => {
  if (!src) return null;
  if (src === 'string' || src === 'null' || src === 'undefined') return null;
  if (src.startsWith('data:image') || src.startsWith('http') || src.startsWith('/')) return src;
  return null;
};

export default function PerfilView({ perfil, onLogout }) {
  const { t, lang, setLang } = useLanguage();
  const [userData, setUserData] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    level: 1,
    exp: 0,
    profile_pic: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRoutines, setActiveRoutines] = useState([]);
  const [realIntensity, setRealIntensity] = useState([]);
  const [gymStats, setGymStats] = useState({ current_streak: 0, best_streak: 0, total_workouts: 0 });
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [bodyGender, setBodyGender] = useState(() => localStorage.getItem('vortice_body_gender') || 'male');
  const [musclePeriod, setMusclePeriod] = useState('week');
  const [muscleData, setMuscleData] = useState({ muscles: [], max_fatigue: 1 });
  const [muscleLoading, setMuscleLoading] = useState(false);
  const [expandedMuscle, setExpandedMuscle] = useState(null);
  const fileInputRef = useRef(null);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/perfil/${perfil}`);
      const data = await res.json();
      if (data.perfil) {
        setUserData({
          name: perfil,
          age: data.perfil.age || '',
          weight: data.perfil.weight || '',
          height: data.perfil.height || '',
          level: data.perfil.level || 1,
          exp: data.perfil.exp || 0,
          profile_pic: data.perfil.profile_pic || ''
        });
      }
      const resR = await authFetch(`${API}/api/gym/rutinas?perfil=${perfil}`);
      const dataR = await resR.json();
      if (dataR.status === 'success') setActiveRoutines(dataR.rutinas);
      
      const resI = await authFetch(`${API}/api/gym/intensidad?perfil=${perfil}`);
      const dataI = await resI.json();
      if (dataI.status === 'success') setRealIntensity(dataI.intensidad);

      const resS = await authFetch(`${API}/api/gym/stats/${perfil}`);
      const dataS = await resS.json();
      if (dataS.status === 'success') setGymStats(dataS);

      const resF = await authFetch(`${API}/api/comunidad/follow-counts/${perfil}`);
      const dataF = await resF.json();
      if (dataF.status === 'success') setFollowCounts(dataF);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [perfil]);

  useEffect(() => {
    fetchUserData();
  }, [perfil, fetchUserData]);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/perfil/${perfil}/update_stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, language: lang })
      });
      alert(lang === 'es' ? '¡Perfil actualizado!' : 'Profile updated!');
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("El archivo es demasiado grande (máx 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setUserData(prev => ({ ...prev, profile_pic: base64String }));
      try {
        const res = await authFetch(`${API}/api/perfil/${perfil}/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_pic: base64String })
        });
        if (!res.ok) throw new Error("Upload failed");
      } catch (err) {
        console.error(err);
        alert("No se pudo guardar el avatar en el servidor");
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchMuscleIntensity = useCallback(async (period) => {
    setMuscleLoading(true);
    try {
      const res = await authFetch(`${API}/api/gym/muscle-intensity?perfil=${perfil}&period=${period}`);
      const data = await res.json();
      if (data.status === 'success') {
        setMuscleData({ muscles: data.muscles || [], max_fatigue: data.max_fatigue || 1 });
      }
    } catch (e) { console.error(e); }
    setMuscleLoading(false);
  }, [perfil]);

  useEffect(() => {
    fetchMuscleIntensity(musclePeriod);
  }, [musclePeriod, fetchMuscleIntensity]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--accent-gym)', fontWeight: 800 }}>{t('loading')}</div>;

  const allTargets = [
    ...activeRoutines.flatMap(r => r.ejercicios.map(e => e.target)),
    ...realIntensity.map(i => i.target)
  ];

  const xpPct = Math.min(100, (userData.exp / (userData.level * 1000)) * 100);

  return (
    <div className="view-container">

      {/* ═══ HERO CARD ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
        background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)',
        padding: 0, position: 'relative', overflow: 'hidden',
      }}>
        {/* Aurora banner */}
        <div className="aurora-banner" style={{ height: 56, width: '100%', borderRadius: 'var(--radius-card) var(--radius-card) 0 0' }} />
        <div style={{ padding: '0 1.1rem 1.1rem', marginTop: -28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
          {/* Avatar con borde destacado */}
          <div onClick={() => fileInputRef.current.click()} style={{
            width: 72, height: 72, borderRadius: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden', flexShrink: 0,
            background: sanitizeAvatar(userData.profile_pic) ? `url(${sanitizeAvatar(userData.profile_pic)}) center/cover no-repeat` : 'linear-gradient(135deg, var(--color-primary), #3b82f6)',
            border: '3px solid var(--color-primary)', boxShadow: '0 0 16px rgba(0,201,255,0.3), 0 4px 16px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, color: '#fff',
          }}>
            {!sanitizeAvatar(userData.profile_pic) && perfil.charAt(0).toUpperCase()}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', opacity: 0, transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
              <Camera size={16} color="#fff" />
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*,.gif" />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{perfil}</h2>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {/* Inline language toggle */}
                {['es', 'en'].map(l => (
                  <motion.button
                    key={l}
                    whileTap={{ scale: 0.88 }}
                    onClick={(e) => { e.stopPropagation(); setLang(l); }}
                    style={{
                      width: 28, height: 28, borderRadius: '8px', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: lang === l ? 'rgba(6,182,212,0.15)' : 'transparent',
                      outline: lang === l ? '1px solid rgba(6,182,212,0.3)' : '1px solid transparent',
                      fontSize: '0.85rem', transition: 'all 0.2s', position: 'relative', zIndex: 2,
                    }}
                  >{l === 'es' ? '🇪🇸' : '🇺🇸'}</motion.button>
                ))}
                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 0.1rem' }} />
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(lang === 'es' ? '¿Cerrar sesión?' : 'Log out?')) {
                      onLogout();
                    }
                  }}
                  style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: '8px', cursor: 'pointer', padding: '0.3rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <LogOut size={14} color="#ef4444" />
                </motion.button>
              </div>
            </div>
            {/* Level + EXP pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', color: '#000', padding: '0.15rem 0.6rem', borderRadius: 'var(--radius-pill)', fontSize: '0.6rem', fontWeight: 900 }}>NV {userData.level}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem', fontWeight: 700 }}>{userData.exp} EXP</span>
            </div>
            {/* XP Bar */}
            <div style={{ marginTop: '0.45rem' }}>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                  style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.48rem', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: '0.15rem' }}>
                <span>{Math.round(xpPct)}%</span><span>{userData.exp} / {userData.level * 1000}</span>
              </div>
            </div>

            {/* Language toggle — más grande */}
          </div>
        </div>

        {/* 3 stat pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.75rem 0 0' }}>
          {[
            { icon: '🏋️', label: `${userData.total_entrenos || 0} entrenos` },
            { icon: '🔥', label: `${userData.racha || 0} días racha` },
            { icon: '📅', label: userData.created_at ? `Desde ${new Date(userData.created_at).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })}` : 'Miembro' },
          ].map((s, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-pill)', padding: '0.3rem 0.7rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ padding: '0 1.1rem 1.1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--color-border)', padding: '0.65rem' }}>
          {[
            { icon: GiFlame, label: lang === 'es' ? 'RACHA' : 'STREAK', value: `${gymStats.current_streak}d`, color: '#f59e0b',
              anim: { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }, timing: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } },
            { icon: GiTrophy, label: lang === 'es' ? 'RÉCORD' : 'RECORD', value: `${gymStats.best_streak}d`, color: '#06b6d4',
              anim: { y: [0, -3, 0], scale: [1, 1.08, 1] }, timing: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } },
            { icon: MdOutlineFitnessCenter, label: lang === 'es' ? 'ENTRENOS' : 'WORKOUTS', value: gymStats.total_workouts, color: '#22c55e',
              anim: { rotate: [0, -15, 15, 0] }, timing: { repeat: Infinity, duration: 2, ease: 'easeInOut' } },
            { icon: MdGroups, label: lang === 'es' ? 'SEGUIDORES' : 'FOLLOWERS', value: followCounts.followers, color: '#8b5cf6',
              anim: { scale: [1, 1.1, 1], opacity: [0.85, 1, 0.85] }, timing: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' } },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 400, damping: 25 }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 500, damping: 15 }}
                style={{
                  display: 'inline-flex', margin: '0 auto 0.3rem',
                  width: 32, height: 32, borderRadius: '50%',
                  background: `${s.color}18`, alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 12px ${s.color}30`,
                }}
              >
                <motion.div
                  animate={s.anim}
                  transition={s.timing}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <s.icon size={17} color={s.color} />
                </motion.div>
              </motion.div>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#fff', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 800, marginTop: '0.15rem', letterSpacing: '0.5px' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
        </div>{/* end padding wrapper */}
      </motion.div>

      {/* ═══ BODY HEATMAP ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
        background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '18px', padding: '1rem 1.1rem',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <GiHeartBeats size={14} color="#06b6d4" />
            </motion.div>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#06b6d4', letterSpacing: '0.5px' }}>
              {lang === 'es' ? 'MAPA MUSCULAR' : 'MUSCLE MAP'}
            </span>
          </div>
          {/* Gender toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '3px', gap: '2px', position: 'relative' }}>
            {[
              { id: 'male', title: lang === 'es' ? 'Hombre' : 'Male' },
              { id: 'female', title: lang === 'es' ? 'Mujer' : 'Female' },
            ].map(g => (
              <motion.button
                key={g.id}
                title={g.title}
                whileTap={{ scale: 0.8, rotate: g.id === 'male' ? -10 : 10 }}
                onClick={() => { setBodyGender(g.id); localStorage.setItem('vortice_body_gender', g.id); }}
                style={{
                  background: bodyGender === g.id ? 'rgba(6,182,212,0.18)' : 'transparent',
                  border: bodyGender === g.id ? '1px solid rgba(6,182,212,0.35)' : '1px solid transparent',
                  borderRadius: '9px', padding: '0.3rem 0.55rem', cursor: 'pointer',
                  color: bodyGender === g.id ? '#06b6d4' : '#475569',
                  fontSize: '0.6rem', fontWeight: 800, lineHeight: 1,
                  letterSpacing: '0.3px', transition: 'background 0.3s, border-color 0.3s, color 0.3s',
                }}
              >{g.id === 'male' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="14" r="6"/><path d="M20 4l-6 6"/><path d="M20 4h-5"/><path d="M20 4v5"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v7"/><path d="M9 18h6"/></svg>
              )}</motion.button>
            ))}
          </div>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
          {[
            { id: 'week', label: lang === 'es' ? '7D' : '7D' },
            { id: 'month', label: lang === 'es' ? '30D' : '30D' },
            { id: 'quarter', label: lang === 'es' ? '90D' : '90D' },
          ].map(p => (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMusclePeriod(p.id)}
              style={{
                flex: 1, padding: '0.4rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.5px', transition: 'all 0.2s',
                background: musclePeriod === p.id ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
                color: musclePeriod === p.id ? '#06b6d4' : '#64748b',
                outline: musclePeriod === p.id ? '1px solid rgba(6,182,212,0.3)' : '1px solid transparent',
              }}
            >{p.label}</motion.button>
          ))}
        </div>

        {/* Body SVG — smaller */}
        {(() => {
          const labels = SLUG_LABELS[lang] || SLUG_LABELS.es;
          const mapBodyData = muscleData.muscles.map(m => {
            const slug = MUSCLE_SLUG_MAP[(m.target || '').toLowerCase().trim()];
            if (!slug) return null;
            const pct = muscleData.max_fatigue > 0 ? m.fatigue_score / muscleData.max_fatigue : 0;
            return { slug, intensity: pct > 0.66 ? 3 : pct > 0.33 ? 2 : 1 };
          }).filter(Boolean);

          return (
            <>
              <BodyMap
                bodyData={mapBodyData.length > 0 ? mapBodyData : undefined}
                targets={mapBodyData.length > 0 ? [] : allTargets}
                scale={0.85}
                profileMode
                lang={lang}
                gender={bodyGender}
              />

              {/* Legend dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', margin: '0.6rem 0 0.4rem' }}>
                {[
                  { color: '#0ea5e9', label: lang === 'es' ? 'Bajo' : 'Low' },
                  { color: '#06b6d4', label: lang === 'es' ? 'Medio' : 'Med' },
                  { color: '#f59e0b', label: lang === 'es' ? 'Alto' : 'High' },
                ].map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 700 }}>{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Muscle chips — expandable */}
              {muscleLoading ? (
                <div style={{ textAlign: 'center', padding: '0.5rem', color: '#475569', fontSize: '0.7rem', fontWeight: 700 }}>
                  {lang === 'es' ? 'Cargando...' : 'Loading...'}
                </div>
              ) : muscleData.muscles.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center' }}>
                  {muscleData.muscles.map((m, idx) => {
                    const slug = MUSCLE_SLUG_MAP[(m.target || '').toLowerCase().trim()];
                    const name = (slug && labels[slug]) || m.target;
                    const pct = muscleData.max_fatigue > 0 ? m.fatigue_score / muscleData.max_fatigue : 0;
                    const dotColor = pct > 0.66 ? '#f59e0b' : pct > 0.33 ? '#06b6d4' : '#0ea5e9';
                    const isExpanded = expandedMuscle === idx;

                    return (
                      <motion.button
                        key={m.target}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.03, type: "spring", stiffness: 400, damping: 25 }}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setExpandedMuscle(isExpanded ? null : idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.3rem 0.65rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
                          background: isExpanded ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
                          outline: isExpanded ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isExpanded ? '#e2e8f0' : '#94a3b8' }}>{name}</span>
                        <ChevronDown size={10} color="#475569" style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '0.75rem', color: '#475569', fontSize: '0.7rem', fontWeight: 700 }}>
                  {lang === 'es' ? 'Sin datos en este periodo' : 'No data for this period'}
                </div>
              )}

              {/* Expanded muscle detail */}
              <AnimatePresence>
                {expandedMuscle !== null && muscleData.muscles[expandedMuscle] && (() => {
                  const m = muscleData.muscles[expandedMuscle];
                  const slug = MUSCLE_SLUG_MAP[(m.target || '').toLowerCase().trim()];
                  const name = (slug && labels[slug]) || m.target;
                  const pct = muscleData.max_fatigue > 0 ? m.fatigue_score / muscleData.max_fatigue : 0;
                  const barColor = pct > 0.66 ? '#f59e0b' : pct > 0.33 ? '#06b6d4' : '#0ea5e9';

                  return (
                    <motion.div
                      key={`detail-${expandedMuscle}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden', marginTop: '0.5rem' }}
                    >
                      <div style={{
                        background: 'rgba(0,0,0,0.2)', borderRadius: '14px', padding: '0.75rem',
                        display: 'flex', flexDirection: 'column', gap: '0.5rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.8rem', color: '#e2e8f0' }}>{name}</span>
                          <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>
                            {lang === 'es' ? 'Fatiga' : 'Fatigue'}: {Math.round(pct * 100)}%
                          </span>
                        </div>
                        {/* Fatigue bar */}
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(pct * 100)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={{ height: '100%', borderRadius: 99, background: barColor }}
                          />
                        </div>
                        {/* Stats row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                          {[
                            { label: lang === 'es' ? 'Series' : 'Sets', value: m.total_sets, icon: FiZap },
                            { label: lang === 'es' ? 'Sesiones' : 'Sessions', value: m.sessions, icon: GiTrophy },
                            { label: lang === 'es' ? 'Últ. vez' : 'Last', value: m.days_since_last === 0 ? (lang === 'es' ? 'Hoy' : 'Today') : `${m.days_since_last}d`, icon: HiOutlineClock },
                          ].map((s, si) => (
                            <div key={si} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '0.4rem' }}>
                              <s.icon size={12} color="#475569" style={{ margin: '0 auto 0.15rem' }} />
                              <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#fff', lineHeight: 1 }}>{s.value}</div>
                              <div style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 800, marginTop: '0.1rem' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </>
          );
        })()}
      </motion.div>

      {/* ═══ DATOS FÍSICOS + IDIOMA (combined) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
        background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '18px', padding: '1rem 1.1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#06b6d4', letterSpacing: '0.5px' }}>{t('physical_config').toUpperCase()}</span>
          <button onClick={handleUpdateProfile} disabled={saving} style={{
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: '10px',
            padding: '0.4rem 0.9rem', color: '#000', fontWeight: 900, fontSize: '0.65rem', cursor: 'pointer',
          }}>{saving ? '...' : t('save')}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
          {[
            { id: 'age', label: t('age'), icon: IoCalendarOutline, value: userData.age, unit: lang === 'es' ? 'años' : 'yrs' },
            { id: 'weight', label: t('weight'), icon: IoScaleOutline, value: userData.weight, unit: 'kg' },
            { id: 'height', label: t('height'), icon: IoBodyOutline, value: userData.height, unit: 'cm' },
          ].map((f, idx) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.08, type: "spring", stiffness: 400, damping: 25 }}
              tabIndex={0}
              style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
                padding: '0.75rem 0.6rem', border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center', transition: 'border-color 0.2s',
              }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4 + idx * 0.1, type: "spring", stiffness: 500, damping: 15 }}
                style={{ display: 'inline-flex', marginBottom: '0.3rem' }}
              >
                <f.icon size={14} color="#06b6d4" />
              </motion.div>
              <input
                type="number"
                value={f.value}
                onChange={e => setUserData({...userData, [f.id]: e.target.value})}
                style={{
                  background: 'transparent', border: 'none', color: '#fff', fontWeight: 900, fontSize: '1.1rem',
                  width: '100%', textAlign: 'center', outline: 'none',
                }}
                onFocus={e => e.currentTarget.parentElement.style.borderColor = 'rgba(6,182,212,0.4)'}
                onBlur={e => e.currentTarget.parentElement.style.borderColor = 'rgba(255,255,255,0.06)'}
              />
              <div style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 700, marginTop: '0.15rem' }}>{f.unit}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══ Admin Feedback Panel ═══ */}
      {perfil?.toLowerCase() === 'gonza' && <AdminFeedbackPanel />}

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}


function AdminFeedbackPanel() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [sending, setSending] = useState({});

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/admin/feedback`);
      const data = await res.json();
      if (data.status === 'success') setFeedbackList(data.feedback || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) loadFeedback(); }, [open]);

  const handleReply = async (id) => {
    const txt = replyText[id];
    if (!txt?.trim()) return;
    setSending(prev => ({ ...prev, [id]: true }));
    try {
      const res = await authFetch(`${API}/api/admin/feedback/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_id: id, reply: txt.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setReplyText(prev => ({ ...prev, [id]: '' }));
        loadFeedback();
        track('admin_reply', { feedback_id: id });
      }
    } catch (e) { console.error(e); }
    finally { setSending(prev => ({ ...prev, [id]: false })); }
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts + 'Z').getTime()) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const card = {
    background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px', overflow: 'hidden',
  };

  return (
    <motion.div style={{ ...card, margin: '0.75rem 0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '0.85rem 1rem', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer',
        }}
      >
        <MdFeedback size={18} color="#f59e0b" />
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem', flex: 1, textAlign: 'left' }}>
          FEEDBACK DE USUARIOS
        </span>
        <ChevronRight size={16} color="#64748b" style={{ transition: '0.2s', transform: open ? 'rotate(90deg)' : 'none' }} />
      </button>

      {open && (
        <div style={{ padding: '0 0.85rem 0.85rem', maxHeight: '60vh', overflowY: 'auto' }}>
          {loading && <div style={{ color: '#64748b', fontSize: '0.7rem', textAlign: 'center', padding: '1rem' }}>Cargando...</div>}
          {!loading && feedbackList.length === 0 && (
            <div style={{ color: '#475569', fontSize: '0.7rem', textAlign: 'center', padding: '1rem' }}>Sin feedback aún</div>
          )}
          {feedbackList.map(fb => (
            <div key={fb.id} style={{
              padding: '0.7rem', borderRadius: 12, marginBottom: '0.5rem',
              background: fb.admin_reply ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
              border: fb.admin_reply ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8,
                  background: fb.user_avatar ? `url(${fb.user_avatar}) center/cover` : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  flexShrink: 0,
                }} />
                <span style={{ color: '#06b6d4', fontWeight: 800, fontSize: '0.72rem' }}>{fb.user_name}</span>
                <span style={{ color: '#475569', fontSize: '0.6rem', marginLeft: 'auto' }}>{timeAgo(fb.created_at)}</span>
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '0.73rem', lineHeight: 1.5, marginBottom: '0.4rem' }}>
                {fb.message}
              </div>

              {fb.admin_reply ? (
                <div style={{
                  background: 'rgba(16,185,129,0.08)', borderRadius: 8, padding: '0.45rem 0.6rem',
                  borderLeft: '3px solid #10b981',
                }}>
                  <div style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 800, marginBottom: '0.15rem' }}>TU RESPUESTA</div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>{fb.admin_reply}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                  <input
                    value={replyText[fb.id] || ''}
                    onChange={e => setReplyText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                    placeholder="Respondé..."
                    style={{
                      flex: 1, height: '2rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)', padding: '0 0.5rem', color: '#fff',
                      fontSize: '0.7rem', outline: 'none', fontFamily: 'inherit',
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleReply(fb.id)}
                  />
                  <button
                    onClick={() => handleReply(fb.id)}
                    disabled={sending[fb.id]}
                    style={{
                      width: '2rem', height: '2rem', borderRadius: 8,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: sending[fb.id] ? 0.5 : 1,
                    }}
                  >
                    <Send size={12} color="#fff" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
