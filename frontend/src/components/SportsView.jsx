import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, X, Flame, Clock, Zap, Trophy, ChevronDown,
  Trash2, Activity, Timer, HelpCircle, Star, Calendar,
} from "lucide-react";
import {
  MdSportsSoccer, MdSportsTennis, MdSportsBasketball, MdSportsRugby,
  MdSportsGolf, MdSportsVolleyball, MdSportsHockey,
  MdPool, MdDirectionsRun, MdDirectionsBike, MdSurfing,
  MdSelfImprovement, MdFitnessCenter, MdHiking,
  MdKayaking, MdDownhillSkiing, MdSportsMartialArts,
  MdIceSkating, MdDirectionsWalk, MdSportsHandball,
} from "react-icons/md";
import { GiBoxingGlove, GiMountainClimbing } from "react-icons/gi";
import { API, authFetch } from "../config";
import { useLanguage } from "../LanguageContext";
import MiniCalendar from "./MiniCalendar";

// ── SVG Sport Icon Map ──
const SPORT_ICON_MAP = {
  "natación": MdPool, "natacion": MdPool, "swimming": MdPool,
  "fútbol": MdSportsSoccer, "futbol": MdSportsSoccer, "soccer": MdSportsSoccer,
  "rugby": MdSportsRugby,
  "básquet": MdSportsBasketball, "basquet": MdSportsBasketball, "basketball": MdSportsBasketball,
  "tenis": MdSportsTennis, "tennis": MdSportsTennis,
  "pádel": MdSportsTennis, "padel": MdSportsTennis,
  "ciclismo": MdDirectionsBike, "cycling": MdDirectionsBike, "bicicleta": MdDirectionsBike,
  "correr": MdDirectionsRun, "running": MdDirectionsRun,
  "caminar": MdDirectionsWalk, "walking": MdDirectionsWalk,
  "boxeo": GiBoxingGlove, "boxing": GiBoxingGlove,
  "yoga": MdSelfImprovement,
  "crossfit": MdFitnessCenter,
  "escalada": GiMountainClimbing, "climbing": GiMountainClimbing,
  "surf": MdSurfing,
  "bailar": MdSportsHandball, "dance": MdSportsHandball, "baile": MdSportsHandball,
  "senderismo": MdHiking, "hiking": MdHiking, "trekking": MdHiking,
  "hockey": MdSportsHockey,
  "voley": MdSportsVolleyball, "vóley": MdSportsVolleyball, "volleyball": MdSportsVolleyball,
  "golf": MdSportsGolf,
  "artes marciales": MdSportsMartialArts,
  "patinaje": MdIceSkating,
  "remo": MdKayaking, "kayak": MdKayaking,
  "esquí": MdDownhillSkiing, "esqui": MdDownhillSkiing,
  "ping pong": MdSportsTennis,
};

const SPORT_COLOR_MAP = {
  "fútbol": "#22c55e", "futbol": "#22c55e",
  "natación": "#06b6d4", "natacion": "#06b6d4",
  "correr": "#f97316", "ciclismo": "#eab308",
  "tenis": "#a3e635", "básquet": "#f97316", "basquet": "#f97316",
  "boxeo": "#ef4444", "rugby": "#8b5cf6", "yoga": "#a78bfa",
  "pádel": "#14b8a6", "padel": "#14b8a6", "crossfit": "#f43f5e",
  "caminar": "#64748b", "hockey": "#38bdf8", "voley": "#facc15",
  "surf": "#22d3ee", "escalada": "#a3a3a3", "senderismo": "#84cc16",
  "bailar": "#e879f9", "artes marciales": "#dc2626", "patinaje": "#7dd3fc",
  "remo": "#0ea5e9", "esquí": "#e0f2fe", "golf": "#16a34a", "ping pong": "#fb923c",
};

function SportIcon({ name, size = 22, color }) {
  const lower = (name || "").toLowerCase();
  const Comp = SPORT_ICON_MAP[lower] || Activity;
  const c = color || SPORT_COLOR_MAP[lower] || "#06b6d4";
  return <Comp size={size} color={c} />;
}

