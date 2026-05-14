import { MdOutlineTimer } from 'react-icons/md';
import { FiCheck } from 'react-icons/fi';
import { motion } from 'motion/react';

const ETAPAS_AYUNO = [
  { min: 0,  max: 8,        nombre: 'Digestión',    color: 'var(--color-prot)', glow: 'rgba(16,185,129,0.5)',  badge: 'Digestión',  desc: 'Tu cuerpo está digiriendo la última comida. La insulina está alta.',        beneficio: 'Procesando nutrientes.',       tip: '¡Tomá agua con gas o té sin azúcar!' },
  { min: 8,  max: 12,       nombre: 'Glucógeno',    color: 'var(--color-kcal)', glow: 'rgba(245,158,11,0.5)',  badge: 'Glucógeno',  desc: 'El cuerpo agota las reservas de azúcar y empieza a buscar grasa.',          beneficio: 'Movilizando reservas.',        tip: 'Un café negro te puede ayudar.' },
  { min: 12, max: 18,       nombre: 'Quema Grasa',  color: '#f43f5e',           glow: 'rgba(244,63,94,0.5)',   badge: 'Quema Grasa', desc: 'Nivel bajo de insulina. Tu cuerpo está usando grasa como combustible.',      beneficio: '¡Fuego purificador!',          tip: 'Si sentís mareo, poné una pizca de sal en el agua.' },
  { min: 18, max: 24,       nombre: 'Cetosis',      color: 'var(--color-carb)', glow: 'rgba(56,189,248,0.5)', badge: 'Cetosis',    desc: 'Las cetonas suben fuerte. Tu cerebro está a 220 con grasa.',               beneficio: 'Claridad mental total.',       tip: 'Momento ideal para laburar o estudiar.' },
  { min: 24, max: 48,       nombre: 'Autofagia',    color: 'var(--color-gras)', glow: 'rgba(167,139,250,0.5)', badge: 'Renovación', desc: 'Tu cuerpo recicla células viejas. Una limpieza profunda.',                  beneficio: '¡Nivel Élite! Renovación celular.', tip: 'Paciencia. Ya pasaste lo más difícil.' },
  { min: 48, max: Infinity, nombre: 'Ayuno Profundo', color: '#ec4899',         glow: 'rgba(236,72,153,0.4)', badge: 'Diamante',   desc: 'Autofagia al máximo. El sistema inmune se resetea.',                        beneficio: 'Modo supervivencia ancestral.', tip: '⚠️ Consultá con un médico si vas por más de 48hs.' },
];

const getEtapaActual = (h) => ETAPAS_AYUNO.find(e => h >= e.min && h < e.max) || ETAPAS_AYUNO[0];
const getProximaEtapa = (h) => {
  const idx = ETAPAS_AYUNO.findIndex(e => h >= e.min && h < e.max);
  return idx >= 0 && idx < ETAPAS_AYUNO.length - 1 ? ETAPAS_AYUNO[idx + 1] : null;
};

