import React from "react";

// Aliases incluyen los group_name exactos de exercise_categories.name_es de la DB
const MUSCLE_ALIASES = {
  pectorals: ["pecho", "pectorals", "chest", "pectoral"],
  abs: ["abdominales", "abs", "abdominals", "waist", "cintura", "core"],
  quads: ["cuadriceps", "cuádriceps", "quads", "quadriceps"],
  biceps: ["biceps", "bíceps", "upper arms"],
  triceps: ["triceps", "tríceps"],
  shoulders: ["hombros", "shoulders", "delts", "deltoids"],
  lats: ["espalda", "lats", "back", "upper back", "latissimus"],
  traps: ["traps", "trapezius", "trapecios"],
  // Isquios/Gluteos es el valor exacto de la DB nueva
  glutes: [
    "isquios/gluteos",
    "glutes",
    "glúteos",
    "isquios",
    "gluteos",
    "buttocks",
  ],
  hamstrings: ["isquios/gluteos", "hamstrings", "isquiotibiales"],
  calves: ["pantorrillas", "calves", "gastrocnemius", "soleo"],
  forearms: ["antebrazos", "forearms"],
  spine: ["spine", "lower back", "lumbar", "espalda baja"],
};

const MuscleMap = ({ targets = [], intensity = [] }) => {
  const activeTargets = targets
    .map((t) => (t || "").toLowerCase().trim())
    .filter(Boolean);

  const maxSeries = intensity.length > 0 ? Math.max(...intensity.map(i => i.series || 0), 1) : 1;

  const getIntensity = (muscleId) => {
    if (intensity.length === 0) return 0;
    const aliases = MUSCLE_ALIASES[muscleId] || [];
    let total = 0;
    for (const item of intensity) {
      const t = (item.target || "").toLowerCase().trim();
      if (aliases.some(a => t.includes(a))) total += (item.series || 0);
    }
    return total / maxSeries;
  };

  const isActive = (muscleId) => {
    if (intensity.length > 0) return getIntensity(muscleId) > 0;
    const aliases = MUSCLE_ALIASES[muscleId] || [];
    return aliases.some((alias) =>
      activeTargets.some((at) => at.includes(alias)),
    );
  };

  const fill = (muscleId, baseOpacity = "0.08") => {
    if (!isActive(muscleId)) return `rgba(255,255,255,${baseOpacity})`;
    if (intensity.length > 0) {
      const lvl = getIntensity(muscleId);
      if (lvl > 0.7) return "url(#muscleHot)";
      if (lvl > 0.3) return "url(#muscleActive)";
      return "url(#muscleLow)";
    }
    return "url(#muscleActive)";
  };

  const stroke = (muscleId) =>
    isActive(muscleId) ? "#06b6d4" : "rgba(255,255,255,0.1)";

  const sw = (muscleId) => (isActive(muscleId) ? "0.8" : "0.5");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {/* FRENTE */}
      <svg
        viewBox="0 0 80 160"
        style={{
          flex: 1,
          maxWidth: "90px",
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
        }}
      >
        <defs>
          <linearGradient id="muscleLow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#06b6d4", stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 0.2 }} />
          </linearGradient>
          <linearGradient id="muscleActive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: "#06b6d4", stopOpacity: 0.9 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "#3b82f6", stopOpacity: 0.7 }}
            />
          </linearGradient>
          <linearGradient id="muscleHot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#f59e0b", stopOpacity: 0.95 }} />
            <stop offset="100%" style={{ stopColor: "#ef4444", stopOpacity: 0.8 }} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- SILUETA BASE --- */}
        {/* Cabeza */}
        <ellipse
          cx="40"
          cy="10"
          rx="8"
          ry="9"
          fill="rgba(255,255,255,0.07)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.5"
        />
        {/* Cuello */}
        <rect
          x="36"
          y="18"
          width="8"
          height="6"
          rx="2"
          fill="rgba(255,255,255,0.06)"
        />
        {/* Torso */}
        <path
          d="M24 24 L56 24 L58 70 L22 70 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        {/* Brazo izquierdo */}
        <path
          d="M22 24 L14 28 L10 58 L16 60 L20 32 L24 28 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        {/* Brazo derecho */}
        <path
          d="M58 24 L66 28 L70 58 L64 60 L60 32 L56 28 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        {/* Antebrazo izquierdo */}
        <path
          d="M10 58 L8 85 L14 86 L16 60 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
        {/* Antebrazo derecho */}
        <path
          d="M70 58 L72 85 L66 86 L64 60 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
        {/* Cadera */}
        <path
          d="M22 70 L58 70 L60 82 L20 82 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        {/* Pierna izquierda */}
        <path
          d="M20 82 L30 82 L32 130 L18 130 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        {/* Pierna derecha */}
        <path
          d="M50 82 L60 82 L62 130 L48 130 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        {/* Pantorrilla izquierda */}
        <path
          d="M18 130 L32 130 L30 152 L20 152 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
        {/* Pantorrilla derecha */}
        <path
          d="M48 130 L62 130 L60 152 L50 152 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />

        {/* --- MÚSCULOS ACTIVOS FRENTE --- */}
        {/* Hombros */}
        <ellipse
          cx="20"
          cy="26"
          rx="5"
          ry="4"
          fill={fill("shoulders")}
          stroke={stroke("shoulders")}
          strokeWidth={sw("shoulders")}
          filter={isActive("shoulders") ? "url(#glow)" : ""}
        />
        <ellipse
          cx="60"
          cy="26"
          rx="5"
          ry="4"
          fill={fill("shoulders")}
          stroke={stroke("shoulders")}
          strokeWidth={sw("shoulders")}
          filter={isActive("shoulders") ? "url(#glow)" : ""}
        />
        {/* Pecho */}
        <path
          d="M26 26 Q40 34 54 26 L56 46 Q40 52 24 46 Z"
          fill={fill("pectorals")}
          stroke={stroke("pectorals")}
          strokeWidth={sw("pectorals")}
          filter={isActive("pectorals") ? "url(#glow)" : ""}
        />
        {/* Abdominales */}
        <rect
          x="31"
          y="50"
          width="7"
          height="6"
          rx="2"
          fill={fill("abs")}
          stroke={stroke("abs")}
          strokeWidth={sw("abs")}
        />
        <rect
          x="42"
          y="50"
          width="7"
          height="6"
          rx="2"
          fill={fill("abs")}
          stroke={stroke("abs")}
          strokeWidth={sw("abs")}
        />
        <rect
          x="31"
          y="58"
          width="7"
          height="6"
          rx="2"
          fill={fill("abs")}
          stroke={stroke("abs")}
          strokeWidth={sw("abs")}
        />
        <rect
          x="42"
          y="58"
          width="7"
          height="6"
          rx="2"
          fill={fill("abs")}
          stroke={stroke("abs")}
          strokeWidth={sw("abs")}
        />
        {/* Bíceps */}
        <ellipse
          cx="14"
          cy="42"
          rx="4"
          ry="8"
          fill={fill("biceps")}
          stroke={stroke("biceps")}
          strokeWidth={sw("biceps")}
          filter={isActive("biceps") ? "url(#glow)" : ""}
        />
        <ellipse
          cx="66"
          cy="42"
          rx="4"
          ry="8"
          fill={fill("biceps")}
          stroke={stroke("biceps")}
          strokeWidth={sw("biceps")}
          filter={isActive("biceps") ? "url(#glow)" : ""}
        />
        {/* Antebrazos */}
        <ellipse
          cx="11"
          cy="71"
          rx="3"
          ry="7"
          fill={fill("forearms")}
          stroke={stroke("forearms")}
          strokeWidth={sw("forearms")}
        />
        <ellipse
          cx="69"
          cy="71"
          rx="3"
          ry="7"
          fill={fill("forearms")}
          stroke={stroke("forearms")}
          strokeWidth={sw("forearms")}
        />
        {/* Cuádriceps */}
        <ellipse
          cx="25"
          cy="106"
          rx="6"
          ry="16"
          fill={fill("quads")}
          stroke={stroke("quads")}
          strokeWidth={sw("quads")}
          filter={isActive("quads") ? "url(#glow)" : ""}
        />
        <ellipse
          cx="55"
          cy="106"
          rx="6"
          ry="16"
          fill={fill("quads")}
          stroke={stroke("quads")}
          strokeWidth={sw("quads")}
          filter={isActive("quads") ? "url(#glow)" : ""}
        />
        {/* Pantorrillas frente */}
        <ellipse
          cx="25"
          cy="141"
          rx="5"
          ry="9"
          fill={fill("calves")}
          stroke={stroke("calves")}
          strokeWidth={sw("calves")}
        />
        <ellipse
          cx="55"
          cy="141"
          rx="5"
          ry="9"
          fill={fill("calves")}
          stroke={stroke("calves")}
          strokeWidth={sw("calves")}
        />

        {/* Etiqueta */}
        <text
          x="40"
          y="159"
          fill="rgba(100,116,139,0.8)"
          fontSize="6"
          textAnchor="middle"
          fontWeight="800"
          fontFamily="Outfit,sans-serif"
        >
          FRONT
        </text>
      </svg>

      {/* ESPALDA */}
      <svg
        viewBox="0 0 80 160"
        style={{
          flex: 1,
          maxWidth: "90px",
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
        }}
      >
        {/* --- SILUETA BASE --- */}
        <ellipse
          cx="40"
          cy="10"
          rx="8"
          ry="9"
          fill="rgba(255,255,255,0.07)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.5"
        />
        <rect
          x="36"
          y="18"
          width="8"
          height="6"
          rx="2"
          fill="rgba(255,255,255,0.06)"
        />
        <path
          d="M24 24 L56 24 L58 70 L22 70 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        <path
          d="M22 24 L14 28 L10 58 L16 60 L20 32 L24 28 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        <path
          d="M58 24 L66 28 L70 58 L64 60 L60 32 L56 28 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        <path
          d="M10 58 L8 85 L14 86 L16 60 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
        <path
          d="M70 58 L72 85 L66 86 L64 60 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
        <path
          d="M22 70 L58 70 L60 82 L20 82 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        <path
          d="M20 82 L30 82 L32 130 L18 130 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        <path
          d="M50 82 L60 82 L62 130 L48 130 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        <path
          d="M18 130 L32 130 L30 152 L20 152 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
        <path
          d="M48 130 L62 130 L60 152 L50 152 Z"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />

        {/* --- MÚSCULOS ACTIVOS ESPALDA --- */}
        {/* Trapecios */}
        <path
          d="M30 22 Q40 30 50 22 L54 34 Q40 38 26 34 Z"
          fill={fill("traps")}
          stroke={stroke("traps")}
          strokeWidth={sw("traps")}
          filter={isActive("traps") ? "url(#glow)" : ""}
        />
        {/* Hombros traseros */}
        <ellipse
          cx="20"
          cy="28"
          rx="5"
          ry="5"
          fill={fill("shoulders")}
          stroke={stroke("shoulders")}
          strokeWidth={sw("shoulders")}
          filter={isActive("shoulders") ? "url(#glow)" : ""}
        />
        <ellipse
          cx="60"
          cy="28"
          rx="5"
          ry="5"
          fill={fill("shoulders")}
          stroke={stroke("shoulders")}
          strokeWidth={sw("shoulders")}
          filter={isActive("shoulders") ? "url(#glow)" : ""}
        />
        {/* Lats */}
        <path
          d="M24 34 L22 60 L34 62 L38 38 Z"
          fill={fill("lats")}
          stroke={stroke("lats")}
          strokeWidth={sw("lats")}
          filter={isActive("lats") ? "url(#glow)" : ""}
        />
        <path
          d="M56 34 L58 60 L46 62 L42 38 Z"
          fill={fill("lats")}
          stroke={stroke("lats")}
          strokeWidth={sw("lats")}
          filter={isActive("lats") ? "url(#glow)" : ""}
        />
        {/* Lumbar */}
        <ellipse
          cx="40"
          cy="65"
          rx="7"
          ry="5"
          fill={fill("spine")}
          stroke={stroke("spine")}
          strokeWidth={sw("spine")}
        />
        {/* Tríceps */}
        <ellipse
          cx="13"
          cy="43"
          rx="4"
          ry="9"
          fill={fill("triceps")}
          stroke={stroke("triceps")}
          strokeWidth={sw("triceps")}
          filter={isActive("triceps") ? "url(#glow)" : ""}
        />
        <ellipse
          cx="67"
          cy="43"
          rx="4"
          ry="9"
          fill={fill("triceps")}
          stroke={stroke("triceps")}
          strokeWidth={sw("triceps")}
          filter={isActive("triceps") ? "url(#glow)" : ""}
        />
        {/* Antebrazos traseros */}
        <ellipse
          cx="11"
          cy="71"
          rx="3"
          ry="7"
          fill={fill("forearms")}
          stroke={stroke("forearms")}
          strokeWidth={sw("forearms")}
        />
        <ellipse
          cx="69"
          cy="71"
          rx="3"
          ry="7"
          fill={fill("forearms")}
          stroke={stroke("forearms")}
          strokeWidth={sw("forearms")}
        />
        {/* Glúteos */}
        <ellipse
          cx="30"
          cy="78"
          rx="9"
          ry="7"
          fill={fill("glutes")}
          stroke={stroke("glutes")}
          strokeWidth={sw("glutes")}
          filter={isActive("glutes") ? "url(#glow)" : ""}
        />
        <ellipse
          cx="50"
          cy="78"
          rx="9"
          ry="7"
          fill={fill("glutes")}
          stroke={stroke("glutes")}
          strokeWidth={sw("glutes")}
          filter={isActive("glutes") ? "url(#glow)" : ""}
        />
        {/* Isquiotibiales */}
        <ellipse
          cx="25"
          cy="108"
          rx="6"
          ry="16"
          fill={fill("hamstrings")}
          stroke={stroke("hamstrings")}
          strokeWidth={sw("hamstrings")}
          filter={isActive("hamstrings") ? "url(#glow)" : ""}
        />
        <ellipse
          cx="55"
          cy="108"
          rx="6"
          ry="16"
          fill={fill("hamstrings")}
          stroke={stroke("hamstrings")}
          strokeWidth={sw("hamstrings")}
          filter={isActive("hamstrings") ? "url(#glow)" : ""}
        />
        {/* Pantorrillas traseras */}
        <ellipse
          cx="25"
          cy="141"
          rx="5"
          ry="9"
          fill={fill("calves")}
          stroke={stroke("calves")}
          strokeWidth={sw("calves")}
          filter={isActive("calves") ? "url(#glow)" : ""}
        />
        <ellipse
          cx="55"
          cy="141"
          rx="5"
          ry="9"
          fill={fill("calves")}
          stroke={stroke("calves")}
          strokeWidth={sw("calves")}
          filter={isActive("calves") ? "url(#glow)" : ""}
        />

        {/* Etiqueta */}
        <text
          x="40"
          y="159"
          fill="rgba(100,116,139,0.8)"
          fontSize="6"
          textAnchor="middle"
          fontWeight="800"
          fontFamily="Outfit,sans-serif"
        >
          BACK
        </text>
      </svg>
    </div>
  );
};

export default MuscleMap;