const QUICK_SPORTS = [
  { name: "Fútbol", color: "#22c55e" },
  { name: "Natación", color: "#06b6d4" },
  { name: "Correr", color: "#f97316" },
  { name: "Ciclismo", color: "#eab308" },
  { name: "Tenis", color: "#a3e635" },
  { name: "Básquet", color: "#f97316" },
  { name: "Boxeo", color: "#ef4444" },
  { name: "Rugby", color: "#8b5cf6" },
  { name: "Yoga", color: "#a78bfa" },
  { name: "Pádel", color: "#14b8a6" },
  { name: "CrossFit", color: "#f43f5e" },
  { name: "Caminar", color: "#64748b" },
  { name: "Hockey", color: "#38bdf8" },
  { name: "Voley", color: "#facc15" },
  { name: "Surf", color: "#22d3ee" },
  { name: "Escalada", color: "#a3a3a3" },
  { name: "Senderismo", color: "#84cc16" },
  { name: "Bailar", color: "#e879f9" },
  { name: "Artes Marciales", color: "#dc2626" },
  { name: "Patinaje", color: "#7dd3fc" },
  { name: "Remo", color: "#0ea5e9" },
  { name: "Esquí", color: "#e0f2fe" },
  { name: "Golf", color: "#16a34a" },
  { name: "Ping Pong", color: "#fb923c" },
];

export { SportIcon, SPORT_ICON_MAP, SPORT_COLOR_MAP };

const INTENSITY_LABELS = {
  es: ["", "Muy suave", "Suave", "Ligero", "Moderado", "Medio", "Intenso", "Fuerte", "Muy fuerte", "Máximo", "Extremo"],
  en: ["", "Very easy", "Easy", "Light", "Moderate", "Medium", "Intense", "Hard", "Very hard", "Max", "Extreme"],
};

function getIconForSport(name) {
  return (props) => <SportIcon name={name} {...props} />;
}

function intensityColor(n) {
  if (n <= 3) return "#22c55e";
  if (n <= 6) return "#eab308";
  if (n <= 8) return "#f97316";
  return "#ef4444";
}

