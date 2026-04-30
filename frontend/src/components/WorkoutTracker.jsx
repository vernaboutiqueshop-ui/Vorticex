import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Check, Plus, Trash2, ChevronDown, ChevronUp,
  Clock, Flame, Trophy, Minimize2, Maximize2, Timer, RotateCcw, Star
} from "lucide-react";
import { motion } from "motion/react";
import { API, authFetch } from "../config";
import { useLanguage } from "../LanguageContext";

const SET_TYPES = [
  { id: "normal", label: "N", color: "#06b6d4", desc: "Normal" },
  { id: "warmup", label: "C", color: "#f59e0b", desc: "Calentamiento" },
  { id: "dropset", label: "D", color: "#ef4444", desc: "Drop Set" },
  { id: "failure", label: "F", color: "#8b5cf6", desc: "Al fallo" },
];

export default function WorkoutTracker({
  exercises,
  routineId,
  routineName,
  perfil,
  onFinish,
  onCancel,
}) {
  const [sessionExercises, setSessionExercises] = useState([]);
  const [timer, setTimer] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [restTimer, setRestTimer] = useState(null);
  const [restTarget, setRestTarget] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sessionRating, setSessionRating] = useState(0);
  const { t, lang } = useLanguage();
  const [lastWeights, setLastWeights] = useState({});
  const [finishModal, setFinishModal] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(0);
  const [gifDetail, setGifDetail] = useState(null);
  const timerRef = useRef(null);
  const restRef = useRef(null);

  useEffect(() => {
    const ejs = Array.isArray(exercises) ? exercises : [];
    setSessionExercises(
      ejs.map((e) => ({
        ...e,
        id_ejercicio: String(e?.id_ejercicio || e?.id),
        target: e?.target || e?.body_part || "",
        sets: (e?.sets_data || [{ type: "normal", weight: "", reps: "10" }]).map(
          (s) => ({ ...s, done: false, kg: s.weight || "", reps: s.reps || "" })
        ),
      }))
    );
  }, [exercises]);

  useEffect(() => {
    const ids = (exercises || []).map((e) => String(e?.id_ejercicio || e?.id));
    if (ids.length === 0) return;
    authFetch(`${API}/api/gym/historial/pesos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perfil, exercise_ids: ids }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.pesos) setLastWeights(d.pesos); })
      .catch(() => {});
  }, [exercises, perfil]);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (restTimer === null) return;
    if (restTimer <= 0) {
      setRestTimer(null);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      return;
    }
    restRef.current = setTimeout(() => setRestTimer((t) => t - 1), 1000);
    return () => clearTimeout(restRef.current);
  }, [restTimer]);

  const startRest = (seconds) => {
    setRestTarget(seconds);
    setRestTimer(seconds);
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const totalSets = sessionExercises.reduce((a, e) => a + (e.sets?.length || 0), 0);
  const doneSets = sessionExercises.reduce(
    (a, e) => a + (e.sets?.filter((s) => s.done).length || 0), 0
  );
  const totalVolume = sessionExercises.reduce(
    (a, e) =>
      a + e.sets.reduce((b, s) => {
        if (!s.done) return b;
        return b + (parseFloat(s.kg) || 0) * (parseInt(s.reps) || 0);
      }, 0),
    0
  );

  const toggleSetDone = (ejIdx, setIdx) => {
    setSessionExercises((prev) => {
      const nw = prev.map((e, i) =>
        i === ejIdx
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === setIdx ? { ...s, done: !s.done } : s
              ),
            }
          : e
      );
      const set = nw[ejIdx].sets[setIdx];
      if (set.done) {
        const restSec = nw[ejIdx].rest_seconds || 60;
        startRest(restSec);
      }
      return nw;
    });
  };

  const updateSet = (ejIdx, setIdx, field, value) => {
    setSessionExercises((prev) =>
      prev.map((e, i) =>
        i === ejIdx
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === setIdx ? { ...s, [field]: value } : s
              ),
            }
          : e
      )
    );
  };

  const addSet = (ejIdx) => {
    setSessionExercises((prev) =>
      prev.map((e, i) =>
        i === ejIdx
          ? {
              ...e,
              sets: [
                ...e.sets,
                {
                  type: "normal",
                  kg: e.sets[e.sets.length - 1]?.kg || "",
                  reps: e.sets[e.sets.length - 1]?.reps || "",
                  done: false,
                },
              ],
            }
          : e
      )
    );
  };

  const removeSet = (ejIdx, setIdx) => {
    setSessionExercises((prev) =>
      prev.map((e, i) =>
        i === ejIdx
          ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) }
          : e
      )
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const payload = {
        perfil,
        rutina: sessionExercises.map((e) => ({
          id_ejercicio: e.id_ejercicio,
          target: e.target,
          sets: e.sets.map((s) => ({ reps: s.reps, kg: s.kg, done: s.done })),
        })),
        duration_seconds: timer,
        routine_id: routineId || null,
      };
      const res = await authFetch(`${API}/api/gym/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      // Save star rating if user set one
      if (sessionRating > 0 && data.status === "success") {
        try {
          // The session event was just created — get the latest event ID from history
          const hRes = await authFetch(`${API}/api/gym/history?perfil=${perfil}`);
          const hData = await hRes.json();
          if (hData.status === "success" && hData.history?.length > 0) {
            const latestId = hData.history[0].id;
            await authFetch(`${API}/api/gym/history/${latestId}/rating`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ perfil, rating: sessionRating }),
            });
          }
        } catch (e) { console.error("Rating save error:", e); }
      }
      onFinish(data);
    } catch (err) {
      console.error("Error saving session:", err);
      onFinish({ status: "error", error: err.message });
    } finally {
      setSaving(false);
    }
  };

  const progressPct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

  if (minimized) {
    const bubbleSize = 56;
    return (
      <>
        <style>{`
          @keyframes bubbleBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
          @keyframes bubbleGlow { 0%,100%{box-shadow:0 4px 20px rgba(6,182,212,0.3)} 50%{box-shadow:0 4px 28px rgba(6,182,212,0.5)} }
        `}</style>
        <div
          onClick={() => setMinimized(false)}
          style={{
            position: "fixed",
            bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
            right: "0.75rem",
            zIndex: 9000,
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem",
            animation: "bubbleBounce 3s ease-in-out infinite",
          }}
        >
          {/* Progress ring bubble */}
          <div style={{ position: "relative", width: bubbleSize, height: bubbleSize }}>
            <svg width={bubbleSize} height={bubbleSize} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
              <circle cx={bubbleSize/2} cy={bubbleSize/2} r={bubbleSize/2 - 3} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
              <circle cx={bubbleSize/2} cy={bubbleSize/2} r={bubbleSize/2 - 3} fill="none" stroke="#06b6d4" strokeWidth={3}
                strokeDasharray={Math.PI * (bubbleSize - 6)}
                strokeDashoffset={Math.PI * (bubbleSize - 6) * (1 - progressPct / 100)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 3, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(15,23,42,0.95))",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(6,182,212,0.3)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              animation: "bubbleGlow 2s ease-in-out infinite",
            }}>
              <div style={{ fontWeight: 900, fontSize: "0.65rem", color: "#fff", lineHeight: 1 }}>
                {formatTime(timer)}
              </div>
              <div style={{ fontSize: "0.42rem", color: "#06b6d4", fontWeight: 800, marginTop: 1 }}>
                {doneSets}/{totalSets}
              </div>
            </div>
          </div>
          {/* Rest timer badge */}
          {restTimer !== null && (
            <div style={{
              position: "absolute", top: -6, left: -6,
              background: "#ef4444", color: "#fff", fontSize: "0.5rem",
              fontWeight: 900, borderRadius: 99, padding: "1px 5px",
              border: "2px solid #050508", lineHeight: 1.4,
              fontFamily: "monospace",
            }}>{restTimer}s</div>
          )}
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000, background: "#050508",
        display: "flex", flexDirection: "column", overflow: "hidden",
        width: "100vw", maxWidth: "100vw",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          flexShrink: 0, display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "0.75rem 1rem",
          paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))",
          background: "#050508",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setMinimized(true)}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px", width: 36, height: 36, display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <Minimize2 size={16} color="#94a3b8" />
          </button>
          <button
            onClick={() => {
              if (doneSets === 0 || confirm("¿Descartar entrenamiento?")) onCancel();
            }}
            style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "10px", width: 36, height: 36, display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={16} color="#f87171" />
          </button>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontWeight: 900, fontSize: "1.6rem", fontFamily: "monospace",
              color: "#fff", letterSpacing: "-1px", lineHeight: 1,
            }}
          >
            {formatTime(timer)}
          </div>
          <div style={{ fontSize: "0.55rem", color: "#64748b", fontWeight: 700, letterSpacing: "1px" }}>
            {doneSets}/{totalSets} SERIES
          </div>
        </div>

        <button
          onClick={() => setFinishModal(true)}
          disabled={doneSets === 0}
          style={{
            background: doneSets > 0 ? "linear-gradient(135deg, #06b6d4, #0891b2)" : "rgba(255,255,255,0.06)",
            color: doneSets > 0 ? "#000" : "#475569",
            border: "none", borderRadius: "12px", padding: "0.6rem 1.2rem",
            fontWeight: 900, fontSize: "0.85rem", cursor: doneSets > 0 ? "pointer" : "not-allowed",
            boxShadow: doneSets > 0 ? "0 0 15px rgba(6,182,212,0.3)" : "none",
          }}
        >
          FIN
        </button>
      </header>

      {/* PROGRESS BAR */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div
          style={{
            height: "100%", width: `${progressPct}%`,
            background: "linear-gradient(90deg, #06b6d4, #22d3ee)",
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* REST TIMER BANNER */}
      {restTimer !== null && (
        <div
          style={{
            flexShrink: 0, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0.65rem 1rem",
            background: restTimer <= 5 ? "rgba(239,68,68,0.12)" : "rgba(6,182,212,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            transition: "background 0.3s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Timer size={16} color={restTimer <= 5 ? "#f87171" : "#06b6d4"} />
            <span style={{ fontWeight: 800, fontSize: "0.78rem", color: restTimer <= 5 ? "#f87171" : "#06b6d4" }}>
              DESCANSO
            </span>
          </div>
          <div
            style={{
              fontWeight: 900, fontSize: "1.4rem", fontFamily: "monospace",
              color: restTimer <= 5 ? "#f87171" : "#fff",
            }}
          >
            {formatTime(restTimer)}
          </div>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <button
              onClick={() => setRestTimer((t) => Math.max(0, t - 15))}
              style={{
                background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
                width: 32, height: 32, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", color: "#94a3b8",
                fontWeight: 900, fontSize: "0.7rem",
              }}
            >
              -15
            </button>
            <button
              onClick={() => setRestTimer((t) => t + 15)}
              style={{
                background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
                width: 32, height: 32, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", color: "#94a3b8",
                fontWeight: 900, fontSize: "0.7rem",
              }}
            >
              +15
            </button>
            <button
              onClick={() => setRestTimer(null)}
              style={{
                background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 8,
                width: 32, height: 32, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer",
              }}
            >
              <X size={14} color="#f87171" />
            </button>
          </div>
        </div>
      )}

      {/* EXERCISES LIST */}
      <div
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0.75rem" }}
        className="no-scrollbar"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "100%" }}>
          {sessionExercises.map((ej, ejIdx) => {
            const isExpanded = expandedIdx === ejIdx;
            const ejDone = ej.sets.every((s) => s.done);
            const ejSetsCompleted = ej.sets.filter((s) => s.done).length;
            const lastW = lastWeights[ej.id_ejercicio];

            return (
              <div
                key={ejIdx}
                style={{
                  background: ejDone ? "rgba(6,182,212,0.06)" : "rgba(15,23,42,0.95)",
                  border: `1px solid ${ejDone ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "18px",
                  overflow: "hidden",
                  transition: "all 0.2s",
                }}
              >
                {/* Exercise header */}
                <div
                  onClick={() => setExpandedIdx(isExpanded ? null : ejIdx)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.65rem",
                    padding: "0.75rem 0.85rem", cursor: "pointer",
                  }}
                >
                  <img
                    src={ej?.gif_url}
                    onClick={(e) => { e.stopPropagation(); setGifDetail(ej); }}
                    style={{
                      width: 42, height: 42, borderRadius: 10, background: "#fff",
                      objectFit: "cover", flexShrink: 0,
                      opacity: ejDone ? 0.5 : 1,
                      border: "2px solid rgba(6,182,212,0.2)",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <div
                      style={{
                        fontWeight: 800, color: ejDone ? "#06b6d4" : "#fff",
                        fontSize: "0.82rem",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {ejDone && <Check size={13} style={{ marginRight: 3, verticalAlign: -2 }} />}
                      {ej?.nombre_es}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
                      <span style={{ fontSize: "0.6rem", color: "#64748b", fontWeight: 700 }}>
                        {ejSetsCompleted}/{ej.sets.length} series
                      </span>
                      {lastW && (
                        <span
                          style={{
                            fontSize: "0.55rem", color: "#475569", fontWeight: 700,
                            background: "rgba(255,255,255,0.04)", padding: "0.1rem 0.35rem",
                            borderRadius: 4,
                          }}
                        >
                          <RotateCcw size={8} style={{ verticalAlign: -1, marginRight: 2 }} />
                          {lastW.kg}kg x{lastW.reps}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    size={16} color="#475569"
                    style={{
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s", flexShrink: 0,
                    }}
                  />
                </div>

                {/* Expanded sets */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 0.85rem 0.85rem",
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Column headers */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "36px 1fr 1fr 36px",
                        gap: "0.35rem",
                        padding: "0.6rem 0 0.3rem",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: "0.5rem", fontWeight: 900, color: "#475569", textAlign: "center", letterSpacing: "0.5px" }}>
                        SERIE
                      </div>
                      <div style={{ fontSize: "0.5rem", fontWeight: 900, color: "#475569", textAlign: "center", letterSpacing: "0.5px" }}>
                        KG
                      </div>
                      <div style={{ fontSize: "0.5rem", fontWeight: 900, color: "#475569", textAlign: "center", letterSpacing: "0.5px" }}>
                        REPS
                      </div>
                      <div />
                    </div>

                    {/* Set rows */}
                    {ej.sets.map((s, si) => {
                      const typeInfo = SET_TYPES.find((t) => t.id === s.type) || SET_TYPES[0];
                      return (
                        <div
                          key={si}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "36px 1fr 1fr 36px",
                            gap: "0.35rem",
                            alignItems: "center",
                            marginBottom: "0.35rem",
                            opacity: s.done ? 0.45 : 1,
                            transition: "opacity 0.2s",
                          }}
                        >
                          <button
                            onClick={() => {
                              const cur = SET_TYPES.findIndex((t) => t.id === s.type);
                              updateSet(ejIdx, si, "type", SET_TYPES[(cur + 1) % SET_TYPES.length].id);
                            }}
                            style={{
                              height: 38, borderRadius: 10, width: "100%",
                              background: s.done ? "#06b6d4" : typeInfo.color,
                              border: "none", fontWeight: 900, fontSize: "0.8rem",
                              color: "#000", cursor: "pointer",
                            }}
                          >
                            {s.done ? <Check size={14} strokeWidth={4} /> : typeInfo.label}
                          </button>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={s.kg}
                            onChange={(e) => updateSet(ejIdx, si, "kg", e.target.value)}
                            placeholder={lastW?.kg || "0"}
                            className="premium-input"
                            style={{
                              textAlign: "center", height: 38, padding: "0.25rem",
                              fontSize: "0.95rem", fontWeight: 700, width: "100%",
                              boxSizing: "border-box", minWidth: 0,
                              background: s.done ? "rgba(6,182,212,0.08)" : undefined,
                            }}
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            value={s.reps}
                            onChange={(e) => updateSet(ejIdx, si, "reps", e.target.value)}
                            placeholder={lastW?.reps || "10"}
                            className="premium-input"
                            style={{
                              textAlign: "center", height: 38, padding: "0.25rem",
                              fontSize: "0.95rem", fontWeight: 700, width: "100%",
                              boxSizing: "border-box", minWidth: 0,
                              background: s.done ? "rgba(6,182,212,0.08)" : undefined,
                            }}
                          />
                          <button
                            onClick={() => toggleSetDone(ejIdx, si)}
                            style={{
                              height: 38, borderRadius: 10, width: "100%",
                              background: s.done ? "#06b6d4" : "rgba(255,255,255,0.05)",
                              border: s.done ? "none" : "1px solid rgba(255,255,255,0.1)",
                              color: s.done ? "#000" : "#fff",
                              cursor: "pointer", display: "flex",
                              alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Check size={16} strokeWidth={s.done ? 4 : 2} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Add set + delete set */}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                      <button
                        onClick={() => addSet(ejIdx)}
                        style={{
                          flex: 1, padding: "0.6rem", borderRadius: 12,
                          background: "rgba(6,182,212,0.07)",
                          border: "1px dashed rgba(6,182,212,0.3)",
                          color: "#06b6d4", fontWeight: 800, fontSize: "0.78rem",
                          cursor: "pointer", display: "flex", alignItems: "center",
                          justifyContent: "center", gap: "0.3rem",
                        }}
                      >
                        <Plus size={14} /> Serie
                      </button>
                      {ej.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(ejIdx, ej.sets.length - 1)}
                          style={{
                            width: 40, padding: "0.6rem", borderRadius: 12,
                            background: "rgba(239,68,68,0.07)",
                            border: "1px solid rgba(239,68,68,0.15)",
                            cursor: "pointer", display: "flex", alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={14} color="#f87171" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* GIF DETAIL MODAL */}
      {gifDetail && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 30000,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setGifDetail(null); }}
        >
          <div
            style={{
              background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "24px 24px 0 0", padding: "1.5rem",
              width: "min(100vw, 520px)", maxHeight: "80vh",
              overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem",
            }}
            className="animate-in no-scrollbar"
          >
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 99, margin: "0 auto -0.5rem" }} />
            <div style={{ display: "flex", justifyContent: "center", background: "rgba(255,255,255,0.95)", borderRadius: 16, padding: "1rem" }}>
              <img
                src={gifDetail?.gif_url}
                style={{ width: "100%", maxWidth: 240, height: 180, objectFit: "contain" }}
                alt={gifDetail?.nombre_es}
              />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, color: "#fff", fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
                {gifDetail?.nombre_es}
              </h3>
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                {gifDetail?.body_part && (
                  <span style={{
                    background: "rgba(6,182,212,0.15)", color: "#06b6d4", fontSize: "0.6rem",
                    fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: 99, textTransform: "uppercase",
                  }}>{gifDetail.body_part}</span>
                )}
                {gifDetail?.target && (
                  <span style={{
                    background: "rgba(255,255,255,0.07)", color: "#94a3b8", fontSize: "0.6rem",
                    fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: 99, textTransform: "capitalize",
                  }}>{gifDetail.target}</span>
                )}
                {gifDetail?.equipment && (
                  <span style={{
                    background: "rgba(255,255,255,0.07)", color: "#94a3b8", fontSize: "0.6rem",
                    fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: 99, textTransform: "capitalize",
                  }}>{gifDetail.equipment}</span>
                )}
              </div>
            </div>
            {(gifDetail?.instructions || gifDetail?.descripcion) && (
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem" }}>
                {gifDetail.instructions || gifDetail.descripcion}
              </div>
            )}
            <button
              onClick={() => setGifDetail(null)}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14, padding: "0.85rem", color: "#94a3b8",
                fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", width: "100%",
              }}
            >Cerrar</button>
          </div>
        </div>
      )}

      {/* FINISH MODAL */}
      {finishModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 20000,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setFinishModal(false); }}
        >
          <div
            style={{
              background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "24px", padding: "2rem", width: "min(90vw, 380px)",
              display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "center",
            }}
            className="animate-in"
          >
            <div style={{ fontSize: "3rem" }}>
              {progressPct >= 80 ? "🏆" : progressPct >= 50 ? "💪" : "⚡"}
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, color: "#fff", fontSize: "1.3rem" }}>
                {progressPct >= 80 ? "¡Bestia total!" : progressPct >= 50 ? "¡Buen trabajo!" : "¿Terminamos?"}
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                {doneSets} de {totalSets} series · {formatTime(timer)} · {totalVolume.toFixed(0)}kg volumen
              </p>
            </div>

            {/* Star rating */}
            <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>
                {lang === 'es' ? '¿Cómo te sentiste?' : 'How did you feel?'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <motion.button
                    key={star}
                    whileTap={{ scale: 1.3 }}
                    onClick={() => setSessionRating(sessionRating === star ? 0 : star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem' }}
                  >
                    <Star
                      size={28}
                      color={star <= sessionRating ? '#f59e0b' : '#334155'}
                      fill={star <= sessionRating ? '#f59e0b' : 'none'}
                      style={{ transition: 'all 0.15s' }}
                    />
                  </motion.button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.65rem", flexDirection: "column" }}>
              <button
                onClick={handleFinish}
                disabled={saving}
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                  color: "#000", border: "none", borderRadius: "16px",
                  padding: "1rem", fontWeight: 900, fontSize: "1rem",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  boxShadow: "0 0 20px rgba(6,182,212,0.3)",
                }}
              >
                {saving ? t('saving') : (lang === 'es' ? 'Guardar entrenamiento' : 'Save workout')}
              </button>
              <button
                onClick={() => setFinishModal(false)}
                style={{
                  background: "none", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px", padding: "0.85rem", color: "#94a3b8",
                  fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                {lang === 'es' ? 'Seguir entrenando' : 'Keep training'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
