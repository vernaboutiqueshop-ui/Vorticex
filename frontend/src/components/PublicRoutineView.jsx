import { useState, useEffect } from 'react';
import { Zap, ChevronLeft, Dumbbell, Copy, Play, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BodyMap from './BodyMap';
import { API } from '../config';

export default function PublicRoutineView({ routineId, onLoginRedirect, perfil, onClone }) {
  const [rutina, setRutina] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gifViewer, setGifViewer] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/gym/rutina/publica/${routineId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setRutina(data.rutina);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, [routineId]);

  const handleClone = async () => {
    if (!perfil) return onLoginRedirect();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/gym/rutina/nueva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ perfil, nombre: `${rutina.name} (Clonada)`, ejercicios: rutina.ejercicios, folder_id: null })
      });
      if (res.ok) { alert('Rutina guardada!'); if (onClone) onClone(); }
    } catch { alert('Error al clonar'); }
    finally { setSaving(false); }
  };

  const gender = localStorage.getItem('vortice_body_gender') || 'male';

  const card = {
    background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '20px', overflow: 'hidden',
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050508' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: '#06b6d4', animation: 'pulse 1.5s infinite' }} />
        <span style={{ color: '#06b6d4', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '2px' }}>CARGANDO...</span>
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
    </div>
  );

  if (!rutina) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050508', color: '#fff', padding: '2rem', textAlign: 'center' }}>
      <Zap size={40} color="#f43f5e" style={{ marginBottom: '1rem' }} />
      <h2 style={{ fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>Rutina no encontrada</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.85rem' }}>El enlace expiró o fue eliminado</p>
      <button onClick={() => window.location.href = '/'} style={{
        marginTop: '1.5rem', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#000',
        border: 'none', borderRadius: '14px', padding: '0.75rem 2rem', fontWeight: 900, cursor: 'pointer',
      }}>Volver al inicio</button>
    </div>
  );

  const totalSets = rutina.ejercicios.reduce((a, e) => a + (e.sets_count || 3), 0);

  return (
    <div style={{
      minHeight: '100vh', color: '#fff', paddingBottom: '10rem',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.06) 0%, #050508 50%)',
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100, padding: '0.65rem 1rem',
        background: 'rgba(5,5,8,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <button onClick={() => window.location.href = '/'} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><ChevronLeft size={18} color="var(--text-secondary)" /></button>
        <Zap size={18} color="#06b6d4" />
        <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>Vórtice</span>
        <span style={{
          fontSize: '0.5rem', fontWeight: 800, color: '#06b6d4', letterSpacing: '1px',
          background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: 6,
        }}>PÚBLICO</span>
        {perfil && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleClone} disabled={saving} style={{
            marginLeft: 'auto', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            border: 'none', borderRadius: '10px', padding: '0.4rem 0.85rem', cursor: 'pointer',
            fontWeight: 900, fontSize: '0.7rem', color: '#000',
            display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: saving ? 0.6 : 1,
          }}>
            <Copy size={12} /> {saving ? 'Guardando...' : 'Clonar'}
          </motion.button>
        )}
      </header>

      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '1.25rem' }}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ ...card, padding: '2rem 1.25rem', textAlign: 'center', marginBottom: '1rem', borderTop: '3px solid #06b6d4' }}
        >
          <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#06b6d4', letterSpacing: '2px', marginBottom: '0.75rem' }}>
            RUTINA DE {(rutina.user_name || '').toUpperCase()}
          </div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>{rutina.name}</h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginTop: '1.75rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#06b6d4' }}>{rutina.ejercicios.length}</div>
              <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>EJERCICIOS</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#06b6d4' }}>{totalSets}</div>
              <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>SERIES</div>
            </div>
          </div>
        </motion.div>

        {/* Muscle Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ ...card, padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}
        >
          <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '1rem' }}>MÚSCULOS TRABAJADOS</div>
          <BodyMap targets={rutina.ejercicios.map(e => e.target)} scale={0.9} showBars gender={gender} />
        </motion.div>

        {/* Exercises */}
        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
          EJERCICIOS ({rutina.ejercicios.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {rutina.ejercicios.map((ej, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + idx * 0.04 }}
              style={{
              ...card, display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem',
            }}>
              <div
                onClick={() => ej.gif_url && setGifViewer({ url: ej.gif_url, name: ej.nombre_es || ej.name })}
                style={{
                width: 56, height: 56, borderRadius: 14, background: '#fff', overflow: 'hidden', flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.06)', cursor: ej.gif_url ? 'pointer' : 'default',
              }}>
                <img src={ej.gif_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ej.nombre_es || ej.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <span style={{ color: '#06b6d4', fontSize: '0.6rem', fontWeight: 800 }}>{ej.target}</span>
                  <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 700 }}>{ej.sets_count || 3} series</span>
                </div>
              </div>
              <div style={{
                fontSize: '0.75rem', fontWeight: 900, color: 'var(--surface-3)',
                width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{idx + 1}</div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* GIF Viewer Overlay */}
      <AnimatePresence>
        {gifViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGifViewer(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 20000,
              background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem', cursor: 'pointer',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ position: 'relative', maxWidth: '90vw', maxHeight: '70vh' }}
            >
              <img src={gifViewer.url} alt="" style={{
                width: '100%', maxHeight: '65vh', objectFit: 'contain',
                borderRadius: '20px', background: '#fff',
              }} />
              <div style={{
                textAlign: 'center', marginTop: '0.75rem',
                fontWeight: 900, fontSize: '0.85rem', color: '#e2e8f0',
              }}>{gifViewer.name}</div>
            </motion.div>
            <button onClick={() => setGifViewer(null)} style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><X size={18} color="#fff" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA Banner */}
      {!perfil && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: 'linear-gradient(180deg, transparent, rgba(5,5,8,0.95) 20%, #050508)',
          padding: '2rem 1.25rem 1.5rem',
        }}>
          <div style={{
            maxWidth: 420, margin: '0 auto',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            borderRadius: '20px', padding: '1.25rem', color: '#000',
            boxShadow: '0 15px 40px rgba(6,182,212,0.25)',
          }}>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', marginBottom: '0.2rem' }}>Entrená esta rutina</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.8, fontWeight: 600, marginBottom: '0.85rem' }}>
              Creá tu cuenta gratis y cloná esta rutina en 10 segundos
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onLoginRedirect} style={{
              width: '100%', background: '#000', color: '#fff', border: 'none',
              borderRadius: '14px', padding: '0.85rem', fontWeight: 900, fontSize: '0.9rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}>
              <Play size={16} fill="#fff" /> Empezar ahora
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
