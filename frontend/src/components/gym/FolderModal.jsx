import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useLanguage } from "../../LanguageContext";

export default function FolderModal({ onCancel, onCreate }) {
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
          placeholder={t('folder_name_placeholder') || (lang === 'es' ? 'Nombre de carpeta' : 'Folder name')}
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
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#94a3b8",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {t('cancel') || (lang === 'es' ? 'Cancelar' : 'Cancel')}
          </button>
          <button
            onClick={() => {
              if (name.trim()) onCreate(name.trim());
            }}
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "14px",
              border: "none",
              background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {lang === 'es' ? 'Crear carpeta' : 'Create folder'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
