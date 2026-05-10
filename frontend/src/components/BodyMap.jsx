import React from 'react';
import Body from 'react-muscle-highlighter';

// Maps our DB target names → react-muscle-highlighter slugs
export const MUSCLE_SLUG_MAP = {
  pecho: 'chest', pectorals: 'chest', chest: 'chest', pectoral: 'chest',
  biceps: 'biceps', bíceps: 'biceps', 'upper arms': 'biceps',
  triceps: 'triceps', tríceps: 'triceps',
  hombros: 'front-deltoids', shoulders: 'front-deltoids', delts: 'front-deltoids', deltoids: 'front-deltoids',
  'front-deltoids': 'front-deltoids', 'back-deltoids': 'back-deltoids',
  espalda: 'upper-back', lats: 'upper-back', back: 'upper-back', 'upper back': 'upper-back', latissimus: 'upper-back',
  trapecios: 'trapezius', traps: 'trapezius', trapezius: 'trapezius',
  abdominales: 'abs', abs: 'abs', abdominals: 'abs', waist: 'abs', cintura: 'abs', core: 'abs',
  cuadriceps: 'quadriceps', cuádriceps: 'quadriceps', quads: 'quadriceps', quadriceps: 'quadriceps',
  'isquios/gluteos': 'hamstring', hamstrings: 'hamstring', isquiotibiales: 'hamstring', isquios: 'hamstring',
  glúteos: 'gluteal', gluteos: 'gluteal', glutes: 'gluteal', buttocks: 'gluteal',
  pantorrillas: 'calves', calves: 'calves', gastrocnemius: 'calves', soleo: 'calves',
  antebrazos: 'forearm', forearms: 'forearm', forearm: 'forearm',
  spine: 'lower-back', 'lower back': 'lower-back', lumbar: 'lower-back', 'espalda baja': 'lower-back',
  obliques: 'obliques', oblicuos: 'obliques',
  aductores: 'adductor', adductor: 'adductor', adductors: 'adductor',
  abductores: 'abductors', abductors: 'abductors',
};

export const SLUG_LABELS = {
  es: {
    chest: 'Pecho', biceps: 'Bíceps', triceps: 'Tríceps',
    'front-deltoids': 'Hombros', 'back-deltoids': 'Hombros post.',
    'upper-back': 'Espalda', trapezius: 'Trapecios', 'lower-back': 'Lumbar',
    abs: 'Abdominales', obliques: 'Oblicuos',
    quadriceps: 'Cuádriceps', hamstring: 'Isquiotibiales', gluteal: 'Glúteos',
    calves: 'Pantorrillas', forearm: 'Antebrazos',
    adductor: 'Aductores', abductors: 'Abductores',
  },
  en: {
    chest: 'Chest', biceps: 'Biceps', triceps: 'Triceps',
    'front-deltoids': 'Shoulders', 'back-deltoids': 'Rear delts',
    'upper-back': 'Upper back', trapezius: 'Traps', 'lower-back': 'Lower back',
    abs: 'Abs', obliques: 'Obliques',
    quadriceps: 'Quads', hamstring: 'Hamstrings', gluteal: 'Glutes',
    calves: 'Calves', forearm: 'Forearms',
    adductor: 'Adductors', abductors: 'Abductors',
  },
};

/**
 * Convert raw target strings to slug counts map
 */
export function targetsToSlugCounts(targets = []) {
  const slugCounts = {};
  targets.forEach(t => {
    const key = (t || '').toLowerCase().trim();
    const slug = MUSCLE_SLUG_MAP[key];
    if (slug) slugCounts[slug] = (slugCounts[slug] || 0) + 1;
  });
  return slugCounts;
}

/**
 * Convert slug counts to bodyData array for react-muscle-highlighter
 */
export function slugCountsToBodyData(slugCounts) {
  const maxC = Math.max(...Object.values(slugCounts), 1);
  return Object.entries(slugCounts).map(([slug, count]) => ({
    slug,
    intensity: count / maxC > 0.66 ? 3 : count / maxC > 0.33 ? 2 : 1,
  }));
}

