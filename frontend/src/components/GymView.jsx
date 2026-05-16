import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useTransition,
  useDeferredValue,
} from "react";
import {
  Plus,
  Search,
  X,
  Check,
  Trash2,
  ChevronRight,
  History,
  Zap,
  ChevronLeft,
  FolderPlus,
  Edit2,
  GripVertical,
  Flame,
  Trophy,
  Filter,
  Dumbbell,
  UserCheck,
  LayoutGrid,
  Share2,
  Copy,
  MoreVertical,
  PlayCircle,
  Clock,
  ChevronDown,
  Loader,
  Save,
  Folder,
  Star,
  Calendar,
  Timer,
  Activity,
  Heart,
  Shield,
  Footprints,
  MoveHorizontal,
  ArrowUpFromLine,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import BodyMap, { SLUG_LABELS, MUSCLE_SLUG_MAP } from "./BodyMap";
// WorkoutTracker is rendered at App level for global visibility
import { API, authFetch } from "../config";
import { useLanguage } from "../LanguageContext";
import Fuse from "fuse.js";
import SportsView, { SportIcon } from "./SportsView";
import {
  GiChestArmor, GiBackPain, GiShoulderArmor,
  GiBiceps, GiLeg, GiAbdominalArmor, GiRunningShoe,
} from "react-icons/gi";
import { MdFitnessCenter, MdDirectionsRun } from "react-icons/md";

/* ─────────────────────────── CONSTANTES ─────────────────────────── */

const SET_TYPES = [
  { id: "normal", label: "N", color: "var(--color-primary)", desc: "Normal" },
  { id: "warmup", label: "C", color: "#f59e0b", desc: "Calentamiento" },
  { id: "dropset", label: "D", color: "#ef4444", desc: "Drop Set" },
  { id: "failure", label: "F", color: "#8b5cf6", desc: "Al fallo" },
];

// Grupos musculares — valores exactos que devuelve el backend según lang
const FILTER_MAP = {
  CATEGORIES: {
    es: {
      Superior: ["Pecho", "Espalda", "Hombros", "Biceps", "Triceps", "Antebrazos"],
      Inferior: ["Cuadriceps", "Isquios/Gluteos", "Pantorrillas"],
      Core: ["Abdominales"],
      Cardio: ["Cardio"],
    },
    en: {
      Superior: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms"],
      Inferior: ["Quadriceps", "Hamstrings/Glutes", "Calves"],
      Core: ["Abs"],
      Cardio: ["Cardio"],
    },
  },
  EQUIPMENT: {
    Barra: ["barra"],
    Mancuerna: ["mancuerna"],
    Máquina: ["máquina", "cable", "kettlebell", "lastre"],
    "Peso Corporal": ["peso corporal", "banda"],
  },
};

// Músculos según idioma — el label mostrado ES el valor de body_part que devuelve el backend
const getMuscleMap = (lang) => lang === "en"
  ? { All:"All", Chest:"Chest", Back:"Back", Shoulders:"Shoulders", Biceps:"Biceps",
      Triceps:"Triceps", Forearms:"Forearms", Quadriceps:"Quadriceps",
      "Hamstrings/Glutes":"Hamstrings/Glutes", Calves:"Calves", Abs:"Abs", Cardio:"Cardio" }
  : { Todos:"Todos", Pecho:"Pecho", Espalda:"Espalda", "Hómbros":"Hombros",
      "Bíceps":"Biceps", "Tríceps":"Triceps", Antebrazos:"Antebrazos",
      "Cuádriceps":"Cuadriceps", "Isquios/Glúteos":"Isquios/Gluteos",
      Pantorrillas:"Pantorrillas", Abdominales:"Abdominales", Cardio:"Cardio" };

const ELITE_STYLES = {
  glassCard: {
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "24px",
    padding: "1.5rem",
    boxShadow: "0 20px 50px -15px rgba(0,0,0,0.8)",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, var(--color-primary), #0891b2)",
    color: "#000000",
    border: "none",
    borderRadius: "16px",
    padding: "1rem 1.5rem",
    fontWeight: 900,
    fontSize: "0.9rem",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: "0 0 20px rgba(6, 182, 212, 0.3)",
    transition: "all 0.3s ease",
  },
  secondaryBtnElite: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(6, 182, 212, 0.3)",
    borderRadius: "14px",
    padding: "0.85rem",
    color: "var(--color-primary)",
    fontWeight: 800,
    fontSize: "0.85rem",
    cursor: "pointer",
    width: "100%",
    marginTop: "0.75rem",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
  },
  setRowGrid: {
    display: "grid",
    gridTemplateColumns: "45px 1fr 1fr 45px",
    gap: "0.5rem",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
};

/* ─────────────────────────── COMPONENTE: DETALLE RUTINA ─────────────────────────── */

const RoutineDetailView = ({
  routine,
  onBack,
  onEdit,
  onShare,
  onStartWorkout,
}) => {
  const { t, lang } = useLanguage();
  const [gifViewer, setGifViewer] = useState(null);
  if (!routine) return null;
  const ejs = Array.isArray(routine.ejercicios) ? routine.ejercicios : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        paddingBottom: "2rem",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button onClick={onBack} className="btn-icon-elite">
          <ChevronLeft size={28} />
        </button>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            onClick={() => onEdit(routine)}
            className="btn-icon-elite"
            style={{ width: "38px", height: "38px" }}
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onShare(routine.id)}
            className="btn-icon-elite"
            style={{ width: "38px", height: "38px" }}
          >
            <Share2 size={18} color="var(--color-primary)" />
          </button>
        </div>
      </header>

      <h2
        style={{
          fontSize: "1.8rem",
          fontWeight: 900,
          color: "white",
          letterSpacing: "-1.5px",
          margin: "0.5rem 0",
        }}
      >
        {routine.name || "Sin nombre"}
      </h2>

      {/* Stats row */}
      <div style={{
        display: "flex", gap: "1.5rem",
        background: "var(--surface-2)", border: "1px solid var(--border-default)",
        borderRadius: "18px", padding: "0.9rem 1.1rem",
      }}>
        {[
          { label: t('exercises'), value: ejs.length, color: "var(--color-primary)" },
          { label: t('series'), value: ejs.reduce((acc, e) => acc + (e?.sets_data?.length || 0), 0), color: "#fff" },
          { label: t('duration'), value: `${Math.round(ejs.reduce((acc, e) => acc + (e?.sets_data?.length || 0), 0) * 2.5)}min`, color: "#22c55e" },
        ].map((s, i) => (
          <div key={i}>
            <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>{s.label}</span>
            <div style={{ fontWeight: 900, fontSize: "1.1rem", color: s.color, lineHeight: 1.2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Muscle Map Card */}
      {(() => {
        const allTargets = ejs.map(e => e?.target).filter(t => typeof t === "string" && t.length > 0);
        const slugCounts = {};
        allTargets.forEach(t => {
          const key = (t || '').toLowerCase().trim();
          const slug = MUSCLE_SLUG_MAP[key];
          if (slug) slugCounts[slug] = (slugCounts[slug] || 0) + 1;
        });
        const maxC = Math.max(...Object.values(slugCounts), 1);
        const bodyData = Object.entries(slugCounts).map(([slug, count]) => ({
          slug, intensity: count / maxC > 0.66 ? 3 : count / maxC > 0.33 ? 2 : 1,
        }));
        const labels = SLUG_LABELS[lang] || SLUG_LABELS.es;
        const sortedSlugs = Object.entries(slugCounts).sort((a, b) => b[1] - a[1]);

        return allTargets.length > 0 ? (
          <div style={{
            background: "var(--surface-2)", border: "1px solid var(--border-default)",
            borderRadius: "18px", padding: "1rem 1.1rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
              <Activity size={14} color="var(--color-primary)" />
              <span style={{ fontSize: "0.65rem", fontWeight: 900, color: "var(--color-primary)", letterSpacing: "0.5px" }}>
                {lang === 'es' ? 'MAPA MUSCULAR' : 'MUSCLE MAP'}
              </span>
            </div>
            <BodyMap
              bodyData={bodyData}
              scale={0.85}
              profileMode
              lang={lang}
              gender={localStorage.getItem('vortice_body_gender') || 'male'}
            />
            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", margin: "0.5rem 0 0.4rem" }}>
              {[
                { color: "#0ea5e9", label: lang === 'es' ? 'Bajo' : 'Low' },
                { color: "var(--color-primary)", label: lang === 'es' ? 'Medio' : 'Med' },
                { color: "#f59e0b", label: lang === 'es' ? 'Alto' : 'High' },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                  <span style={{ fontSize: "0.5rem", color: "var(--text-muted)", fontWeight: 700 }}>{l.label}</span>
                </div>
              ))}
            </div>
            {/* Animated muscle tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", justifyContent: "center" }}>
              {sortedSlugs.map(([slug, count], idx) => {
                const name = labels[slug] || slug.replace(/-/g, ' ');
                const pct = count / maxC;
                const dotColor = pct > 0.66 ? 'var(--color-kcal)' : pct > 0.33 ? 'var(--color-primary)' : '#0ea5e9';
                return (
                  <motion.div
                    key={slug}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.3rem",
                      padding: "0.3rem 0.65rem", borderRadius: "20px",
                      background: "var(--surface-hover)",
                      border: "1px solid var(--surface-3)",
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-primary)" }}>{name}</span>
                    <ChevronDown size={10} color="var(--text-muted)" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : null;
      })()}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {ejs.map((ej, i) => (
          <div
            key={i}
            className="glass-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              padding: "0.65rem",
              borderRadius: "16px",
            }}
          >
            <img
              src={ej?.gif_url}
              onClick={() => ej?.gif_url && setGifViewer({ url: ej.gif_url, name: ej?.nombre_es || ej?.nombre || 'Ejercicio' })}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "white",
                cursor: ej?.gif_url ? "pointer" : "default",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{ fontWeight: 800, color: "white", fontSize: "0.85rem" }}
              >
                {ej?.nombre_es || ej?.nombre || "Ejercicio"}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "var(--accent-gym)",
                  fontWeight: 900,
                }}
              >
                {ej?.sets_data?.length || 0} {t('series')}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onStartWorkout(ejs, routine.id)}
        style={{
          ...ELITE_STYLES.primaryBtn,
          height: "3.8rem",
          fontSize: "1.1rem",
          marginTop: "1rem",
          borderRadius: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
        }}
      >
        {t('start_workout')} <PlayCircle size={22} fill="currentColor" />
      </button>

      {/* GIF Viewer Overlay */}
      <AnimatePresence>
        {gifViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGifViewer(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 30000,
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
                fontWeight: 900, fontSize: '0.85rem', color: 'var(--text-primary)',
              }}>{gifViewer.name}</div>
            </motion.div>
            <button onClick={() => setGifViewer(null)} style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'var(--border-default)', border: 'none', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><X size={18} color="#fff" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─────────────────────────── COMPONENTE: SELECTOR DE EJERCICIOS ─────────────────────────── */

const ExerciseSelectorView = ({
  exercises,
  builderExercises,
  onAdd,
  onRemove,
  onDone,
  isMobile,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterMuscle,
  setFilterMuscle,
  filterEquipment,
  setFilterEquipment,
  filterPending = false,
}) => {
  const { t, lang } = useLanguage();
  const MUSCLE_LABEL_MAP = getMuscleMap(lang);
  const ALL_MUSCLES = "__all__";
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showEquipFilter, setShowEquipFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [muscleExpanded, setMuscleExpanded] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const MUSCLES_COLLAPSED_COUNT = 6;
  const PAGE_SIZE = 20;

  // useDeferredValue: el chip visual cambia instantáneamente,
  // pero la cadena pesada de useMemo usa valores diferidos.
  // React procesa el cómputo caro cuando el hilo está libre.
  const deferredMuscle = useDeferredValue(filterMuscle);
  const deferredCategory = useDeferredValue(filterCategory);
  const deferredEquipment = useDeferredValue(filterEquipment);
  const deferredSearch = useDeferredValue(searchTerm);

  // isPending es true cuando los valores diferidos no alcanzaron al actual
  const isFilterStale =
    deferredMuscle !== filterMuscle ||
    deferredCategory !== filterCategory ||
    deferredEquipment !== filterEquipment ||
    deferredSearch !== searchTerm;

  // Caché de listas filtradas — evita recomputar en filtros ya visitados
  const filterCache = useRef(new Map());
  useEffect(() => { filterCache.current.clear(); }, [searchTerm, exercises]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMuscle, filterCategory, filterEquipment]);

  // Índice Fuse.js para búsqueda fuzzy — se recalcula solo cuando cambia la lista
  const fuseIndex = useMemo(
    () =>
      new Fuse(exercises, {
        keys: ["nombre_es", "body_part", "equipment"],
        threshold: 0.35,
        includeScore: true,
        minMatchCharLength: 2,
        ignoreLocation: true,
      }),
    [exercises],
  );

  // Toda la cadena de cómputo usa valores DIFERIDOS:
  // → UI responde instantáneamente, cómputo pesado corre cuando hay tiempo libre

  // searchBase con valor diferido (Fuse.js no corre hasta que el texto se estabiliza)
  const searchBase = useMemo(() => {
    if (deferredSearch.trim().length > 0) {
      return fuseIndex.search(deferredSearch.trim()).map((r) => r.item);
    }
    return exercises;
  }, [exercises, fuseIndex, deferredSearch]);

  // Base post-búsqueda + categoría diferida
  const baseForMuscle = useMemo(() => {
    if (deferredCategory === "Todos") return searchBase;
    const catMap = FILTER_MAP.CATEGORIES[lang] || FILTER_MAP.CATEGORIES.es;
    return searchBase.filter((e) => {
      const bp = e.body_part || "General";
      return catMap[deferredCategory] && catMap[deferredCategory].includes(bp);
    });
  }, [searchBase, deferredCategory, lang]);

  // Conteo de músculos — diferido, no bloquea el render de chips
  const muscleCounts = useMemo(() => {
    const counts = { Todos: baseForMuscle.length };
    baseForMuscle.forEach((e) => {
      const bp = e.body_part;
      if (bp) counts[bp] = (counts[bp] || 0) + 1;
    });
    return counts;
  }, [baseForMuscle]);

  // Base + músculo diferido
  const baseForEquip = useMemo(() => {
    return baseForMuscle.filter((e) => {
      const bp = e.body_part || "General";
      const dbMuscle = MUSCLE_LABEL_MAP[deferredMuscle] || deferredMuscle;
      return deferredMuscle === ALL_MUSCLES || bp === dbMuscle;
    });
  }, [baseForMuscle, deferredMuscle]);

  // Conteo equipamiento — diferido
  const equipCounts = useMemo(() => {
    const counts = { Todos: baseForEquip.length };
    baseForEquip.forEach((e) => {
      if (e.equipment) counts[e.equipment] = (counts[e.equipment] || 0) + 1;
    });
    return counts;
  }, [baseForEquip]);

  // Resultado final con caché — diferido + memoizado
  const filtered = useMemo(() => {
    const cacheKey = `${deferredCategory}|${deferredMuscle}|${deferredEquipment}`;
    if (filterCache.current.has(cacheKey)) return filterCache.current.get(cacheKey);
    const result = baseForEquip.filter((e) => {
      const eq = (e.equipment || "").toLowerCase();
      return deferredEquipment === "Todos" ||
        (FILTER_MAP.EQUIPMENT[deferredEquipment] &&
          FILTER_MAP.EQUIPMENT[deferredEquipment].some((term) => eq.includes(term)));
    });
    filterCache.current.set(cacheKey, result);
    return result;
  }, [baseForEquip, deferredEquipment, deferredCategory, deferredMuscle]);

  const selectedIds = useMemo(
    () => builderExercises.map((e) => String(e?.id_ejercicio || e?.id)),
    [builderExercises],
  );

  const hasActiveFilters =
    filterMuscle !== ALL_MUSCLES ||
    filterEquipment !== "Todos" ||
    filterCategory !== "Todos";
  const showPopularSection = !hasActiveFilters && searchTerm === "";
  const popularList = showPopularSection ? filtered.slice(0, 10) : [];
  const displayList = showPopularSection
    ? filtered.slice(10, 110)
    : filtered.slice(0, 150);

  // Paginación
  const totalPages = Math.ceil(
    (showPopularSection
      ? displayList.length + popularList.length
      : filtered.length) / PAGE_SIZE,
  );
  const paginatedList = useMemo(() => {
    if (showPopularSection && currentPage === 1) {
      return {
        showPopular: true,
        items: displayList.slice(0, PAGE_SIZE - popularList.length),
      };
    }
    const offset = showPopularSection
      ? (currentPage - 1) * PAGE_SIZE - popularList.length
      : (currentPage - 1) * PAGE_SIZE;
    return {
      showPopular: false,
      items: filtered.slice(
        Math.max(0, offset),
        Math.max(0, offset) + PAGE_SIZE,
      ),
    };
  }, [
    filtered,
    displayList,
    popularList,
    currentPage,
    showPopularSection,
    PAGE_SIZE,
  ]);

  // Siempre mostrar todos los músculos (no filtrar por zona)
  const musclesToShow = Object.keys(MUSCLE_LABEL_MAP).slice(1); // sin "Todos"

  // Equipamiento disponible (solo los que tienen ejercicios con los filtros actuales)
  const EQUIP_DISPLAY = [
    { key: "Todos", label: t('all') },
    { key: "Barra", label: t('barbell') },
    { key: "Mancuerna", label: t('dumbbell') },
    { key: "Máquina", label: t('machine') },
    { key: "Peso Corporal", label: t('bodyweight') },
  ];

  const ZONE_TABS = [
    { key: "Todos", label: t('all') },
    { key: "Superior", label: t('upper') },
    { key: "Inferior", label: t('lower') },
    { key: "Core", label: "Core" },
    { key: "Cardio", label: "Cardio" },
  ];

  // Traducción de equipamiento que viene de la DB en español
  const equipLabel = (eq) => {
    if (!eq) return '';
    const map = lang === 'en' ? {
      'Peso Corporal': 'Bodyweight', 'Barra': 'Barbell',
      'Mancuerna': 'Dumbbell', 'Máquina': 'Machine',
      'Cable': 'Cable', 'Kettlebell': 'Kettlebell', 'Banda': 'Band',
    } : {};
    return map[eq] || eq;
  };

  const MUSCLE_ICON = {
    // ES
    Bíceps: GiBiceps, Tríceps: GiBiceps, Antebrazos: MdFitnessCenter,
    Pecho: GiChestArmor, Espalda: GiBackPain, Hómbros: GiShoulderArmor,
    Cuádriceps: GiLeg, "Isquios/Glúteos": GiLeg, Pantorrillas: GiRunningShoe,
    Abdominales: GiAbdominalArmor, Cardio: MdDirectionsRun,
    // EN
    Biceps: GiBiceps, Triceps: GiBiceps, Forearms: MdFitnessCenter,
    Chest: GiChestArmor, Back: GiBackPain, Shoulders: GiShoulderArmor,
    Quadriceps: GiLeg, "Hamstrings/Glutes": GiLeg, Calves: GiRunningShoe,
    Abs: GiAbdominalArmor,
  };

  const renderItem = (ej, idx) => {
    const eid = String(ej?.id_ejercicio || ej?.id);
    const isAdded = selectedIds.includes(eid);
    return (
      <motion.div
        key={eid}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "14px",
          border: "1px solid var(--surface-2)",
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          background: isAdded
            ? "rgba(0,201,255,0.08)"
            : "var(--surface-1)",
          transition: "background 0.2s",
        }}
      >
        {/* Botón + a la izquierda, igual que Hevy */}
        <button
          onClick={() => {
            if (isAdded) onRemove(ej);
            else onAdd(ej);
          }}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: isAdded ? "var(--color-primary)" : "rgba(0,201,255,0.18)",
            border: isAdded ? "none" : "1.5px solid var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          {isAdded ? (
            <Check size={17} color="#000" strokeWidth={4} />
          ) : (
            <Plus size={17} color="var(--color-primary)" strokeWidth={3} />
          )}
        </button>

        {/* GIF - lazy loading para no bloquear el filtro */}
        <img
          src={ej?.gif_url}
          loading="lazy"
          decoding="async"
          onClick={() => setSelectedExercise(ej)}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            background: "#fff",
            objectFit: "cover",
            opacity: isAdded ? 0.45 : 1,
            flexShrink: 0,
            cursor: "pointer",
          }}
        />

        {/* Info - clickeable para abrir detalle */}
        <div
          style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
          onClick={() => setSelectedExercise(ej)}
        >
          <div
            style={{
              fontWeight: 800,
              color: "#ffffff",
              fontSize: "0.88rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {ej?.nombre_es}
          </div>
          <div
            style={{
              fontSize: "0.62rem",
              color: "var(--text-secondary)",
              fontWeight: 700,
              marginTop: "0.15rem",
            }}
          >
            {ej?.body_part?.toUpperCase()}
            {ej?.difficulty && (
              <span
                style={{
                  marginLeft: "0.4rem",
                  textTransform: "capitalize",
                  color: "var(--text-muted)",
                }}
              >
                · {ej.difficulty}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 10000, background: "#050508" }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: isMobile ? "1rem" : "2rem",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontWeight: 900,
                color: "#ffffff",
                fontSize: "1.4rem",
                letterSpacing: "-0.5px",
              }}
            >
              Ejercicios
            </h2>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 900,
                color: "var(--color-primary)",
                background: "rgba(0,201,255,0.1)",
                padding: "0.15rem 0.5rem",
                borderRadius: "6px",
                marginTop: "0.3rem",
                display: "inline-block",
              }}
            >
              {builderExercises.length} {t('chosen')}
            </span>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                marginTop: "0.15rem",
              }}
            >
              {filtered.length} {t('of')} {exercises.length} {t('exercises').toLowerCase()}
            </div>
          </div>
          <button
            onClick={onDone}
            className="btn-icon-elite"
            style={{ width: "40px", height: "40px" }}
          >
            <X size={22} />
          </button>
        </header>

        {/* ── BUSCADOR ── */}
        <div style={{ position: "relative", marginBottom: "0.9rem" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.9rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-primary)",
              pointerEvents: "none",
            }}
          />
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            placeholder={t('search_exercises', exercises.length)}
            className="premium-input"
            style={{
              paddingLeft: "2.5rem",
              height: "2.8rem",
              fontSize: "0.88rem",
              width: "100%",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={14} color="var(--text-muted)" />
            </button>
          )}
        </div>

        {/* ══════════ FILTROS ══════════ */}
        <div
          style={{
            background: "var(--surface-1)",
            borderRadius: "16px",
            padding: "0.75rem",
            marginBottom: "0.75rem",
            border: "1px solid var(--surface-2)",
          }}
        >
          {/* Zona — una fila con 5 tabs que siempre caben */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "0.3rem",
              marginBottom: "0.65rem",
            }}
          >
            {ZONE_TABS.map((z) => {
              const isActive = filterCategory === z.key;
              return (
                <button
                  key={z.key}
                  onClick={() => {
                    setFilterCategory(z.key);
                    setFilterMuscle("__all__");
                  }}
                  style={{
                    padding: "0.45rem 0.2rem",
                    borderRadius: "10px",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    border: "none",
                    transition: "all 0.15s",
                    textAlign: "center",
                    background: isActive ? "var(--color-primary)" : "var(--surface-2)",
                    color: isActive ? "#000" : "var(--text-muted)",
                    boxShadow: isActive
                      ? "0 0 10px rgba(0,201,255,0.35)"
                      : "none",
                  }}
                >
                  {z.label}
                </button>
              );
            })}
          </div>

          {/* Músculos — dropdown compacto */}
          <div style={{ position: "relative" }}>
            {/* Trigger button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setMuscleExpanded(p => !p)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.45rem 0.6rem",
                borderRadius: "8px",
                fontSize: "0.65rem",
                fontWeight: 800,
                cursor: "pointer",
                border: "1px solid",
                transition: "all 0.15s",
                background: filterMuscle !== ALL_MUSCLES ? "rgba(0,201,255,0.1)" : "var(--surface-1)",
                borderColor: filterMuscle !== ALL_MUSCLES ? "rgba(0,201,255,0.3)" : "rgba(255,255,255,0.07)",
                color: filterMuscle !== ALL_MUSCLES ? "var(--color-primary)" : "var(--text-secondary)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                {filterMuscle !== ALL_MUSCLES ? (
                  <>
                    {(() => { const MI = MUSCLE_ICON[filterMuscle] || Dumbbell; return <MI size={12} />; })()}
                    {filterMuscle}
                  </>
                ) : (
                  <>
                    <Filter size={12} />
                    {t('muscle')}
                  </>
                )}
              </span>
              <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: muscleExpanded ? "rotate(180deg)" : "rotate(0)" }} />
            </motion.button>

            {/* Dropdown panel */}
            <AnimatePresence>
              {muscleExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{ overflow: "hidden", marginTop: "0.3rem" }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", padding: "0.1rem 0" }}>
                    {/* Todos */}
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setFilterMuscle("__all__")}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.3rem",
                        padding: "0.35rem 0.55rem", borderRadius: "8px",
                        fontSize: "0.62rem", fontWeight: 800, cursor: "pointer",
                        border: "1px solid",
                        background: filterMuscle === ALL_MUSCLES ? "rgba(0,201,255,0.18)" : "var(--surface-1)",
                        borderColor: filterMuscle === ALL_MUSCLES ? "var(--color-primary)" : "rgba(255,255,255,0.07)",
                        color: filterMuscle === ALL_MUSCLES ? "var(--color-primary)" : "var(--text-muted)",
                      }}
                    >
                      <LayoutGrid size={11} /> Todos
                    </motion.button>

                    {musclesToShow.map((label) => {
                      const dbVal = MUSCLE_LABEL_MAP[label];
                      const count = muscleCounts[dbVal] || 0;
                      const isActive = filterMuscle === label;
                      const MIcon = MUSCLE_ICON[label] || Dumbbell;
                      const chipColors = ["var(--color-primary)", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899", "#3b82f6", "#14b8a6", "#f97316", "#6366f1", "#10b981"];
                      const activeColor = chipColors[musclesToShow.indexOf(label) % chipColors.length];
                      return (
                        <motion.button
                          key={label}
                          whileTap={{ scale: 0.92 }}
                          animate={isActive ? { scale: [1, 1.06, 1] } : {}}
                          transition={{ duration: 0.25 }}
                          onClick={() => setFilterMuscle(isActive ? "__all__" : label)}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.35rem 0.55rem", borderRadius: "8px",
                            fontSize: "0.62rem", fontWeight: 800, cursor: "pointer",
                            border: "1px solid",
                            background: isActive ? `${activeColor}20` : "var(--surface-1)",
                            borderColor: isActive ? `${activeColor}80` : "rgba(255,255,255,0.07)",
                            color: isActive ? activeColor : "var(--text-secondary)",
                            transition: "background 0.2s, border-color 0.2s, color 0.2s",
                          }}
                        >
                          <motion.span
                            animate={isActive ? { rotate: [0, -15, 15, 0], scale: [1, 1.3, 1] } : { rotate: 0, scale: 1 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            style={{ display: "inline-flex", color: isActive ? activeColor : "var(--text-secondary)", opacity: isActive ? 1 : 0.5 }}
                          >
                            <MIcon size={11} />
                          </motion.span>
                          {label}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── EQUIPAMIENTO (chips compactos) ── */}
        <div style={{ marginBottom: "0.85rem" }}>
          <div
            style={{
              display: "flex",
              gap: "0.3rem",
            }}
          >
            {EQUIP_DISPLAY.map(({ key, label }) => {
              const rawCount =
                key === "Todos" ? baseForEquip.length : equipCounts[key] || 0;
              const isActive = filterEquipment === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterEquipment(key)}
                  style={{
                    flex: "1 1 0",
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.25rem",
                    padding: "0.3rem 0.35rem",
                    borderRadius: "8px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "1px solid",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                    background: isActive
                      ? "rgba(59,130,246,0.2)"
                      : "var(--surface-1)",
                    borderColor: isActive ? "#3b82f6" : "rgba(255,255,255,0.07)",
                    color: isActive ? "#93c5fd" : "var(--text-muted)",
                  }}
                >
                  {label}
                  <span style={{ fontSize: "0.6rem", opacity: 0.7, visibility: rawCount > 0 ? "visible" : "hidden", minWidth: "1ch" }}>
                    {rawCount || 0}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Indicador si hay filtro activo */}
          <AnimatePresence>
            {(hasActiveFilters || searchTerm) && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: "0.35rem" }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ display: "flex", justifyContent: "flex-end", overflow: "hidden" }}
              >
                <motion.button
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setFilterCategory("Todos");
                    setFilterMuscle("__all__");
                    setFilterEquipment("Todos");
                    setSearchTerm("");
                  }}
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: "8px",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    whiteSpace: "nowrap",
                  }}
                >
                  Limpiar ×
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Barra de progreso lineal — justo encima de la lista, solo cuando filtra */}
        <div style={{ height: 2, borderRadius: 99, overflow: "hidden", marginBottom: "0.5rem", background: "var(--surface-hover)" }}>
          {(filterPending || isFilterStale) && (
            <div style={{
              height: "100%", borderRadius: 99, width: "60%",
              background: "linear-gradient(90deg, transparent, var(--color-primary), transparent)",
              animation: "filterProgress 0.9s ease-in-out infinite",
            }} />
          )}
        </div>
        <style>{`
          @keyframes filterProgress {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(280%); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-filter-progress] { animation: none; background: var(--color-primary); width: 100%; }
          }
        `}</style>

        {/* Lista — skeletons cuando filtra, resultados cuando listo */}
        <div
          key={`${filterCategory}-${filterMuscle}-${filterEquipment}-${searchTerm}-${currentPage}`}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
          }}
          className="no-scrollbar"
        >
          {/* Skeleton rows mientras aplica el filtro */}
          {(filterPending || isFilterStale) && Array(7).fill(0).map((_, i) => (
            <div key={`sk-${i}`} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.5rem" }}>
              <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div className="skeleton" style={{ height: 14, borderRadius: 6, width: `${65 + (i % 3) * 12}%` }} />
                <div className="skeleton" style={{ height: 10, borderRadius: 6, width: `${35 + (i % 4) * 8}%` }} />
              </div>
              <div className="skeleton" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }} />
            </div>
          ))}

          {/* Contenido real — oculto durante skeleton */}
          {!(filterPending || isFilterStale) && (
          <React.Fragment>
          {showPopularSection &&
            popularList.length > 0 &&
            currentPage === 1 && (
              <>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 900,
                    color: "var(--color-primary)",
                    letterSpacing: "1.5px",
                    marginBottom: "0.3rem",
                  }}
                >
                  {t('popular_exercises')}
                </motion.div>
                {popularList.map(renderItem)}
                {paginatedList.items.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 900,
                      color: "var(--text-secondary)",
                      letterSpacing: "1.5px",
                      margin: "0.7rem 0 0.3rem",
                    }}
                  >
                    {lang === 'es' ? 'TODOS LOS EJERCICIOS' : 'ALL EXERCISES'}
                  </motion.div>
                )}
              </>
            )}

          {paginatedList.items.map(renderItem)}

          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
                🔍
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: "var(--text-muted)",
                }}
              >
                Sin resultados
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  marginTop: "0.3rem",
                }}
              >
                {searchTerm ? `"${searchTerm}" no coincide con ningún ejercicio` : "Probá con otras palabras o limpiá los filtros"}
              </div>
              {(searchTerm || filterMuscle !== ALL_MUSCLES || filterCategory !== "Todos" || filterEquipment !== "Todos") && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSearchTerm(""); setFilterMuscle("__all__"); setFilterCategory("Todos"); setFilterEquipment("Todos"); }}
                  style={{
                    marginTop: "0.75rem", padding: "0.5rem 1rem", borderRadius: "10px",
                    background: "rgba(0,201,255,0.12)", border: "1px solid rgba(0,201,255,0.25)",
                    color: "var(--color-primary)", fontWeight: 800, fontSize: "0.75rem", cursor: "pointer",
                  }}
                >
                  Limpiar filtros
                </motion.button>
              )}
            </motion.div>
          )}
          </React.Fragment>
          )}
        </div>

        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.6rem 0",
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "10px",
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                color: currentPage === 1 ? "var(--surface-3)" : "var(--text-secondary)",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              ← Ant
            </button>
            <div
              style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}
            >
              <span style={{ color: "var(--color-primary)", fontWeight: 900 }}>
                {currentPage}
              </span>
              {" / "}
              {totalPages}
              <span
                style={{
                  color: "var(--text-muted)",
                  marginLeft: "0.5rem",
                  fontSize: "0.65rem",
                }}
              >
                ({filtered.length} {t('results')})
              </span>
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "10px",
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                color: currentPage === totalPages ? "var(--surface-3)" : "var(--text-secondary)",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Sig →
            </button>
          </div>
        )}

        {/* Modal de detalle de ejercicio */}
        {selectedExercise && (() => {
          const eid = String(selectedExercise?.id_ejercicio || selectedExercise?.id);
          const isAdded = selectedIds.includes(eid);
          const instrucciones = selectedExercise?.instrucciones_es || selectedExercise?.instructions || [];
          const instrArr = Array.isArray(instrucciones) ? instrucciones : (instrucciones ? [instrucciones] : []);
          const hasInstr = instrArr.length > 0 && instrArr[0] !== "";
          const MIcon = MUSCLE_ICON[selectedExercise?.body_part] || Dumbbell;
          return (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 30000,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) { setSelectedExercise(null); setShowInstructions(false); } }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              style={{
                background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "24px 24px 0 0", padding: "1.25rem 1.25rem 1rem",
                width: "min(100vw, 520px)", maxHeight: "88vh", overflowY: "auto",
                display: "flex", flexDirection: "column", gap: "0.85rem",
              }}
              className="no-scrollbar"
            >
              {/* Handle */}
              <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "99px", margin: "0 auto -0.2rem" }} />

              {/* GIF — grande y prominente */}
              <div style={{
                display: "flex", justifyContent: "center", background: "rgba(255,255,255,0.95)",
                borderRadius: "18px", padding: "1rem", position: "relative",
              }}>
                <img
                  src={selectedExercise?.gif_url}
                  style={{ width: "100%", maxWidth: "280px", height: "210px", objectFit: "contain" }}
                  alt={selectedExercise?.nombre_es}
                />
              </div>

              {/* Nombre + badges */}
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: "#fff", fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
                  {selectedExercise?.nombre_es}
                </h3>
                <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.45rem", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(0,201,255,0.15)", color: "var(--color-primary)", fontSize: "0.6rem", fontWeight: 800, padding: "0.2rem 0.5rem", borderRadius: "99px", textTransform: "uppercase" }}>
                    <MIcon size={10} /> {selectedExercise?.body_part}
                  </span>
                  {selectedExercise?.equipment && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(59,130,246,0.1)", color: "#93c5fd", fontSize: "0.6rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "99px" }}>
                      <Dumbbell size={10} /> {equipLabel(selectedExercise?.equipment)}
                    </span>
                  )}
                  {selectedExercise?.zone && (
                    <span style={{ background: "var(--surface-2)", color: "var(--text-muted)", fontSize: "0.6rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "99px" }}>
                      {selectedExercise.zone}
                    </span>
                  )}
                  {selectedExercise?.mechanic && (
                    <span style={{ background: "var(--surface-2)", color: "var(--text-muted)", fontSize: "0.6rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "99px" }}>
                      {selectedExercise.mechanic}
                    </span>
                  )}
                </div>
              </div>

              {/* Instrucciones — accordion desplegable */}
              {hasInstr && (
                <div style={{ borderTop: "1px solid var(--surface-2)" }}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowInstructions(p => !p)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.7rem 0", background: "transparent", border: "none", cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem", fontWeight: 900, color: "var(--text-secondary)", letterSpacing: "0.3px" }}>
                      <Info size={13} color="var(--color-primary)" />
                      {t('instructions')}
                    </span>
                    <ChevronDown size={14} color="var(--text-muted)" style={{ transition: "transform 0.25s", transform: showInstructions ? "rotate(180deg)" : "rotate(0)" }} />
                  </motion.button>
                  <AnimatePresence>
                    {showInstructions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingBottom: "0.5rem" }}>
                          {instrArr.map((step, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.1, delay: i * 0.03 }}
                              style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}
                            >
                              <span style={{
                                flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%",
                                background: "rgba(0,201,255,0.1)", color: "var(--color-primary)",
                                fontSize: "0.6rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
                              }}>{i + 1}</span>
                              <span style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55, fontWeight: 500 }}>{step}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* CTA */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (isAdded) onRemove(selectedExercise);
                  else onAdd(selectedExercise);
                  setSelectedExercise(null);
                  setShowInstructions(false);
                }}
                style={{
                  background: isAdded ? "rgba(239,68,68,0.15)" : "linear-gradient(135deg, var(--color-primary), #0891b2)",
                  color: isAdded ? "#ef4444" : "#000",
                  border: isAdded ? "1px solid rgba(239,68,68,0.3)" : "none",
                  borderRadius: "16px", padding: "1rem", fontWeight: 900, fontSize: "0.95rem",
                  cursor: "pointer", width: "100%", marginBottom: "env(safe-area-inset-bottom, 8px)",
                }}
              >
                {isAdded ? t('remove_from_routine') : t('add_to_routine')}
              </motion.button>
            </motion.div>
          </div>
          );
        })()}

        {/* Botón sticky */}
        <button
          onClick={onDone}
          style={{
            ...ELITE_STYLES.primaryBtn,
            marginTop: "0.85rem",
            height: "3.5rem",
            fontSize: "1rem",
            borderRadius: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <Check size={20} strokeWidth={3} /> {lang === 'es' ? 'Listo' : 'Done'} ({builderExercises.length})
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────── MODAL CREAR CARPETA ─────────────────────────── */

const FolderModal = ({ onCancel, onCreate }) => {
  const { t, lang } = useLanguage();
  const [name, setName] = useState("");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "2rem",
          width: "min(90vw, 380px)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontWeight: 900,
              color: "#ffffff",
              fontSize: "1.2rem",
            }}
          >
            {lang === 'es' ? 'Crear nueva carpeta' : 'Create new folder'}
          </h3>
          <button
            onClick={onCancel}
            className="btn-icon-elite"
            style={{ width: "34px", height: "34px" }}
          >
            <X size={18} />
          </button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onCreate(name.trim());
          }}
          placeholder={t('folder_name_placeholder')}
          className="premium-input"
          style={{ height: "3rem", fontSize: "0.95rem" }}
          autoFocus
        />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "14px",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => {
              if (name.trim()) onCreate(name.trim());
            }}
            style={{
              ...ELITE_STYLES.primaryBtn,
              flex: 1,
              padding: "0.85rem",
              borderRadius: "14px",
              fontSize: "0.85rem",
            }}
          >
            {lang === 'es' ? 'Crear carpeta' : 'Create folder'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ─────────────────────────── MODAL RESUMEN MUSCULAR ─────────────────────────── */

const SummaryModal = ({ exercises, onClose }) => {
  const { t, lang } = useLanguage();
  const labels = SLUG_LABELS[lang] || SLUG_LABELS.es;
  const targets = exercises
    .map((e) => e?.target)
    .filter((t) => typeof t === "string" && t.length > 0);
  const totalSets = exercises.reduce(
    (acc, e) => acc + (e?.sets_data?.length || 0),
    0,
  );
  const estimatedMin = Math.round(totalSets * 2.5);

  // Contar series por músculo (usando body_part como fallback)
  const muscleCount = {};
  exercises.forEach((e) => {
    const muscle = e?.target || e?.body_part || "General";
    muscleCount[muscle] =
      (muscleCount[muscle] || 0) + (e?.sets_data?.length || 1);
  });
  const muscleEntries = Object.entries(muscleCount).sort((a, b) => b[1] - a[1]);
  const maxSets = muscleEntries.length > 0 ? muscleEntries[0][1] : 1;

  const translateMuscle = (raw) => {
    const slug = MUSCLE_SLUG_MAP[(raw || '').toLowerCase().trim()];
    return (slug && labels[slug]) || raw;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px 24px 0 0",
          padding: "2rem",
          width: "min(100vw, 520px)",
          maxHeight: "85vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
        className="no-scrollbar"
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontWeight: 900,
              color: "#ffffff",
              fontSize: "1.3rem",
            }}
          >
            {t('muscle_summary')}
          </h3>
          <button
            onClick={onClose}
            className="btn-icon-elite"
            style={{ width: "34px", height: "34px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body model grande — animated */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <BodyMap targets={targets} scale={1.2} gender={localStorage.getItem('vortice_body_gender') || 'male'} />
        </motion.div>

        {/* Duración estimada */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            background: "rgba(0,201,255,0.07)",
            border: "1px solid rgba(0,201,255,0.2)",
            borderRadius: "14px",
            padding: "0.85rem 1.1rem",
          }}
        >
          <Clock size={18} color="var(--color-primary)" />
          <div>
            <div
              style={{
                fontSize: "0.6rem",
                color: "var(--text-secondary)",
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              {t('estimated_duration')}
            </div>
            <div
              style={{ fontWeight: 900, color: "#ffffff", fontSize: "1.05rem" }}
            >
              {estimatedMin} min
            </div>
          </div>
        </div>

        {/* Lista de músculos con barras */}
        {muscleEntries.length > 0 && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 900,
                color: "var(--color-primary)",
                letterSpacing: "1.5px",
              }}
            >
              {t('muscles_worked')}
            </div>
            {muscleEntries.map(([muscle, count], mIdx) => (
              <motion.div
                key={muscle}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: mIdx * 0.03 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.3rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      textTransform: "capitalize",
                    }}
                  >
                    {translateMuscle(muscle)}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      color: "var(--color-primary)",
                    }}
                  >
                    {count} {count === 1 ? t('set') : t('sets')}
                  </span>
                </div>
                <div
                  style={{
                    height: "5px",
                    background: "var(--surface-3)",
                    borderRadius: "99px",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxSets) * 100}%` }}
                    transition={{ delay: mIdx * 0.03, duration: 0.4, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, var(--color-primary), #0891b2)",
                      borderRadius: "99px",
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

/* ─────────────────────────── COMPONENTE PRINCIPAL ─────────────────────────── */

export default function GymView({ perfil, onStartSession, sessionActive, sessionResult: externalResult, onClearResult }) {
  const { t, lang } = useLanguage();
  /* ── Estado de datos ── */
  const [activeTab, setActiveTab] = useState("train");
  const [ejerciciosMaster, setEjerciciosMaster] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [communityRoutines, setCommunityRoutines] = useState([]);
  const [folders, setFolders] = useState([]);
  const exerciseCacheRef = useRef({});  // { es: [...], en: [...] }

  /* ── Estado del builder ── */
  const [isCreating, setIsCreating] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const [builderExercises, setBuilderExercises] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showSelector, setShowSelector] = useState(false);

  /* ── Estado vista ── */
  const [selectedRoutineForView, setSelectedRoutineForView] = useState(null);

  /* ── Estado sesión (result comes from App via props) ── */
  const sessionResult = externalResult;
  const prevResultRef = useRef(null);
  useEffect(() => {
    if (externalResult && externalResult !== prevResultRef.current) {
      prevResultRef.current = externalResult;
      loadData();
    }
  }, [externalResult]);

  /* ── Loading states ── */
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  /* ── Estado filtros ── */
  const [filterPending, startFilterTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMuscle, setFilterMuscle] = useState("__all__");
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [filterEquipment, setFilterEquipment] = useState("Todos");

  // Wrappers con baja prioridad para no bloquear la UI al cambiar filtros
  const setFilterMuscleDeferred = useCallback((v) => startFilterTransition(() => setFilterMuscle(v)), []);
  const setFilterCategoryDeferred = useCallback((v) => startFilterTransition(() => setFilterCategory(v)), []);
  const setFilterEquipmentDeferred = useCallback((v) => startFilterTransition(() => setFilterEquipment(v)), []);

  /* ── Nuevos estados UI ── */
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuMeta, setMenuMeta] = useState(null); // { id, x, y, type: 'rutina'|'carpeta', data }
  const [openFolders, setOpenFolders] = useState({});
  const [colorPickerFolderId, setColorPickerFolderId] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCardIdx, setExpandedCardIdx] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ── Misc ── */
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cerrar menu al hacer click fuera
  useEffect(() => {
    if (!menuMeta) return;
    const close = () => setMenuMeta(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuMeta]);

  const FOLDER_COLORS = ["var(--color-primary)", "#8b5cf6", "#f59e0b", "#ef4444", "#22c55e", "#ec4899", "#3b82f6", "#f97316"];

  const updateFolderColor = async (fid, color) => {
    try {
      await authFetch(`${API}/api/gym/folders/${fid}/color`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
      setFolders(prev => prev.map(f => f.id === fid ? { ...f, color } : f));
      setColorPickerFolderId(null);
    } catch (e) { console.error(e); }
  };

  /* ─── Carga de datos ─── */

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingData(true);
    setLoadError(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const cached = exerciseCacheRef.current[lang];
      const fetches = [
        authFetch(`${API}/api/gym/rutinas?perfil=${perfil}&lang=${lang}`, { signal: controller.signal }),
        authFetch(`${API}/api/gym/folders?perfil=${perfil}`, { signal: controller.signal }),
        authFetch(`${API}/api/gym/rutinas/comunidad?lang=${lang}`, { signal: controller.signal }),
        ...(!cached ? [authFetch(`${API}/api/exercises?lang=${lang}`, { signal: controller.signal })] : []),
      ];
      const results = await Promise.all(fetches);
      const [rData, fData, cData] = await Promise.all([results[0].json(), results[1].json(), results[2].json()]);
      if (rData.status === "success")
        setRutinas(Array.isArray(rData.rutinas) ? rData.rutinas : []);
      if (fData.status === "success")
        setFolders(Array.isArray(fData.folders) ? fData.folders : []);
      if (cData.status === "success")
        setCommunityRoutines(Array.isArray(cData.rutinas) ? cData.rutinas : []);
      if (cached) {
        setEjerciciosMaster(cached);
      } else {
        const eData = await results[3].json();
        if (eData.status === "success") {
          const ejs = Array.isArray(eData.ejercicios) ? eData.ejercicios : [];
          exerciseCacheRef.current[lang] = ejs;
          setEjerciciosMaster(ejs);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error("Error loading gym data:", e);
      if (!silent) setLoadError(true);
    } finally {
      clearTimeout(timeout);
      setLoadingData(false);
    }
  }, [perfil, lang]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await authFetch(`${API}/api/gym/history/unified?perfil=${perfil}`);
      const data = await res.json();
      if (data.status === "success") setHistoryData(data.history || []);
    } catch (e) { console.error("Error loading history:", e); }
    finally { setHistoryLoading(false); }
  }, [perfil]);

  // Carga inicial controlada (evita bucles)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadData();
      hasLoadedRef.current = true;
    }
  }, [loadData]);

  // Lang switch: silencioso (sin skeleton) + usa cache si existe
  useEffect(() => {
    if (hasLoadedRef.current) {
      loadData({ silent: true });
      setFilterMuscle("__all__");
      setFilterCategory("Todos");
      setFilterEquipment("Todos");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab, loadHistory]);

  /* ─── Guardar rutina ─── */

  const handleSaveRoutine = async (
    overrideName,
    overrideExercises,
    overrideEditingId,
  ) => {
    const finalName = overrideName ?? routineName;
    const finalExercises = overrideExercises ?? builderExercises;
    const finalEditingId =
      overrideEditingId !== undefined ? overrideEditingId : editingId;

    if (!finalName.trim()) return alert("Ponle un nombre a tu rutina");
    setIsSaving(true);
    const mappedExercises = finalExercises.map((e) => ({
      id_ejercicio: String(e?.id_ejercicio || e?.id),
      sets_data: e?.sets_data || [{ type: "normal", reps: "10", weight: "" }],
      notes: e?.notes || "",
      rest_seconds: e?.rest_seconds || 60,
    }));
    const payload = {
      perfil,
      nombre: finalName.trim(),
      folder_id: selectedFolderId,
      ejercicios: mappedExercises,
    };
    try {
      const res = await authFetch(
        finalEditingId
          ? `${API}/api/gym/rutina/${finalEditingId}`
          : `${API}/api/gym/rutina/nueva`,
        {
          method: finalEditingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (data.status === "success") {
        setIsCreating(false);
        setBuilderExercises([]);
        setRoutineName("");
        setShowSelector(false);
        setEditingId(null);
        loadData();
      } else {
        alert(`Error: ${data.error || "No se pudo guardar la rutina"}`);
      }
    } catch (err) {
      alert(`Error de conexión: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /* ─── Duplicar rutina ─── */

  const handleDuplicateRoutine = async (r) => {
    setActionLoading(`dup-${r.id}`);
    const copy = Array.isArray(r.ejercicios) ? r.ejercicios : [];
    await handleSaveRoutine(`${r.name} (copia)`, copy, null);
    setActionLoading(null);
  };

  /* ─── Eliminar rutina ─── */

  const handleDeleteRoutine = async (id) => {
    setActionLoading(`del-${id}`);
    try {
      await authFetch(`${API}/api/gym/rutina/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  /* ─── Crear carpeta ─── */

  const handleCreateFolder = async (name) => {
    setActionLoading("folder");
    try {
      const res = await authFetch(`${API}/api/gym/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil, name }),
      });
      const data = await res.json();
      if (data.status === "error" && data.max_folders) {
        alert(lang === 'es' ? `Máximo ${data.max_folders} carpetas permitidas` : `Maximum ${data.max_folders} folders allowed`);
        return;
      }
      setShowFolderModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  /* ─── Iniciar sesión ─── */

  const startSession = (rutinaBase, routineId = null, rName = "") => {
    const ejs = Array.isArray(rutinaBase) ? rutinaBase : [];
    if (onStartSession) onStartSession(ejs, routineId, rName);
  };

  /* ─── Estilo fullscreen ─── */

  const fullScreenStyle = useMemo(
    () =>
      isCreating || selectedRoutineForView
        ? {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 5000,
            background: "#050508",
            overflowY: "auto",
            padding: isMobile ? "1rem" : "2.5rem",
            display: "flex",
            flexDirection: "column",
          }
        : {},
    [isCreating, selectedRoutineForView, isMobile],
  );

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */

  return (
    <div style={fullScreenStyle} className="elite-page animate-in">
      {/* WorkoutTracker is rendered globally in App.jsx */}

      {/* ══════════ SESSION RESULT MODAL ══════════ */}
      {sessionResult && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 20000,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { if (onClearResult) onClearResult(); } }}
        >
          <div
            style={{
              background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "24px", padding: "2rem", width: "min(90vw, 380px)",
              display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center",
            }}
            className="animate-in"
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(0,201,255,0.15))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 30px rgba(245,158,11,0.2)",
                }}
              >
                <Trophy size={32} color="#f59e0b" />
              </motion.div>
            </div>
            <h3 style={{ margin: 0, fontWeight: 900, color: "#fff", fontSize: "1.3rem" }}>
              ¡Entrenamiento guardado!
            </h3>
            {sessionResult.status === "success" && (
              <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--color-primary)" }}>
                    {sessionResult.volumen ? `${sessionResult.volumen.toFixed(0)}` : "0"}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", fontWeight: 700 }}>KG VOLUMEN</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#22c55e" }}>
                    +{sessionResult.exp_ganada || 0}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", fontWeight: 700 }}>EXP</div>
                </div>
                {sessionResult.nuevo_nivel && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#f59e0b" }}>
                      {sessionResult.nuevo_nivel}
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", fontWeight: 700 }}>NIVEL</div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => { if (onClearResult) onClearResult(); }}
              style={{
                background: "linear-gradient(135deg, var(--color-primary), #0891b2)",
                color: "#000", border: "none", borderRadius: "16px",
                padding: "1rem", fontWeight: 900, fontSize: "0.95rem", cursor: "pointer",
                boxShadow: "0 0 20px rgba(0,201,255,0.3)",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ══════════ BUILDER DE RUTINA ══════════ */}
      {
      isCreating ? (
        /* ARQUITECTURA: flex column, header fijo arriba, scroll en medio, botón fijo abajo */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            margin: isMobile ? "-1rem" : "-2.5rem",
            width: isMobile ? "calc(100% + 2rem)" : "calc(100% + 5rem)",
          }}
        >
          {/* Header builder — compact back arrow + inline name */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexShrink: 0,
              background: "#050508",
              borderBottom: "1px solid var(--surface-2)",
              paddingTop: "max(0.6rem, env(safe-area-inset-top, 0.6rem))",
              paddingRight: isMobile ? "0.75rem" : "1.5rem",
              paddingBottom: isMobile ? "0.6rem" : "0.7rem",
              paddingLeft: isMobile ? "0.75rem" : "1.5rem",
            }}
          >
            <button
              onClick={() => setIsCreating(false)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "0.3rem", display: "flex", alignItems: "center",
              }}
            >
              <ChevronLeft size={22} color="var(--text-secondary)" />
            </button>
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
              <input
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                placeholder={t('routine_name_placeholder')}
                style={{
                  width: "100%", fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.3px",
                  padding: "0.4rem 0.1rem", background: "none", color: "#fff",
                  outline: "none",
                  border: "none", borderBottom: routineName ? "2px solid rgba(0,201,255,0.3)" : "2px solid rgba(255,255,255,0.12)",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.target.style.borderBottomColor = "var(--color-primary)"; }}
                onBlur={(e) => { e.target.style.borderBottomColor = routineName ? "rgba(0,201,255,0.3)" : "rgba(255,255,255,0.12)"; }}
              />
              {!routineName && (
                <span style={{
                  position: "absolute", right: "0.2rem", top: "50%", transform: "translateY(-50%)",
                  fontSize: "0.55rem", fontWeight: 700, color: "var(--text-muted)",
                  background: "var(--surface-hover)", padding: "0.15rem 0.4rem", borderRadius: "6px",
                  pointerEvents: "none",
                }}>
                  <Edit2 size={11} color="var(--text-muted)" />
                </span>
              )}
            </div>
            {/* Folder toggle button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowFolderDropdown?.(!showFolderDropdown)}
              style={{
                background: selectedFolderId ? "rgba(0,201,255,0.12)" : "var(--surface-hover)",
                border: selectedFolderId ? "1px solid rgba(0,201,255,0.3)" : "1px solid var(--surface-3)",
                borderRadius: "10px", padding: "0.35rem 0.5rem", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.3rem",
                color: selectedFolderId ? "var(--color-primary)" : "var(--text-muted)",
              }}
            >
              <motion.div
                animate={{ rotate: showFolderDropdown ? 15 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Folder size={14} style={{ strokeWidth: 2.5 }} />
              </motion.div>
              <motion.div
                animate={{ rotate: showFolderDropdown ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                style={{ display: "flex", alignItems: "center" }}
              >
                <ChevronDown size={12} style={{ strokeWidth: 2.5 }} />
              </motion.div>
            </motion.button>
          </header>

          {/* Folder dropdown - animated */}
          <AnimatePresence>
            {showFolderDropdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden", flexShrink: 0, background: "var(--surface-2)", borderBottom: "1px solid var(--surface-2)" }}
              >
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", padding: "0.6rem 1rem" }}>
                  <button
                    onClick={() => { setSelectedFolderId(null); setShowFolderDropdown(false); }}
                    style={{
                      padding: "0.35rem 0.75rem", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 800,
                      cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                      background: selectedFolderId === null ? "rgba(0,201,255,0.15)" : "var(--surface-hover)",
                      borderColor: selectedFolderId === null ? "var(--color-primary)" : "var(--border-default)",
                      color: selectedFolderId === null ? "var(--color-primary)" : "var(--text-muted)",
                    }}
                  >
                    {t('no_folder')}
                  </button>
                  {folders.map((f) => {
                    const fc = f.color || "var(--color-primary)";
                    const isActive = selectedFolderId === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedFolderId(f.id); setShowFolderDropdown(false); }}
                        style={{
                          padding: "0.35rem 0.75rem", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 800,
                          cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                          display: "flex", alignItems: "center", gap: "0.35rem",
                          background: isActive ? `${fc}20` : "var(--surface-hover)",
                          borderColor: isActive ? `${fc}60` : "var(--border-default)",
                          color: isActive ? fc : "var(--text-secondary)",
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: fc, flexShrink: 0 }} />
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ ZONA SCROLLABLE ══ */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isMobile ? "0.75rem 1rem" : "1rem 2rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
            className="no-scrollbar"
          >
            {/* ── Stats bar — larger ── */}
            <button
              onClick={() => setShowSummaryModal(true)}
              style={{
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                background: "rgba(0,201,255,0.05)",
                border: "1px solid rgba(0,201,255,0.15)",
                borderRadius: "14px",
                padding: isMobile ? "0.6rem 0.75rem" : "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", gap: isMobile ? "0.5rem" : "0.75rem", alignItems: "center", flex: 1, minWidth: 0 }}>
                {[
                  { label: t('exercises'), value: builderExercises.length, color: "#fff" },
                  { label: t('series'), value: builderExercises.reduce((a, e) => a + (e?.sets_data?.length || 0), 0), color: "#fff" },
                  { label: t('duration'), value: `${Math.round(builderExercises.reduce((a, e) => a + (e?.sets_data?.length || 0), 0) * 2.5)}m`, color: "var(--color-primary)" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.5rem" : "0.75rem" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.5rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase" }}>{s.label}</div>
                      <div style={{ fontWeight: 900, fontSize: isMobile ? "1.05rem" : "1.2rem", color: s.color, lineHeight: 1 }}>{s.value}</div>
                    </div>
                    {i < 2 && <div style={{ width: 1, height: 20, background: "var(--surface-3)" }} />}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.1rem", flexShrink: 0 }}>
                <div style={{ width: isMobile ? 60 : 70, height: isMobile ? 50 : 58, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BodyMap
                    targets={builderExercises.map((e) => e?.target).filter((t) => typeof t === "string")}
                    profileMode
                    scale={isMobile ? 0.15 : 0.17}
                    gender={localStorage.getItem('vortice_body_gender') || 'male'}
                  />
                </div>
                <ChevronRight size={12} color="var(--color-primary)" style={{ opacity: 0.5 }} />
              </div>
            </button>

            {/* Lista de ejercicios — cards colapsables */}
            {builderExercises.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2.5rem 1rem",
                  color: "var(--text-muted)",
                }}
              >
                <Dumbbell
                  size={44}
                  style={{ margin: "0 auto 0.75rem", opacity: 0.25 }}
                />
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  {t('no_exercises_yet')}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    marginTop: "0.25rem",
                    opacity: 0.6,
                  }}
                >
                  {t('tap_to_add')}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {builderExercises.map((ej, idx) => {
                  const isOpen = expandedCardIdx === idx;
                  const setCount = ej?.sets_data?.length || 0;
                  const setTypeSummary = (ej?.sets_data || []).map((s) => {
                    const t = SET_TYPES.find((t) => t.id === s.type);
                    return t ? t.label : "N";
                  });
                  return (
                    <div
                      key={idx}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "18px",
                        overflow: "hidden",
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Card colapsada — siempre visible */}
                      <div
                        onClick={() => setExpandedCardIdx(isOpen ? null : idx)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={ej?.gif_url}
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "10px",
                            background: "#fff",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              color: "#fff",
                              fontSize: "0.88rem",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {ej?.nombre_es}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              marginTop: "0.3rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.58rem",
                                color: "var(--color-primary)",
                                fontWeight: 800,
                                background: "rgba(0,201,255,0.12)",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "6px",
                              }}
                            >
                              {ej?.body_part?.toUpperCase()}
                            </span>
                            <span
                              style={{
                                fontSize: "0.58rem",
                                color: "var(--text-muted)",
                                fontWeight: 700,
                              }}
                            >
                              {setCount} serie{setCount !== 1 ? "s" : ""}
                            </span>
                            {setTypeSummary.slice(0, 4).map((label, i) => {
                              const t = SET_TYPES.find(
                                (t) => t.label === label,
                              );
                              return (
                                <span
                                  key={i}
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: t?.color || "var(--color-primary)",
                                    display: "inline-block",
                                  }}
                                />
                              );
                            })}
                            {setTypeSummary.length > 4 && (
                              <span
                                style={{
                                  fontSize: "0.55rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                +{setTypeSummary.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            flexShrink: 0,
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBuilderExercises((p) =>
                                p.filter((_, i) => i !== idx),
                              );
                            }}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: "rgba(239,68,68,0.1)",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                          <ChevronDown
                            size={18}
                            color="var(--text-muted)"
                            style={{
                              transform: isOpen
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }}
                          />
                        </div>
                      </div>

                      {/* Panel expandido */}
                      {isOpen && (
                        <div
                          style={{
                            padding: "0.85rem",
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                        >
                          {/* Descanso */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.85rem",
                            }}
                          >
                            <Clock size={13} color="var(--text-secondary)" />
                            <span
                              style={{
                                fontSize: "0.68rem",
                                color: "var(--text-secondary)",
                                fontWeight: 700,
                              }}
                            >
                              Descanso
                            </span>
                            <select
                              value={ej?.rest_seconds || 60}
                              onChange={(e) => {
                                const nw = [...builderExercises];
                                nw[idx].rest_seconds = Number(e.target.value);
                                setBuilderExercises(nw);
                              }}
                              style={{
                                background: "var(--surface-2)",
                                border: "1px solid var(--border-default)",
                                borderRadius: "8px",
                                color: "var(--color-primary)",
                                padding: "0.2rem 0.45rem",
                                fontSize: "0.72rem",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              <option
                                value={30}
                                style={{ background: "#0f172a" }}
                              >
                                30s
                              </option>
                              <option
                                value={60}
                                style={{ background: "#0f172a" }}
                              >
                                60s
                              </option>
                              <option
                                value={90}
                                style={{ background: "#0f172a" }}
                              >
                                90s
                              </option>
                              <option
                                value={120}
                                style={{ background: "#0f172a" }}
                              >
                                2min
                              </option>
                            </select>
                          </div>

                          {/* Leyenda tipos + toggle REPS/SEG */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "0.7rem",
                              flexWrap: "wrap",
                              gap: "0.35rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                flexWrap: "wrap",
                              }}
                            >
                              {SET_TYPES.map((t) => (
                                <span
                                  key={t.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.2rem",
                                    fontSize: "0.56rem",
                                    color: "var(--text-muted)",
                                    fontWeight: 600,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 2,
                                      background: t.color,
                                      display: "inline-block",
                                      opacity: 0.85,
                                    }}
                                  />
                                  {t.desc}
                                </span>
                              ))}
                            </div>
                            {/* Toggle REPS / SEG */}
                            <button
                              onClick={() => {
                                const nw = [...builderExercises];
                                nw[idx].unit =
                                  nw[idx].unit === "seg" ? "reps" : "seg";
                                setBuilderExercises(nw);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.2rem",
                                background:
                                  ej.unit === "seg"
                                    ? "rgba(139,92,246,0.18)"
                                    : "rgba(0,201,255,0.1)",
                                border: "1px solid",
                                borderColor:
                                  ej.unit === "seg"
                                    ? "#8b5cf6"
                                    : "rgba(0,201,255,0.3)",
                                borderRadius: 99,
                                padding: "0.2rem 0.55rem",
                                cursor: "pointer",
                                fontSize: "0.6rem",
                                fontWeight: 900,
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    ej.unit !== "seg" ? "var(--color-primary)" : "var(--text-muted)",
                                }}
                              >
                                REPS
                              </span>
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  margin: "0 0.15rem",
                                }}
                              >
                                ⇄
                              </span>
                              <span
                                style={{
                                  color:
                                    ej.unit === "seg" ? "#8b5cf6" : "var(--text-muted)",
                                }}
                              >
                                SEG
                              </span>
                            </button>
                          </div>

                          {/* Header cols — grid fijo */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "44px 1fr 1fr 32px",
                              gap: "0.4rem",
                              marginBottom: "0.3rem",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.5rem",
                                fontWeight: 900,
                                color: "var(--text-muted)",
                                textAlign: "center",
                                letterSpacing: "0.5px",
                              }}
                            >
                              SERIE
                            </div>
                            <div
                              style={{
                                fontSize: "0.5rem",
                                fontWeight: 900,
                                color: "var(--text-muted)",
                                textAlign: "center",
                                letterSpacing: "0.5px",
                              }}
                            >
                              KG
                            </div>
                            <div
                              style={{
                                fontSize: "0.5rem",
                                fontWeight: 900,
                                textAlign: "center",
                                letterSpacing: "0.5px",
                                color:
                                  ej.unit === "seg" ? "#8b5cf6" : "var(--text-muted)",
                              }}
                            >
                              {ej.unit === "seg" ? "SEG" : "REPS"}
                            </div>
                            <div />
                          </div>

                          {/* Filas */}
                          {ej?.sets_data?.map((s, si) => (
                            <div
                              key={si}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "44px 1fr 1fr 32px",
                                gap: "0.4rem",
                                alignItems: "center",
                                marginBottom: "0.4rem",
                              }}
                            >
                              {/* Badge tipo — toca para ciclar */}
                              <button
                                onClick={() => {
                                  const nw = [...builderExercises];
                                  const cur = SET_TYPES.findIndex(
                                    (t) => t.id === s.type,
                                  );
                                  nw[idx].sets_data[si].type =
                                    SET_TYPES[(cur + 1) % SET_TYPES.length].id;
                                  setBuilderExercises(nw);
                                }}
                                title={
                                  SET_TYPES.find((t) => t.id === s.type)?.desc
                                }
                                style={{
                                  height: 44,
                                  width: "100%",
                                  borderRadius: 12,
                                  background:
                                    SET_TYPES.find((t) => t.id === s.type)
                                      ?.color || "var(--color-primary)",
                                  border: "none",
                                  fontWeight: 900,
                                  fontSize: "0.85rem",
                                  color: "#000",
                                  cursor: "pointer",
                                }}
                              >
                                {SET_TYPES.find((t) => t.id === s.type)
                                  ?.label || "N"}
                              </button>
                              {/* KG input — máx 3 dígitos */}
                              <input
                                type="number"
                                min="0"
                                max="999"
                                value={s.weight}
                                onChange={(e) => {
                                  const nw = [...builderExercises];
                                  nw[idx].sets_data[si].weight = e.target.value;
                                  setBuilderExercises(nw);
                                }}
                                placeholder="0"
                                inputMode="decimal"
                                className="premium-input"
                                style={{
                                  textAlign: "center",
                                  height: 44,
                                  padding: "0.3rem",
                                  fontSize: "1rem",
                                  fontWeight: 700,
                                }}
                              />
                              {/* REPS o SEG input — máx 3 dígitos */}
                              <input
                                type="number"
                                min="0"
                                max="999"
                                value={s.reps}
                                onChange={(e) => {
                                  const nw = [...builderExercises];
                                  nw[idx].sets_data[si].reps = e.target.value;
                                  setBuilderExercises(nw);
                                }}
                                placeholder={ej.unit === "seg" ? "30" : "10"}
                                inputMode="numeric"
                                className="premium-input"
                                style={{
                                  textAlign: "center",
                                  height: 44,
                                  padding: "0.3rem",
                                  fontSize: "1rem",
                                  fontWeight: 700,
                                  borderColor:
                                    ej.unit === "seg"
                                      ? "rgba(139,92,246,0.3)"
                                      : undefined,
                                }}
                              />
                              {/* Botón eliminar serie */}
                              <button
                                onClick={() => {
                                  const nw = [...builderExercises];
                                  nw[idx].sets_data.splice(si, 1);
                                  setBuilderExercises(nw);
                                }}
                                style={{
                                  height: 32,
                                  width: 32,
                                  borderRadius: 8,
                                  background: "var(--surface-hover)",
                                  border: "1px solid var(--surface-3)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <X size={13} color="var(--text-muted)" />
                              </button>
                            </div>
                          ))}

                          {/* + Serie */}
                          <button
                            onClick={() => {
                              const nw = [...builderExercises];
                              nw[idx].sets_data.push({
                                type: "normal",
                                weight: "",
                                reps: "10",
                              });
                              setBuilderExercises(nw);
                            }}
                            style={{
                              width: "100%",
                              marginTop: "0.4rem",
                              padding: "0.65rem",
                              borderRadius: 12,
                              background: "rgba(0,201,255,0.07)",
                              border: "1px dashed rgba(0,201,255,0.3)",
                              color: "var(--color-primary)",
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              cursor: "pointer",
                            }}
                          >
                            + Agregar Serie
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* fin zona scrollable */}

          {/* Dual bottom buttons — FUERA del scroll, siempre visible */}
          <div
            style={{
              flexShrink: 0,
              padding: "0.6rem 1rem",
              paddingBottom:
                "max(0.6rem, env(safe-area-inset-bottom, 0.6rem))",
              background: "#050508",
              borderTop: "1px solid var(--surface-2)",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSaveRoutine()}
              disabled={isSaving}
              style={{
                flex: 1,
                height: "3rem",
                fontSize: "0.85rem",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                fontWeight: 800,
                cursor: isSaving ? "not-allowed" : "pointer",
                background: "var(--surface-hover)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              <Save size={16} /> {isSaving ? t('saving') : t('save_routine')}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSelector(true)}
              style={{
                ...ELITE_STYLES.primaryBtn,
                flex: 1.3,
                height: "3rem",
                fontSize: "0.85rem",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              <Plus size={18} strokeWidth={3} /> {t('add_exercise')}
            </motion.button>
          </div>
        </div>
      ) : /* ══════════ DETALLE DE RUTINA ══════════ */
      selectedRoutineForView ? (
        <RoutineDetailView
          routine={selectedRoutineForView}
          onBack={() => setSelectedRoutineForView(null)}
          onEdit={(r) => {
            setEditingId(r.id);
            setRoutineName(r.name);
            setBuilderExercises(
              Array.isArray(r.ejercicios) ? r.ejercicios : [],
            );
            setSelectedFolderId(r.folder_id || null);
            setIsCreating(true);
            setSelectedRoutineForView(null);
          }}
          onShare={(rid) => {
            navigator.clipboard.writeText(
              `${window.location.origin}/public/routine/${rid}`,
            );
            alert("Copiado!");
          }}
          onStartWorkout={(ejs, rid) => {
            startSession(ejs, rid, selectedRoutineForView?.name || "");
            setSelectedRoutineForView(null);
          }}
        />
      ) : (
        /* ══════════ VISTA PRINCIPAL (lista de rutinas) ══════════ */
        <div className="view-container">

          {/* Header principal */}
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                fontWeight: 900,
                fontSize: isMobile ? "2rem" : "2.6rem",
                color: "#ffffff",
                letterSpacing: "-1.5px",
                margin: 0,
              }}
            >
              {activeTab === "sports" ? (lang === "es" ? "Deportes" : "Sports") : t('routines')}
            </h2>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              {[
                { key: "train", icon: Dumbbell, label: lang === "es" ? "Gym" : "Gym" },
                { key: "sports", icon: Activity, label: lang === "es" ? "Deportes" : "Sports" },
                { key: "history", icon: History, label: lang === "es" ? "Historial" : "History" },
              ].map(tab => (
                <motion.button
                  key={tab.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.25rem",
                    padding: "0.4rem 0.65rem", borderRadius: "10px",
                    fontSize: "0.65rem", fontWeight: 800, cursor: "pointer",
                    border: "1px solid",
                    background: activeTab === tab.key ? "rgba(0,201,255,0.15)" : "var(--surface-1)",
                    borderColor: activeTab === tab.key ? "rgba(0,201,255,0.4)" : "var(--surface-2)",
                    color: activeTab === tab.key ? "var(--color-primary)" : "var(--text-muted)",
                    transition: "all 0.15s",
                  }}
                >
                  <tab.icon size={14} />
                  {isMobile ? null : tab.label}
                </motion.button>
              ))}
            </div>
          </header>

          {loadingData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem 0" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  background: "var(--surface-1)", border: "1px solid var(--surface-2)",
                  borderRadius: "16px", padding: "1.1rem", display: "flex", alignItems: "center", gap: "0.85rem",
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--surface-2)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, width: "60%", background: "var(--surface-2)", borderRadius: 6, marginBottom: 6 }} />
                    <div style={{ height: 8, width: "40%", background: "var(--surface-hover)", borderRadius: 4 }} />
                  </div>
                  <Loader size={16} color="var(--text-muted)" style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ))}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : loadError ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "3rem 1rem", gap: "1rem", textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Loader size={24} color="#ef4444" />
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
                No se pudo conectar con el servidor
              </p>
              <button
                onClick={() => { hasLoadedRef.current = false; loadData(); hasLoadedRef.current = true; }}
                style={{
                  padding: "0.6rem 1.4rem", borderRadius: 10,
                  background: "rgba(0,201,255,0.15)", border: "1px solid rgba(0,201,255,0.3)",
                  color: "var(--color-primary)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                Reintentar
              </button>
            </div>
          ) : activeTab === "train" ? (
            <>
              {/* Acciones rápidas: Nueva rutina / Nueva carpeta */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                }}
              >
                {/* Nueva rutina */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ backgroundColor: "var(--surface-2)" }}
                  onClick={() => {
                    setIsCreating(true);
                    setBuilderExercises([]);
                    setRoutineName("");
                    setEditingId(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                    background: "var(--surface-hover)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "16px",
                    padding: "0.95rem 1.1rem",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "12px",
                      background: "rgba(0,201,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Plus size={20} color="var(--color-primary)" />
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {t('new_routine')}
                  </span>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </motion.button>

                {/* Nueva carpeta */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ backgroundColor: "var(--surface-2)" }}
                  onClick={() => setShowFolderModal(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                    background: "var(--surface-hover)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "16px",
                    padding: "0.95rem 1.1rem",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "12px",
                      background: "rgba(148,163,184,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FolderPlus size={20} color="var(--text-secondary)" />
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {t('new_folder')}
                  </span>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </motion.button>
              </div>

                            {/* RUTINAS DE LA COMUNIDAD */}
              {communityRoutines.length > 0 && (
                <div style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.8rem", padding: "0 0.2rem" }}>
                    <Users size={16} color="var(--color-primary)" />
                    <span style={{ fontWeight: 900, fontSize: "0.85rem", color: "var(--color-primary)", letterSpacing: "1px" }}>
                      RUTINAS DE LA COMUNIDAD
                    </span>
                  </div>
                  <div style={{ 
                    display: "flex", overflowX: "auto", gap: "0.75rem", paddingBottom: "0.5rem",
                    scrollSnapType: "x mandatory"
                  }} className="no-scrollbar">
                    {communityRoutines.map(r => (
                      <motion.div 
                        key={`comm-${r.id}`}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedRoutineForView(r)}
                        style={{
                          minWidth: "220px", width: "220px", height: "140px", flexShrink: 0,
                          borderRadius: "16px", overflow: "hidden", position: "relative",
                          cursor: "pointer", scrollSnapAlign: "start",
                          border: "1px solid rgba(255,255,255,0.1)"
                        }}
                      >
                        <img 
                          src={r.image_url || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=400"} 
                          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.4 }}
                        />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #050508 10%, transparent 90%)" }} />
                        <div style={{ position: "absolute", bottom: "0.8rem", left: "0.8rem", right: "0.8rem" }}>
                          <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "#fff", lineHeight: 1.1, marginBottom: "0.2rem" }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--color-primary)" }}>
                            {Array.isArray(r.ejercicios) ? r.ejercicios.length : 0} ejercicios · Vórtice
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Carpetas colapsables */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                }}
              >
                {folders.map((f) => {
                  const folderRoutines = rutinas.filter(
                    (r) => Number(r?.folder_id) === Number(f.id),
                  );
                  const isFolderOpen = openFolders?.[f.id] !== false;
                  const fColor = f.color || "var(--color-primary)";
                  const isPickingColor = colorPickerFolderId === f.id;
                  return (
                    <div key={f.id} style={{
                      borderRadius: "18px", overflow: "visible",
                      background: "var(--surface-1)",
                      border: `1px solid ${fColor}20`,
                      borderLeft: `3px solid ${fColor}50`,
                      padding: "0.5rem 0.5rem 0.5rem 0.6rem",
                    }}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setOpenFolders(prev => ({ ...prev, [f.id]: !isFolderOpen }))}
                        style={{
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.3rem 0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <motion.div
                            animate={{ rotate: isFolderOpen ? 90 : 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <ChevronRight size={15} color={fColor} />
                          </motion.div>
                          <motion.div
                            animate={{ rotate: isFolderOpen ? 15 : 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <Folder size={15} color={fColor} style={{ opacity: 0.8 }} />
                          </motion.div>
                          <span
                            style={{
                              fontWeight: 900,
                              color: fColor,
                              fontSize: "0.85rem",
                              letterSpacing: "0.3px",
                              textTransform: "uppercase",
                            }}
                          >
                            {f.name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.6rem",
                              fontWeight: 800,
                              color: "var(--text-muted)",
                              background: "var(--surface-2)",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "6px",
                            }}
                          >
                            {folderRoutines.length}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <button
                            className="btn-icon-elite"
                            style={{ width: "28px", height: "28px" }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setColorPickerFolderId(isPickingColor ? null : f.id);
                            }}
                          >
                            <Edit2 size={13} color={fColor} style={{ opacity: 0.6 }} />
                          </button>
                          <button
                            className="btn-icon-elite"
                            style={{ width: "28px", height: "28px" }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuMeta(prev =>
                                prev?.id === `folder-${f.id}`
                                  ? null
                                  : { id: `folder-${f.id}`, x: rect.right, y: rect.bottom + 4, type: 'carpeta', data: f }
                              );
                            }}
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </motion.div>

                      {/* Color picker */}
                      <AnimatePresence>
                        {isPickingColor && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ display: "flex", gap: "0.35rem", padding: "0.4rem 0 0.2rem 1.5rem" }}>
                              {FOLDER_COLORS.map(c => (
                                <motion.button
                                  key={c}
                                  whileTap={{ scale: 0.85 }}
                                  onClick={(e) => { e.stopPropagation(); updateFolderColor(f.id, c); }}
                                  style={{
                                    width: "22px", height: "22px", borderRadius: "50%",
                                    background: c, border: fColor === c ? "2px solid #fff" : "2px solid transparent",
                                    cursor: "pointer", transition: "border 0.15s",
                                  }}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence initial={false}>
                        {isFolderOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.65rem",
                                marginTop: "0.5rem",
                              }}
                            >
                        {folderRoutines.map((r) => {
                          const previewText = Array.isArray(r.ejercicios)
                            ? r.ejercicios
                                .map((e) => e?.nombre_es || e?.nombre)
                                .filter(Boolean)
                                .slice(0, 5)
                                .join(", ")
                            : "";
                          const isMenuOpen = openMenuId === r.id;
                          return (
                            <div
                              key={r.id}
                              style={{
                                background: "var(--surface-1)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                borderRadius: "16px",
                                padding: "0.9rem 1rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                position: "relative",
                              }}
                            >
                              {/* Ícono rutina con color de carpeta */}
                              <div
                                style={{
                                  width: "38px", height: "38px", borderRadius: "12px",
                                  background: `${fColor}18`, border: `1px solid ${fColor}30`,
                                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}
                              >
                                <Dumbbell size={18} color={fColor} />
                              </div>
                              {/* Info clickeable */}
                              <div
                                onClick={() => setSelectedRoutineForView(r)}
                                style={{
                                  flex: 1,
                                  cursor: "pointer",
                                  minWidth: 0,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 900, fontSize: "0.95rem", color: "var(--color-text)" }}>
                                    {r.name}
                                  </span>
                                  <span style={{
                                    fontSize: "0.52rem", fontWeight: 900, color: "var(--color-text-muted)",
                                    background: "var(--surface-2)", padding: "0.12rem 0.35rem", borderRadius: "6px",
                                  }}>
                                    {Array.isArray(r.ejercicios) ? r.ejercicios.length : 0} ej
                                  </span>
                                </div>
                                {/* Muscle pills */}
                                {Array.isArray(r.ejercicios) && r.ejercicios.length > 0 && (() => {
                                  const muscles = [...new Set(r.ejercicios.map(e => e?.target || e?.body_part).filter(Boolean))].slice(0, 3);
                                  const muscleColors = { chest: '#00C9FF', back: 'var(--color-gras)', legs: 'var(--color-prot)', shoulders: 'var(--color-carb)', arms: '#EF4444', core: 'var(--color-primary)' };
                                  return muscles.length > 0 ? (
                                    <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                                      {muscles.map(m => {
                                        const col = muscleColors[m?.toLowerCase()] || 'var(--text-muted)';
                                        return (
                                          <span key={m} style={{ fontSize: "0.5rem", fontWeight: 800, padding: "0.1rem 0.4rem", borderRadius: "999px", background: `${col}18`, color: col, border: `1px solid ${col}30` }}>
                                            {m}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : null;
                                })()}
                              </div>

                              {/* Botón INICIAR directo */}
                              <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={(e) => { e.stopPropagation(); startSession(r.ejercicios, r.id, r.name); }}
                                style={{
                                  flexShrink: 0, padding: "0.4rem 0.7rem", borderRadius: "10px", border: "none",
                                  background: `${fColor}20`, border: `1px solid ${fColor}40`,
                                  color: fColor, fontWeight: 900, fontSize: "0.62rem", cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: "0.3rem",
                                }}
                              >
                                ▶
                              </motion.button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuMeta(prev =>
                                    prev?.id === r.id
                                      ? null
                                      : { id: r.id, x: rect.right, y: rect.bottom + 4, type: 'rutina', data: r }
                                  );
                                }}
                                className="btn-icon-elite"
                                style={{ width: "32px", height: "32px", flexShrink: 0,
                                  background: menuMeta?.id === r.id ? "rgba(0,201,255,0.15)" : undefined }}
                              >
                                <MoreVertical size={16} />
                              </button>
                            </div>
                          );
                        })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Rutinas sin carpeta */}
                {(() => {
                  const orphans = rutinas.filter(
                    (r) =>
                      !r?.folder_id ||
                      !folders.find(
                        (f) => Number(f.id) === Number(r.folder_id),
                      ),
                  );
                  if (orphans.length === 0) return null;
                  const isOrphanOpen = openFolders?.["_orphan"] !== false;
                  return (
                    <div>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setOpenFolders(prev => ({ ...prev, ["_orphan"]: !isOrphanOpen }))}
                        style={{
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.6rem 0.5rem",
                          borderRadius: "14px",
                          background: isOrphanOpen ? "var(--surface-1)" : "transparent",
                          transition: "background 0.2s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.55rem",
                          }}
                        >
                          <motion.div
                            animate={{ rotate: isOrphanOpen ? 90 : 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <ChevronRight size={16} color="var(--text-secondary)" />
                          </motion.div>
                          <span
                            style={{
                              fontWeight: 900,
                              color: "var(--text-secondary)",
                              fontSize: "0.88rem",
                              letterSpacing: "0.3px",
                              textTransform: "uppercase",
                            }}
                          >
                            {t('no_folder')}
                          </span>
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              color: "var(--text-muted)",
                              background: "var(--surface-2)",
                              padding: "0.1rem 0.45rem",
                              borderRadius: "6px",
                            }}
                          >
                            {orphans.length}
                          </span>
                        </div>
                      </motion.div>

                      <AnimatePresence initial={false}>
                        {isOrphanOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.65rem",
                                marginTop: "0.65rem",
                                paddingLeft: "0.25rem",
                              }}
                            >
                        {orphans.map((r) => {
                          const previewText = Array.isArray(r.ejercicios)
                            ? r.ejercicios
                                .map((e) => e?.nombre_es || e?.nombre)
                                .filter(Boolean)
                                .slice(0, 5)
                                .join(", ")
                            : "";
                          const isMenuOpen = openMenuId === r.id;
                          return (
                            <div
                              key={r.id}
                              style={{
                                background: "var(--surface-1)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                borderRadius: "16px",
                                padding: "0.9rem 1rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                position: "relative",
                              }}
                            >
                              <div
                                style={{
                                  width: "38px", height: "38px", borderRadius: "12px",
                                  background: "rgba(0,201,255,0.1)", border: "1px solid rgba(0,201,255,0.15)",
                                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}
                              >
                                <Dumbbell size={18} color="var(--color-primary)" />
                              </div>
                              <div
                                onClick={() => setSelectedRoutineForView(r)}
                                style={{
                                  flex: 1,
                                  cursor: "pointer",
                                  minWidth: 0,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 900, fontSize: "0.95rem", color: "var(--color-text)" }}>
                                    {r.name}
                                  </span>
                                  <span style={{
                                    fontSize: "0.52rem", fontWeight: 900, color: "var(--color-text-muted)",
                                    background: "var(--surface-2)", padding: "0.12rem 0.35rem", borderRadius: "6px",
                                  }}>
                                    {Array.isArray(r.ejercicios) ? r.ejercicios.length : 0} ej
                                  </span>
                                </div>
                                {Array.isArray(r.ejercicios) && (() => {
                                  const muscles = [...new Set(r.ejercicios.map(e => e?.target || e?.body_part).filter(Boolean))].slice(0, 3);
                                  const muscleColors = { chest: '#00C9FF', back: 'var(--color-gras)', legs: 'var(--color-prot)', shoulders: 'var(--color-carb)', arms: '#EF4444', core: 'var(--color-primary)' };
                                  return muscles.length > 0 ? (
                                    <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                                      {muscles.map(m => {
                                        const col = muscleColors[m?.toLowerCase()] || 'var(--text-muted)';
                                        return <span key={m} style={{ fontSize: "0.5rem", fontWeight: 800, padding: "0.1rem 0.4rem", borderRadius: "999px", background: `${col}18`, color: col, border: `1px solid ${col}30` }}>{m}</span>;
                                      })}
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                              <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={(e) => { e.stopPropagation(); startSession(r.ejercicios, r.id, r.name); }}
                                style={{
                                  flexShrink: 0, padding: "0.4rem 0.7rem", borderRadius: "10px",
                                  background: "rgba(0,201,255,0.12)", border: "1px solid rgba(0,201,255,0.3)",
                                  color: "var(--color-primary)", fontWeight: 900, fontSize: "0.62rem", cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: "0.3rem",
                                }}
                              >▶</motion.button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuMeta(prev =>
                                    prev?.id === r.id
                                      ? null
                                      : { id: r.id, x: rect.right, y: rect.bottom + 4, type: 'rutina', data: r }
                                  );
                                }}
                                className="btn-icon-elite"
                                style={{ width: "32px", height: "32px", flexShrink: 0,
                                  background: menuMeta?.id === r.id ? "rgba(0,201,255,0.15)" : undefined }}
                              >
                                <MoreVertical size={16} />
                              </button>
                            </div>
                          );
                        })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : activeTab === "sports" ? (
            /* ── Vista deportes ── */
            <SportsView perfil={perfil} />
          ) : (
            /* ── Vista historial ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {historyLoading ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                  <Loader size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 0.5rem" }} />
                  <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>{t('loading')}</div>
                </div>
              ) : historyData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)" }}>
                  <History size={48} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                    {lang === 'es' ? 'Sin sesiones aún' : 'No sessions yet'}
                  </div>
                  <div style={{ fontSize: "0.78rem", marginTop: "0.25rem", opacity: 0.6 }}>
                    {lang === 'es' ? 'Completá un entrenamiento para verlo acá' : 'Complete a workout to see it here'}
                  </div>
                </div>
              ) : (
                historyData.map((session, idx) => {
                  const date = new Date(session.timestamp + "Z");
                  const dateStr = date.toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                  const expGained = Math.round(Number(session.exp_gained) || 0);
                  const currentRating = Number(session.rating) || 0;
                  const isGym = session.kind === "gym";
                  const isSport = session.kind === "sport";

                  // Gym-specific
                  const durationMin = isGym && session.duration_seconds ? Math.round(session.duration_seconds / 60) : null;
                  const desc = session.description || '';
                  const volMatch = desc.match(/Volumen:\s*([\d.]+)kg/);
                  const volumen = isGym ? (volMatch ? volMatch[1] : null) : null;

                  // Sport-specific (uses SVG icons now)

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.12 }}
                      style={{
                        background: "var(--surface-1)",
                        border: `1px solid ${isSport ? "rgba(249,115,22,0.12)" : "var(--surface-2)"}`,
                        borderRadius: "16px",
                        padding: "0.85rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      {/* Left icon */}
                      <div style={{
                        width: "38px", height: "38px", borderRadius: "12px", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isGym ? "rgba(0,201,255,0.1)" : "rgba(249,115,22,0.1)",
                        border: `1px solid ${isGym ? "rgba(0,201,255,0.15)" : "rgba(249,115,22,0.2)"}`,
                      }}>
                        {isSport ? <SportIcon name={session.sport_name} size={18} /> : <Dumbbell size={18} color="var(--color-primary)" />}
                      </div>

                      {/* Center info */}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "capitalize" }}>{dateStr}</span>
                          {isGym && session.routine_name && (
                            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--color-primary)", background: "rgba(0,201,255,0.1)", padding: "0.1rem 0.4rem", borderRadius: "6px" }}>
                              {session.routine_name}
                            </span>
                          )}
                          {isSport && (
                            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.1)", padding: "0.1rem 0.4rem", borderRadius: "6px" }}>
                              {session.sport_name}
                            </span>
                          )}
                        </div>

                        {/* Stats */}
                        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", flexWrap: "wrap" }}>
                          {isGym && durationMin != null && (
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <Timer size={11} color="#f59e0b" /> {durationMin}min
                            </span>
                          )}
                          {isSport && (
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <Timer size={11} color="#f59e0b" /> {Math.round(session.duracion_min)}min
                            </span>
                          )}
                          {volumen && (
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <Dumbbell size={11} color="var(--color-primary)" /> {volumen}kg
                            </span>
                          )}
                          {isSport && session.calorias > 0 && (
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <Flame size={11} color="#f97316" /> {session.calorias}kcal
                            </span>
                          )}
                          {isSport && session.intensidad > 0 && (
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <Zap size={11} color="#eab308" /> {session.intensidad}/10
                            </span>
                          )}
                          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#a78bfa", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                            <Zap size={11} /> +{expGained}
                          </span>
                        </div>

                        {/* Star rating */}
                        <div style={{ display: "flex", gap: "0.15rem", marginTop: "0.1rem" }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={async () => {
                                const newRating = currentRating === star ? 0 : star;
                                await authFetch(`${API}/api/gym/history/${session.id}/rating`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ perfil, rating: newRating }),
                                });
                                setHistoryData(prev => prev.map(s => s.id === session.id ? { ...s, rating: newRating } : s));
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "0.05rem" }}
                            >
                              <Star
                                size={15}
                                color={star <= currentRating ? "#f59e0b" : "var(--surface-3)"}
                                fill={star <= currentRating ? "#f59e0b" : "none"}
                                style={{ transition: "all 0.15s" }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={async () => {
                          if (!confirm(lang === 'es' ? '¿Eliminar esta sesión?' : 'Delete this session?')) return;
                          await authFetch(`${API}/api/gym/historial/${session.id}?perfil=${perfil}`, { method: 'DELETE' });
                          loadHistory();
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem", flexShrink: 0 }}
                      >
                        <Trash2 size={14} color="var(--text-muted)" />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════ MODALES ══════════ */}

      {/* Selector de ejercicios */}
      {showSelector && (
        <ExerciseSelectorView
          exercises={ejerciciosMaster}
          builderExercises={builderExercises}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategoryDeferred}
          filterMuscle={filterMuscle}
          setFilterMuscle={setFilterMuscleDeferred}
          filterEquipment={filterEquipment}
          setFilterEquipment={setFilterEquipmentDeferred}
          filterPending={filterPending || false}
          onAdd={(ej) => {
            setBuilderExercises((p) => {
              const next = [
                ...p,
                {
                  ...ej,
                  id_ejercicio: ej.id_ejercicio,
                  sets_data: [{ type: "normal", reps: "10", weight: "" }],
                  notes: "",
                  rest_seconds: 60,
                },
              ];
              // Auto-expandir la nueva card
              setExpandedCardIdx(next.length - 1);
              return next;
            });
          }}
          onRemove={(ej) =>
            setBuilderExercises((p) =>
              p.filter(
                (x) =>
                  String(x.id_ejercicio || x.id) !==
                  String(ej.id_ejercicio || ej.id),
              ),
            )
          }
          onDone={() => setShowSelector(false)}
          isMobile={isMobile}
        />
      )}

      {/* Modal crear carpeta */}
      {showFolderModal && (
        <FolderModal
          onCancel={() => setShowFolderModal(false)}
          onCreate={handleCreateFolder}
        />
      )}

      {/* Modal resumen muscular */}
      {showSummaryModal && (
        <SummaryModal
          exercises={builderExercises}
          onClose={() => setShowSummaryModal(false)}
        />
      )}

      {/* ─── Dropdown Portal (fixed, escapa overflow:hidden) ─── */}
      {menuMeta && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: Math.min(menuMeta.y, window.innerHeight - 180),
            left: Math.max(4, menuMeta.x - 185),
            background: "var(--surface-2)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "14px",
            padding: "0.4rem",
            zIndex: 99999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
            minWidth: "180px",
          }}
        >
          {menuMeta.type === "rutina" && (() => {
            const r = menuMeta.data;
            const btnStyle = {
              display: "flex", alignItems: "center", gap: "0.7rem",
              width: "100%", padding: "0.65rem 0.85rem",
              background: "none", border: "none", color: "var(--text-primary)",
              fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
              borderRadius: "10px", textAlign: "left",
            };
            return (
              <>
                <button style={btnStyle} onClick={() => {
                  setEditingId(r.id); setRoutineName(r.name);
                  setBuilderExercises(Array.isArray(r.ejercicios) ? r.ejercicios : []);
                  setSelectedFolderId(r.folder_id || null);
                  setIsCreating(true); setMenuMeta(null);
                }}>
                  <Edit2 size={15} color="var(--color-primary)" /> Editar rutina
                </button>
                <button style={btnStyle} onClick={() => { handleDuplicateRoutine(r); setMenuMeta(null); }}>
                  <Copy size={15} color="var(--text-secondary)" /> Duplicar rutina
                </button>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "0.3rem 0" }} />
                <button style={{ ...btnStyle, color: "#f87171" }} onClick={() => {
                  if (confirm("¿Eliminar esta rutina?")) { handleDeleteRoutine(r.id); setMenuMeta(null); }
                }}>
                  <Trash2 size={15} color="#f87171" /> Eliminar rutina
                </button>
              </>
            );
          })()}

          {menuMeta.type === "carpeta" && (() => {
            const f = menuMeta.data;
            const btnStyle = {
              display: "flex", alignItems: "center", gap: "0.7rem",
              width: "100%", padding: "0.65rem 0.85rem",
              background: "none", border: "none", color: "var(--text-primary)",
              fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
              borderRadius: "10px", textAlign: "left",
            };
            return (
              <>
                <button style={btnStyle} onClick={() => {
                  const nombre = prompt("Nuevo nombre de carpeta:", f.name);
                  if (nombre && nombre.trim()) {
                    authFetch(`${API}/api/gym/folders/${f.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: nombre.trim() }),
                    }).then(() => fetchRoutines());
                  }
                  setMenuMeta(null);
                }}>
                  <Edit2 size={15} color="var(--color-primary)" /> Renombrar carpeta
                </button>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "0.3rem 0" }} />
                <button style={{ ...btnStyle, color: "#f87171" }} onClick={() => {
                  if (confirm(`¿Eliminar la carpeta "${f.name}"? Las rutinas no se borrarán.`)) {
                    authFetch(`${API}/api/gym/folders/${f.id}`, { method: "DELETE" })
                      .then(() => fetchRoutines());
                  }
                  setMenuMeta(null);
                }}>
                  <Trash2 size={15} color="#f87171" /> Eliminar carpeta
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