export default function SportsView({ perfil }) {
  const { lang, t } = useLanguage();
  const [sports, setSports] = useState([]);
  const [history, setHistory] = useState([]);
  const [showAddSport, setShowAddSport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState("⚡");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSession, setShowSession] = useState(null);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState(5);
  const [sessionResult, setSessionResult] = useState(null);
  const [resultRating, setResultRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingDateId, setEditingDateId] = useState(null);
  const [showAllSports, setShowAllSports] = useState(false);

  const loadSports = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/api/gym/sports?perfil=${perfil}`);
      const data = await res.json();
      if (data.status === "success") setSports(data.sports || []);
    } catch (e) { console.error(e); }
  }, [perfil]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/api/gym/sports/history?perfil=${perfil}`);
      const data = await res.json();
      if (data.status === "success") setHistory(data.sessions || []);
    } catch (e) { console.error(e); }
  }, [perfil]);

  useEffect(() => { loadSports(); loadHistory(); }, [loadSports, loadHistory]);

  const addSport = async (name, icon, color) => {
    try {
      const res = await authFetch(`${API}/api/gym/sports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil, name, icon, color }),
      });
      const data = await res.json();
      if (data.status === "success") {
        loadSports();
        setShowAddSport(false);
        setCustomName("");
      }
    } catch (e) { console.error(e); }
  };

  const deleteSport = async (id) => {
    try {
      await authFetch(`${API}/api/gym/sports/${id}`, { method: "DELETE" });
      loadSports();
    } catch (e) { console.error(e); }
  };

  const deleteHistoryItem = async (id) => {
    try {
      await authFetch(`${API}/api/gym/historial/${id}?perfil=${perfil}`, { method: "DELETE" });
      loadHistory();
    } catch (e) { console.error(e); }
  };

  const updateTimestamp = async (id, newDate) => {
    try {
      await authFetch(`${API}/api/gym/history/${id}/timestamp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil, timestamp: newDate }),
      });
      setHistory(prev => prev.map(s => s.id === id ? { ...s, timestamp: newDate } : s));
      setEditingDateId(null);
    } catch (e) { console.error(e); }
  };

  const logSession = async () => {
    if (!showSession) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/gym/sports/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfil,
          sport_name: showSession.name,
          duracion_min: duration,
          intensidad: intensity,
          sport_id: showSession.id || null,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setSessionResult(data);
        setResultRating(0);
        loadHistory();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveResultRating = async (star) => {
    const newRating = resultRating === star ? 0 : star;
    setResultRating(newRating);
    if (sessionResult?.session_id) {
      try {
        await authFetch(`${API}/api/gym/history/${sessionResult.session_id}/rating`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perfil, rating: newRating }),
        });
      } catch (e) { console.error(e); }
    }
  };

  const mySportNames = sports.map(s => s.name.toLowerCase());
  const availableQuick = QUICK_SPORTS.filter(qs => !mySportNames.includes(qs.name.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Mis deportes header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <h3 style={{ margin: 0, fontWeight: 900, color: "#fff", fontSize: "0.9rem" }}>
              {t('my_sports')}
            </h3>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowHelp(p => !p)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0.15rem" }}
            >
              <HelpCircle size={14} color="#475569" />
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddSport(p => !p)}
            style={{
              background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)",
              borderRadius: "10px", padding: "0.35rem 0.65rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.3rem",
              fontSize: "0.7rem", fontWeight: 800, color: "#06b6d4",
            }}
          >
            <Plus size={13} /> {lang === "es" ? "Agregar" : "Add"}
          </motion.button>
        </div>

        {/* Help tooltip */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ overflow: "hidden", marginBottom: "0.5rem" }}
            >
              <div style={{
                background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)",
                borderRadius: "12px", padding: "0.65rem 0.8rem",
                fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, lineHeight: 1.5, whiteSpace: "pre-line",
              }}>
                {lang === "es"
                  ? "1. Agregá deportes con el botón + Agregar\n2. Tocá un deporte para registrar una sesión\n3. Elegí duración e intensidad, y listo"
                  : "1. Add sports with the + Add button\n2. Tap a sport to log a session\n3. Pick duration & intensity, done"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {sports.length === 0 && !showAddSport ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              textAlign: "center", padding: "2rem 1rem",
              background: "rgba(255,255,255,0.02)", borderRadius: "16px",
              border: "1px dashed rgba(255,255,255,0.1)",
            }}
          >
            <Activity size={32} color="#475569" style={{ marginBottom: "0.5rem" }} />
            <div style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>
              {lang === "es" ? "Agregá un deporte para empezar" : "Add a sport to get started"}
            </div>
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {sports.map((sport, i) => {
              const lastSession = history.find(h => h.sport_name?.toLowerCase() === sport.name?.toLowerCase());
              const color = sport.color || "#06b6d4";
              return (
                <motion.div
                  key={sport.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setShowSession(sport); setSessionResult(null); setDuration(30); setIntensity(5); setResultRating(0); }}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "16px", padding: "0.9rem 1rem",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  <motion.div
                    whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
                    style={{
                      width: "38px", height: "38px", borderRadius: "12px",
                      background: `${color}18`, border: `1px solid ${color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <SportIcon name={sport.name} size={22} color={color} />
                  </motion.div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: "1rem", color: "#fff" }}>{sport.name}</div>
                    {lastSession ? (
                      <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600, marginTop: "0.15rem" }}>
                        {Math.round(lastSession.calorias)} kcal · {Math.round(lastSession.duracion_min)}min · {new Date(lastSession.timestamp + "Z").toLocaleDateString(lang === "es" ? "es-AR" : "en-US", { day: "numeric", month: "short" })}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 600, marginTop: "0.15rem" }}>
                        {t('tap_to_log')}
                      </div>
                    )}
                  </div>
                  <Flame size={16} color={color} style={{ opacity: 0.5, flexShrink: 0 }} />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agregar deporte — panel desplegable */}
      <AnimatePresence>
        {showAddSport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)", padding: "0.85rem",
            }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 900, color: "#475569", marginBottom: "0.5rem", letterSpacing: "0.5px" }}>
                {t('popular_sports')}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
                {(showAllSports ? availableQuick : availableQuick.slice(0, 8)).map(qs => (
                  <motion.button
                    key={qs.name}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => addSport(qs.name, "", qs.color)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.3rem",
                      padding: "0.35rem 0.55rem", borderRadius: "10px",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer", fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8",
                    }}
                  >
                    <SportIcon name={qs.name} size={16} color={qs.color} /> {qs.name}
                  </motion.button>
                ))}
              </div>
              {availableQuick.length > 8 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllSports(p => !p)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "0.6rem", fontWeight: 800, color: "#06b6d4",
                    padding: "0.2rem 0", marginBottom: "0.5rem",
                  }}
                >
                  {showAllSports ? t('show_less') : t('show_all', availableQuick.length)}
                </motion.button>
              )}

              <div style={{ fontSize: "0.65rem", fontWeight: 900, color: "#475569", marginBottom: "0.4rem", letterSpacing: "0.5px" }}>
                {t('create_custom')}
              </div>
              <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                <div
                  style={{
                    width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                    background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Zap size={18} color="#06b6d4" />
                </div>
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder={t('sport_placeholder')}
                  className="premium-input"
                  style={{
                    flex: 1, padding: "0.5rem 0.7rem", borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0", fontSize: "0.75rem", fontWeight: 600, outline: "none",
                  }}
                  onKeyDown={e => { if (e.key === "Enter" && customName.trim()) { addSport(customName.trim(), customIcon, "#06b6d4"); setCustomIcon("⚡"); } }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={!customName.trim()}
                  onClick={() => { if (customName.trim()) { addSport(customName.trim(), customIcon, "#06b6d4"); setCustomIcon("⚡"); } }}
                  style={{
                    padding: "0.5rem 0.7rem", borderRadius: "10px",
                    background: customName.trim() ? "#06b6d4" : "rgba(255,255,255,0.05)",
                    border: "none", cursor: customName.trim() ? "pointer" : "not-allowed",
                    color: customName.trim() ? "#000" : "#475569", fontWeight: 900, fontSize: "0.75rem",
                  }}
                >
                  <Plus size={15} />
                </motion.button>
              </div>
              {sports.length > 0 && (
                <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.6rem" }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#475569", marginBottom: "0.4rem" }}>
                    {t('my_sports_list')}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {sports.map(s => (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.35rem 0.5rem", borderRadius: "8px",
                        background: "rgba(255,255,255,0.02)",
                      }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#e2e8f0", fontWeight: 700 }}>
                          <SportIcon name={s.name} size={16} color={s.color} /> {s.name}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteSport(s.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem" }}
                        >
                          <Trash2 size={13} color="#ef4444" />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal registrar sesión */}
      <AnimatePresence mode="wait">
        {showSession && (
          <motion.div
            key="session-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed", inset: 0, zIndex: 30000,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
            }}
            onClick={e => { if (e.target === e.currentTarget) { setShowSession(null); setSessionResult(null); } }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              key="session-sheet"
              style={{
                background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "24px 24px 0 0", padding: "1.5rem",
                width: "min(100vw, 480px)", maxHeight: "85vh", overflowY: "auto",
                display: "flex", flexDirection: "column", gap: "1rem",
              }}
              className="no-scrollbar"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "99px" }} />
                <button
                  onClick={() => { setShowSession(null); setSessionResult(null); }}
                  style={{
                    position: "absolute", right: 0, top: "-0.25rem",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px", width: 28, height: 28, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#94a3b8", fontSize: "1rem", lineHeight: 1, padding: 0,
                  }}
                  aria-label="Cerrar"
                >✕</button>
              </div>

              {sessionResult ? (
                /* ═══ Resultado con animaciones ═══ */
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ textAlign: "center", padding: "0.5rem 0" }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                    style={{ marginBottom: "0.3rem", display: "flex", justifyContent: "center" }}
                  >
                    <span style={{ fontSize: "3rem", lineHeight: 1 }}>{showSession.icon || "⚡"}</span>
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{ margin: "0 0 0.75rem", fontWeight: 900, color: "#fff", fontSize: "1.2rem" }}
                  >
                    {lang === "es" ? "¡Sesión registrada!" : "Session logged!"}
                  </motion.h3>

                  <div style={{ display: "flex", justifyContent: "center", gap: "1rem", margin: "0.5rem 0 1rem" }}>
                    {[
                      { val: sessionResult.calorias, label: "KCAL", color: "#f97316", icon: <Flame size={15} />, delay: 0.25 },
                      { val: `+${sessionResult.exp_ganada}`, label: "EXP", color: "#06b6d4", icon: <Zap size={15} />, delay: 0.35 },
                      { val: `${sessionResult.duracion_min}'`, label: "MIN", color: "#a78bfa", icon: <Timer size={15} />, delay: 0.45 },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: stat.delay, type: "spring", stiffness: 300, damping: 20 }}
                        style={{
                          textAlign: "center", padding: "0.6rem 0.8rem", borderRadius: "14px",
                          background: `${stat.color}10`, border: `1px solid ${stat.color}25`,
                          minWidth: "70px",
                        }}
                      >
                        <div style={{ fontSize: "1.3rem", fontWeight: 900, color: stat.color, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2rem" }}>
                          {stat.icon} {stat.val}
                        </div>
                        <div style={{ fontSize: "0.55rem", color: "#64748b", fontWeight: 800, marginTop: "0.2rem" }}>{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Star rating */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{ marginBottom: "0.75rem" }}
                  >
                    <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#475569", marginBottom: "0.4rem" }}>
                      {lang === "es" ? "¿CÓMO TE SENTISTE?" : "HOW DID IT FEEL?"}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "0.3rem" }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <motion.button
                          key={star}
                          whileTap={{ scale: 1.3 }}
                          onClick={() => saveResultRating(star)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.15rem" }}
                        >
                          <Star
                            size={24}
                            color={star <= resultRating ? "#f59e0b" : "#334155"}
                            fill={star <= resultRating ? "#f59e0b" : "none"}
                            style={{ transition: "all 0.15s" }}
                          />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  <div style={{ fontSize: "0.62rem", color: "#334155", marginBottom: "0.75rem" }}>
                    MET {sessionResult.met_base} → {sessionResult.met_ajustado} · int. {sessionResult.intensidad}/10
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 }}
                    onClick={() => { setShowSession(null); setSessionResult(null); }}
                    style={{
                      background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                      color: "#000", border: "none", borderRadius: "14px",
                      padding: "0.85rem", fontWeight: 900, fontSize: "0.9rem",
                      cursor: "pointer", width: "100%",
                    }}
                  >
                    {lang === "es" ? "Listo" : "Done"}
                  </motion.button>
                </motion.div>
              ) : (
                /* ═══ Formulario ═══ */
                <>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    style={{ textAlign: "center" }}
                  >
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      style={{ marginBottom: "0.2rem", display: "flex", justifyContent: "center" }}
                    >
                      <SportIcon name={showSession.name} size={48} color={showSession.color || "#06b6d4"} />
                    </motion.div>
                    <h3 style={{ margin: 0, fontWeight: 900, color: "#fff", fontSize: "1.15rem" }}>
                      {showSession.name}
                    </h3>
                  </motion.div>

                  {/* Duración */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.5rem" }}>
                      <Clock size={13} color="#06b6d4" />
                      <span style={{ fontSize: "0.65rem", fontWeight: 900, color: "#94a3b8" }}>
                        {lang === "es" ? "DURACIÓN" : "DURATION"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      {[15, 30, 45, 60, 90, 120].map(min => (
                        <motion.button
                          key={min}
                          whileTap={{ scale: 0.92 }}
                          animate={duration === min ? { scale: [1, 1.05, 1] } : {}}
                          onClick={() => setDuration(min)}
                          style={{
                            padding: "0.45rem 0.75rem", borderRadius: "10px",
                            fontSize: "0.72rem", fontWeight: 800, cursor: "pointer",
                            border: "1px solid",
                            background: duration === min ? "rgba(6,182,212,0.18)" : "rgba(255,255,255,0.03)",
                            borderColor: duration === min ? "#06b6d4" : "rgba(255,255,255,0.07)",
                            color: duration === min ? "#06b6d4" : "#64748b",
                            transition: "all 0.15s",
                          }}
                        >
                          {min}'
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Intensidad — improved visual */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Zap size={13} color="#f97316" />
                        <span style={{ fontSize: "0.65rem", fontWeight: 900, color: "#94a3b8" }}>
                          {lang === "es" ? "INTENSIDAD" : "INTENSITY"}
                        </span>
                      </div>
                      <motion.span
                        key={intensity}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ fontSize: "0.65rem", fontWeight: 900, color: intensityColor(intensity) }}
                      >
                        {intensity}/10 — {(INTENSITY_LABELS[lang] || INTENSITY_LABELS.es)[intensity]}
                      </motion.span>
                    </div>
                    {/* Visual bar */}
                    <div style={{
                      position: "relative", height: "32px", borderRadius: "10px",
                      background: "rgba(255,255,255,0.03)", overflow: "hidden",
                      display: "flex", gap: "2px", padding: "3px",
                    }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <motion.button
                          key={n}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setIntensity(n)}
                          style={{
                            flex: 1, borderRadius: "7px", cursor: "pointer",
                            border: "none", position: "relative",
                            background: n <= intensity
                              ? `${intensityColor(n)}${Math.round(25 + (n / 10) * 35).toString(16)}`
                              : "rgba(255,255,255,0.02)",
                            transition: "all 0.15s",
                          }}
                        >
                          {n === intensity && (
                            <motion.div
                              layoutId="intensity-dot"
                              style={{
                                position: "absolute", inset: "2px", borderRadius: "6px",
                                border: `2px solid ${intensityColor(n)}`,
                              }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          )}
                          <span style={{
                            fontSize: "0.6rem", fontWeight: 900, position: "relative", zIndex: 1,
                            color: n <= intensity ? intensityColor(n) : "#334155",
                          }}>{n}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* CTA */}
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={loading}
                    onClick={logSession}
                    style={{
                      background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                      color: "#000", border: "none", borderRadius: "16px",
                      padding: "1rem", fontWeight: 900, fontSize: "0.95rem",
                      cursor: loading ? "wait" : "pointer", width: "100%",
                      opacity: loading ? 0.7 : 1,
                      marginBottom: "env(safe-area-inset-bottom, 8px)",
                    }}
                  >
                    {loading
                      ? (lang === "es" ? "Registrando..." : "Logging...")
                      : (lang === "es" ? `Registrar ${duration} min` : `Log ${duration} min`)}
                  </motion.button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historial reciente */}
      {history.length > 0 && (
        <div>
          <h3 style={{ margin: "0 0 0.5rem", fontWeight: 900, color: "#fff", fontSize: "0.85rem" }}>
            {t('history')}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {history.slice(0, 15).map((s, i) => {
              const icon = getIconForSport(s.sport_name);
              const date = new Date(s.timestamp + "Z");
              const dateStr = date.toLocaleDateString(lang === "es" ? "es-AR" : "en-US", { weekday: "short", day: "numeric", month: "short" });
              const isEditingDate = editingDateId === s.id;
              const isoDate = date.toISOString().slice(0, 10);
              return (
                <motion.div
                  key={s.id || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.65rem",
                    padding: "0.6rem 0.7rem", borderRadius: "12px",
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span style={{ flexShrink: 0, lineHeight: 1, display: "flex", alignItems: "center" }}><SportIcon name={s.sport_name} size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ fontWeight: 800, color: "#e2e8f0", fontSize: "0.78rem" }}>{s.sport_name}</span>
                      <span style={{
                        fontSize: "0.55rem", fontWeight: 700, color: intensityColor(Math.round(s.intensidad)),
                        background: `${intensityColor(Math.round(s.intensidad))}15`,
                        padding: "0.08rem 0.3rem", borderRadius: "4px",
                      }}>
                        {Math.round(s.intensidad)}/10
                      </span>
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "#475569", fontWeight: 600, marginTop: "0.1rem", display: "flex", alignItems: "center", gap: "0.3rem", position: "relative" }}>
                      <motion.span
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); setEditingDateId(isEditingDate ? null : s.id); }}
                        style={{
                          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem",
                          background: isEditingDate ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.03)",
                          padding: "0.1rem 0.35rem",
                          borderRadius: "6px", border: isEditingDate ? "1px solid rgba(6,182,212,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          transition: "all 0.15s",
                        }}
                        title={lang === "es" ? "Tocar para cambiar fecha" : "Tap to change date"}
                      >
                        <Calendar size={9} color="#06b6d4" /> {dateStr}
                      </motion.span>
                      <AnimatePresence>
                        {isEditingDate && (
                          <MiniCalendar
                            selectedDate={s.timestamp}
                            lang={lang}
                            onClose={() => setEditingDateId(null)}
                            onSelect={(newDate) => {
                              const newTs = newDate + "T" + date.toISOString().slice(11, 19);
                              updateTimestamp(s.id, newTs);
                            }}
                          />
                        )}
                      </AnimatePresence>
                      <span> · {Math.round(s.duracion_min)}min</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#f97316" }}>
                      {Math.round(s.calorias)} kcal
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => {
                        if (confirm(lang === "es" ? "¿Eliminar esta sesión?" : "Delete this session?")) deleteHistoryItem(s.id); // confirm no usa t() por ser nativo del browser
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0.15rem" }}
                    >
                      <Trash2 size={13} color="#334155" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
