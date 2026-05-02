import { 
  GiChestArmor, GiBackPain, GiShoulderArmor,
  GiBiceps, GiLeg, GiAbdominalArmor, GiRunningShoe,
} from "react-icons/gi";
import { MdFitnessCenter, MdDirectionsRun } from "react-icons/md";

// Tipos de sets
export const SET_TYPES = [
  { id: "normal", label: "N", color: "#06b6d4", desc: "Normal" },
  { id: "warmup", label: "C", color: "#f59e0b", desc: "Calentamiento" },
  { id: "dropset", label: "D", color: "#ef4444", desc: "Drop Set" },
  { id: "failure", label: "F", color: "#8b5cf6", desc: "Al fallo" },
];

// Grupos musculares
export const FILTER_MAP = {
  CATEGORIES: {
    Superior: ["Pecho", "Espalda", "Hombros", "Biceps", "Triceps", "Antebrazos"],
    Inferior: ["Cuadriceps", "Isquios/Gluteos", "Pantorrillas"],
    Core: ["Abdominales"],
    Cardio: ["Cardio"],
  },
  EQUIPMENT: {
    Barra: ["barra"],
    Mancuerna: ["mancuerna"],
    Máquina: ["máquina", "cable", "kettlebell", "lastre"],
    "Peso Corporal": ["peso corporal", "banda"],
  },
};

export const MUSCLE_LABEL_MAP = {
  Todos: "Todos",
  Pecho: "Pecho",
  Espalda: "Espalda",
  "Hómbros": "Hombros",
  Biceps: "Biceps",
  Triceps: "Triceps",
  "Antebrazos": "Antebrazos",
  Cuadriceps: "Cuadriceps",
  "Isquios/Gluteos": "Isquios/Gluteos",
  Pantorrillas: "Pantorrillas",
  Abdominales: "Abdominales",
  Cardio: "Cardio",
};

// Iconos por músculo
export const MUSCLE_ICONS = {
  Pecho: GiChestArmor,
  Espalda: GiBackPain,
  Hombros: GiShoulderArmor,
  Biceps: GiBiceps,
  Triceps: GiBiceps,
  Cuadriceps: GiLeg,
  "Isquios/Gluteos": GiLeg,
  Abdominales: GiAbdominalArmor,
  Cardio: GiRunningShoe,
  default: MdFitnessCenter,
};

// Estilos compartidos
export const ELITE_STYLES = {
  glassCard: {
    background: "rgba(15, 23, 42, 0.95)",
    backdropFilter: "blur(40px)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "24px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  accentButton: {
    background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    border: "none",
    borderRadius: "16px",
    color: "#fff",
    fontWeight: 700,
  },
  ghostButton: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#94a3b8",
  },
};

// Utilidad para obtener icono
export const getMuscleIcon = (muscle) => {
  return MUSCLE_ICONS[muscle] || MUSCLE_ICONS.default;
};
