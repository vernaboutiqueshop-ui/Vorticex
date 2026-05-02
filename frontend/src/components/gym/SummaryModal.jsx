import { motion } from "motion/react";
import { X, Clock } from "lucide-react";
import { useLanguage } from "../../LanguageContext";
import BodyMap, { SLUG_LABELS, MUSCLE_SLUG_MAP } from "../BodyMap";

export default function SummaryModal({ exercises, onClose }) {
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

  // Contar series por músculo
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
            {t('muscle_summary') || (lang === 'es' ? 'Resumen muscular' : 'Muscle summary')}
          </h3>
          <button
            onClick={onClose}
            className="btn-icon-elite"
            style={{ width: "34px", height: "34px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <BodyMap 
            targets={targets} 
            scale={1.2} 
            gender={localStorage.getItem('vortice_body_gender') || 'male'} 
          />
        </motion.div>

        {/* Duración estimada */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            background: "rgba(6,182,212,0.07)",
            border: "1px solid rgba(6,182,212,0.2)",
            borderRadius: "14px",
            padding: "0.85rem 1.1rem",
          }}
        >
          <Clock size={18} color="#06b6d4" />
          <div>
            <div
              style={{
                fontSize: "0.6rem",
                color: "#94a3b8",
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              {t('estimated_duration') || (lang === 'es' ? 'Duración estimada' : 'Estimated duration')}
            </div>
            <div
              style={{ fontWeight: 900, color: "#ffffff", fontSize: "1.05rem" }}
            >
              {estimatedMin} min
            </div>
          </div>
        </div>

        {/* Lista de músculos */}
        {muscleEntries.length > 0 && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 900,
                color: "#06b6d4",
                letterSpacing: "1.5px",
              }}
            >
              {t('muscles_worked') || (lang === 'es' ? 'Músculos trabajados' : 'Muscles worked')}
            </div>
            {muscleEntries.map(([muscle, count], mIdx) => (
              <motion.div
                key={muscle}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + mIdx * 0.08, type: "spring", stiffness: 300, damping: 25 }}
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
                      color: "#e2e8f0",
                      textTransform: "capitalize",
                    }}
                  >
                    {translateMuscle(muscle)}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      color: "#06b6d4",
                    }}
                  >
                    {count} {count === 1 ? (t('set') || 'serie') : (t('sets') || 'series')}
                  </span>
                </div>
                <div
                  style={{
                    height: "5px",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "99px",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxSets) * 100}%` }}
                    transition={{ delay: 0.5 + mIdx * 0.08, duration: 0.6, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, #06b6d4, #0891b2)",
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
}
