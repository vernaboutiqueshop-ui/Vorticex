import React from 'react';

const MuscleMap = ({ targets = [] }) => {
  // Normalizamos los targets para que coincidan con los IDs del SVG
  const activeTargets = targets.map(t => t?.toLowerCase() || "");

  const getIntensity = (muscleId) => {
    // Si el músculo está en la lista de targets, devolvemos un color de "calor"
    const muscles = {
      'pectorals': ['chest', 'pectoral', 'pecho'],
      'abs': ['abs', 'abdominals', 'waist', 'cintura', 'core'],
      'quads': ['quads', 'quadriceps', 'thighs', 'piernas'],
      'biceps': ['biceps', 'upper arms', 'brazos'],
      'triceps': ['triceps'],
      'shoulders': ['shoulders', 'delts', 'hombros'],
      'lats': ['lats', 'back', 'espalda', 'upper back'],
      'glutes': ['glutes', 'glúteos'],
      'hamstrings': ['hamstrings', 'isquios'],
      'calves': ['calves', 'pantorrillas']
    };

    const isActive = Object.keys(muscles).find(key => 
      key === muscleId && muscles[key].some(tag => activeTargets.some(at => at.includes(tag)))
    );

    return isActive ? 'url(#glowGradient)' : 'rgba(255,255,255,0.05)';
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <svg viewBox="0 0 200 220" style={{ height: '100%', filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.3))' }}>
        <defs>
          <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#06b6d4" />
          </filter>
        </defs>

        {/* CUERPO FRONTAL (ESTILIZADO) */}
        <g id="front" transform="translate(10, 10)">
           {/* Cabeza */}
           <circle cx="40" cy="15" r="8" fill="rgba(255,255,255,0.1)" />
           {/* Torso Base */}
           <path d="M30 25 L50 25 L55 60 L25 60 Z" fill="rgba(255,255,255,0.05)" />
           {/* Pecho */}
           <path d="M32 28 Q40 32 48 28 L52 45 Q40 50 28 45 Z" fill={getIntensity('pectorals')} stroke={getIntensity('pectorals') !== 'rgba(255,255,255,0.05)' ? '#06b6d4' : 'none'} strokeWidth="0.5" />
           {/* Abdominales */}
           <path d="M30 48 Q40 52 50 48 L52 65 Q40 70 28 65 Z" fill={getIntensity('abs')} />
           {/* Brazos */}
           <path d="M25 28 L15 60" stroke="rgba(255,255,255,0.1)" strokeWidth="6" strokeLinecap="round" />
           <path d="M55 28 L65 60" stroke="rgba(255,255,255,0.1)" strokeWidth="6" strokeLinecap="round" />
           {/* Bíceps (Indicador) */}
           <circle cx="20" cy="40" r="4" fill={getIntensity('biceps')} />
           <circle cx="60" cy="40" r="4" fill={getIntensity('biceps')} />
           {/* Piernas */}
           <path d="M30 65 L25 120" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" />
           <path d="M50 65 L55 120" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" />
           {/* Cuádriceps (Indicador) */}
           <path d="M26 75 L24 100" stroke={getIntensity('quads')} strokeWidth="4" strokeLinecap="round" />
           <path d="M54 75 L56 100" stroke={getIntensity('quads')} strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* CUERPO TRASERO (ESTILIZADO) */}
        <g id="back" transform="translate(110, 10)">
           <circle cx="40" cy="15" r="8" fill="rgba(255,255,255,0.1)" />
           <path d="M30 25 L50 25 L55 60 L25 60 Z" fill="rgba(255,255,255,0.05)" />
           {/* Espalda / Lats */}
           <path d="M30 28 Q40 35 50 28 L53 55 Q40 60 27 55 Z" fill={getIntensity('lats')} stroke={getIntensity('lats') !== 'rgba(255,255,255,0.05)' ? '#06b6d4' : 'none'} strokeWidth="0.5" />
           {/* Glúteos */}
           <ellipse cx="33" cy="70" rx="6" ry="8" fill={getIntensity('glutes')} />
           <ellipse cx="47" cy="70" rx="6" ry="8" fill={getIntensity('glutes')} />
           {/* Hombros Traseros */}
           <circle cx="28" cy="28" r="3" fill={getIntensity('shoulders')} />
           <circle cx="52" cy="28" r="3" fill={getIntensity('shoulders')} />
           {/* Isquios */}
           <path d="M30 85 L28 110" stroke={getIntensity('hamstrings')} strokeWidth="4" strokeLinecap="round" />
           <path d="M50 85 L52 110" stroke={getIntensity('hamstrings')} strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Etiquetas Frontal/Trasero */}
        <text x="40" y="145" fill="#64748b" fontSize="8" textAnchor="middle" fontWeight="800">FRONT</text>
        <text x="140" y="145" fill="#64748b" fontSize="8" textAnchor="middle" fontWeight="800">BACK</text>
      </svg>
    </div>
  );
};

export default MuscleMap;