const DIAS_LABEL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function AyunoSection({
  ayuno, horasAyunoStr, progresoAyuno, horasDecimal,
  metaHorasLocal, rachaAyuno, onToggle, onMetaChange,
}) {
  const etapa = getEtapaActual(horasDecimal);
  const proxima = getProximaEtapa(horasDecimal);
  const metaH = ayuno.meta_horas || 16;
  const etapasTimeline = ETAPAS_AYUNO.filter(e => e.min < metaH);
  const progPct = Math.min((horasDecimal / metaH) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${ayuno.en_ayuno ? 'rgba(0,201,255,0.3)' : 'var(--border-subtle)'}`,
        borderRadius: '18px', padding: '1rem 1.1rem', transition: 'border-color 0.5s',
      }}
    >
      {/* ── INACTIVO ── */}
      {!ayuno.en_ayuno && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <MdOutlineTimer size={18} color="var(--text-secondary)" />
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-primary)' }}>Ayuno Intermitente</div>
              <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>Elegí tu protocolo y comenzá</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.8rem', overflowX: 'auto' }}>
            {[12, 14, 16, 18, 20, 24].map(h => {
              const active = metaHorasLocal === h;
              const etapaChip = getEtapaActual(h - 0.1);
              return (
                <motion.button key={h} whileTap={{ scale: 0.88 }}
                  onClick={() => onMetaChange(h)}
                  style={{
                    flexShrink: 0, padding: '0.32rem 0.6rem', borderRadius: '8px', cursor: 'pointer', border: 'none',
                    background: active ? `${etapaChip.color}1a` : 'var(--surface-3)',
                    outline: active ? `1.5px solid ${etapaChip.color}60` : '1px solid var(--border-subtle)',
                    color: active ? etapaChip.color : 'var(--text-secondary)',
                    fontSize: '0.72rem', fontWeight: 900, transition: 'all 0.12s',
                  }}
                >{h}h</motion.button>
              );
            })}
          </div>

          <motion.button whileTap={{ scale: 0.97 }} onClick={onToggle}
            style={{
              width: '100%', height: '2.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: 'var(--color-primary)', color: '#000', fontWeight: 900, fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}>
            <MdOutlineTimer size={14} /> Iniciar {metaHorasLocal}h
          </motion.button>
        </div>
      )}

      {/* ── ACTIVO ── */}
      {ayuno.en_ayuno && (
        <div>
          {/* Timer row + Stop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: etapa.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-1px' }}>
                {horasAyunoStr.slice(0, 8)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 800 }}>DE {metaH}H</span>
                <div style={{ height: 3, width: 40, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${progPct}%` }} transition={{ duration: 1, ease: 'linear' }}
                    style={{ height: '100%', background: etapa.color, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: '0.5rem', color: etapa.color, fontWeight: 900 }}>{Math.round(progPct)}%</span>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.92 }} onClick={onToggle}
              style={{
                background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.35)',
                borderRadius: '10px', padding: '0.55rem 0.9rem', cursor: 'pointer',
                color: '#ef4444', fontWeight: 900, fontSize: '0.72rem',
                display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0,
              }}>
              ⏹ PARAR
            </motion.button>
          </div>

          {/* Stage timeline */}
          <div style={{ marginBottom: '0.8rem' }}>
            <div style={{ position: 'relative', height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: '0.4rem' }}>
              {etapasTimeline.map((stage, i) => {
                const end = Math.min(stage.max, metaH);
                const w = ((end - stage.min) / metaH) * 100;
                return <div key={i} style={{ width: `${w}%`, background: stage.color, opacity: 0.2 }} />;
              })}
              <motion.div
                animate={{ width: `${progPct}%` }}
                transition={{ duration: 1, ease: 'linear' }}
                style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: `linear-gradient(90deg, ${etapa.color}90, ${etapa.color})`, borderRadius: 5 }}
              />
              <motion.div
                animate={{ left: `${Math.min(progPct, 97)}%` }}
                transition={{ duration: 1, ease: 'linear' }}
                style={{ position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: '50%', background: etapa.color, border: '2px solid var(--surface-2)', boxShadow: `0 0 8px ${etapa.color}, 0 0 16px ${etapa.color}40` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.38rem', color: 'var(--text-muted)', fontWeight: 700 }}>0h</span>
              {etapasTimeline.slice(1).map((stage, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.38rem', fontWeight: 900, color: horasDecimal >= stage.min ? stage.color : 'var(--text-muted)' }}>{stage.min}h</span>
                  <span style={{ fontSize: '0.32rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', maxWidth: 30, overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage.nombre.split(' ')[0]}</span>
                </div>
              ))}
              <span style={{ fontSize: '0.38rem', color: horasDecimal >= metaH ? 'var(--color-prot)' : 'var(--text-muted)', fontWeight: 900 }}>{metaH}h ✓</span>
            </div>
          </div>

          {/* Stage badge + next */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.6rem', background: `${etapa.color}0d`, borderRadius: '10px', border: `1px solid ${etapa.color}20` }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: etapa.color, boxShadow: `0 0 4px ${etapa.color}` }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: etapa.color }}>{etapa.badge}</span>
              </div>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{etapa.tip}</span>
            </div>
            {proxima && (
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                <div style={{ fontSize: '0.48rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Próxima etapa</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: proxima.color }}>{proxima.nombre}</div>
                <div style={{ fontSize: '0.48rem', color: 'var(--text-muted)' }}>en {Math.max(0, proxima.min - horasDecimal).toFixed(1)}h</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Racha de días */}
      {rachaAyuno.length > 0 && (
        <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', padding: '0 0.1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
          {rachaAyuno.map((dia, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.04, type: 'spring', stiffness: 500, damping: 28 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: dia.completado ? 'var(--color-primary)' : 'var(--surface-3)',
                border: dia.completado ? '2px solid rgba(0,201,255,0.5)' : '1.5px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: dia.completado ? '0 0 8px rgba(0,201,255,0.35)' : 'none',
              }}>
                {dia.completado && <FiCheck size={12} color="#000" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: '0.42rem', fontWeight: dia.completado ? 900 : 700, color: dia.completado ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                {DIAS_LABEL[new Date(dia.fecha + 'T12:00:00').getDay()]}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