/**
 * Reusable BodyMap component — wraps react-muscle-highlighter with our theme.
 * 
 * Props:
 * - targets: string[] of raw muscle names from DB
 * - bodyData: array of {slug, intensity} — pass directly instead of targets
 * - scale: number (default 1.2)
 * - showBars: boolean — show muscle breakdown bars
 * - lang: 'es'|'en' (default 'es')
 * - maxBars: number (default 6)
 * - compact: boolean — for small inline previews (no bars, smaller scale)
 * - profileMode: boolean — reduced scale for profile view (no bars)
 * - gender: 'male'|'female' (default 'male')
 */
export default function BodyMap({ targets = [], bodyData: externalBodyData, scale = 1.2, showBars = false, lang = 'es', maxBars = 6, compact = false, profileMode = false, gender = 'male' }) {
  const slugCounts = targetsToSlugCounts(targets);
  const bodyData = externalBodyData || slugCountsToBodyData(slugCounts);
  const maxC = Math.max(...Object.values(slugCounts), 1);
  const labels = SLUG_LABELS[lang] || SLUG_LABELS.es;

  const hasHighlights = bodyData.length > 0;

  const bodyProps = {
    data: bodyData,
    gender,
    border: 'none',
    colors: ['#38bdf8', '#06b6d4', '#f59e0b'],
    defaultFill: '#1e293b',
    defaultStroke: 'rgba(255,255,255,0.06)',
  };

  if (compact) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', pointerEvents: 'none',
        filter: hasHighlights ? 'drop-shadow(0 0 6px rgba(6,182,212,0.35))' : 'none',
      }}>
        <div style={{ transform: 'scale(0.3)', transformOrigin: 'center center', display: 'flex', gap: '0px', flexShrink: 0 }}>
          <Body {...bodyProps} side="front" scale={0.8} />
          <Body {...bodyProps} side="back" scale={0.8} />
        </div>
      </div>
    );
  }

  if (profileMode) {
    return (
      <>
        <div className="bodymap-profile" style={{
          display: 'flex', justifyContent: 'center', gap: '0.25rem', alignItems: 'center',
          animation: 'bodyFadeIn 0.8s ease-out',
        }}>
          <Body {...bodyProps} side="front" scale={scale} />
          <Body {...bodyProps} side="back" scale={scale} />
        </div>
        <style>{`
          @keyframes bodyFadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes musclePulse {
            0%, 100% { filter: brightness(1) drop-shadow(0 0 3px rgba(6,182,212,0.1)); }
            50%      { filter: brightness(1.08) drop-shadow(0 0 6px rgba(6,182,212,0.22)); }
          }
          .bodymap-profile {
            animation: bodyFadeIn 0.4s ease-out;
          }
          @media (prefers-reduced-motion: reduce) {
            .bodymap-profile { animation: none; }
          }
          .bodymap-profile svg path[fill="#38bdf8"],
          .bodymap-profile svg path[fill="#06b6d4"],
          .bodymap-profile svg path[fill="#f59e0b"] {
            animation: musclePulse 3s ease-in-out infinite;
          }
          .bodymap-profile svg path[fill="#06b6d4"] { animation-delay: 0.4s; }
          .bodymap-profile svg path[fill="#f59e0b"] { animation-delay: 0.8s; }
        `}</style>
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center',
        filter: hasHighlights ? 'drop-shadow(0 0 10px rgba(6,182,212,0.3))' : 'none',
        transition: 'filter 0.4s ease',
      }}>
        <Body {...bodyProps} side="front" scale={scale} />
        <Body {...bodyProps} side="back" scale={scale} />
      </div>

      {showBars && Object.keys(slugCounts).length > 0 && (
        <>
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.25rem' }}>
            {[
              { color: '#0ea5e9', label: lang === 'es' ? 'Bajo' : 'Low' },
              { color: '#06b6d4', label: lang === 'es' ? 'Medio' : 'Med' },
              { color: '#f59e0b', label: lang === 'es' ? 'Alto' : 'High' },
            ].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700 }}>{l.label}</span>
              </div>
            ))}
          </div>
          {/* Bars */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.25rem' }}>
            {Object.entries(slugCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, maxBars)
              .map(([slug, count]) => (
                <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, width: '80px', textAlign: 'right' }}>
                    {labels[slug] || slug.replace(/-/g, ' ')}
                  </span>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99, transition: 'width 0.5s',
                      width: `${(count / maxC) * 100}%`,
                      background: count / maxC > 0.66 ? '#f59e0b' : count / maxC > 0.33 ? '#06b6d4' : '#0ea5e9',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 800, width: '24px' }}>{count}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
