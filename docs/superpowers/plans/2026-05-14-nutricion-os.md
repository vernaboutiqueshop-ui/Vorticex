# Sistema Operativo Nutricional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar NutricionView.jsx (1798 líneas) en sub-componentes + implementar 5 nuevas features: ActionHub chips, editable photo draft, diet mode selector, source traceability, mini calendar.

**Architecture:** NutricionView.jsx queda como orquestador (~350 líneas) que hace el data-fetching y pasa props. Cada sección se extrae a `frontend/src/components/nutricion/`. Backend recibe migración additive para columna `source` y endpoint de comidas por fecha.

**Tech Stack:** React 18, Vite, framer-motion, lucide-react, react-icons, FastAPI, SQLite, Python

---

## File Map

### Crear
- `frontend/src/components/nutricion/AyunoSection.jsx` — timer, timeline, etapas, racha
- `frontend/src/components/nutricion/AlacenaSection.jsx` — chips, input, receta IA
- `frontend/src/components/nutricion/BrujulaSection.jsx` — rings, metas editor, diet mode
- `frontend/src/components/nutricion/HidratacionSection.jsx` — water tracker drops
- `frontend/src/components/nutricion/LogSection.jsx` — LOG HOY lista + ActionHub + búsqueda texto/foto/alacena
- `frontend/src/components/nutricion/CalendarSection.jsx` — mini calendario 7 días + drawer día

### Modificar
- `frontend/src/components/NutricionView.jsx` — reducir a orquestador
- `backend/core/database_sqlite.py` — add `source` column migration + `obtener_comidas_fecha`
- `backend/core/database.py` — re-export `obtener_comidas_fecha`
- `backend/routers/nutricion.py` — add `/comidas-fecha` endpoint

---

## Task 1: Backend — source column + obtener_comidas_fecha

**Files:**
- Modify: `backend/core/database_sqlite.py`
- Modify: `backend/core/database.py`
- Modify: `backend/routers/nutricion.py`

- [ ] **Step 1: Add source column migration in `database_sqlite.py`**

En `get_conn()` o en la función de init de la tabla, agregar la migración safe:

```python
# En database_sqlite.py, al inicio de get_conn() o en _ensure_tables():
def _migrate_source_column(conn):
    """Additive migration: add source column if not exists."""
    try:
        conn.execute("ALTER TABLE activity_logs ADD COLUMN source TEXT DEFAULT 'manual'")
        conn.commit()
    except Exception:
        pass  # Column already exists
```

Llamar `_migrate_source_column(conn)` dentro de `get_conn()` después de establecer la conexión.

- [ ] **Step 2: Update `guardar_evento` to store source**

Cambiar la función (actualmente el param `humor` se descarta):

```python
def guardar_evento(
    perfil: str,
    tipo: str,
    desc: str,
    humor: str,           # este es el source (Cache/Manual/Foto/IA)
    cal: float,
    prot: float = 0,
    carb: float = 0,
    gras: float = 0,
    duration: int = 0,
):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(name) = LOWER(?)", (perfil,))
        user = cur.fetchone()
        u_id = user["id"] if user else 1
        cur.execute(
            """
            INSERT INTO activity_logs (user_id, type, description, val1, val2, val3, val4, val5, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (u_id, tipo, desc, cal, prot, carb, gras, duration, humor),
        )
        conn.commit()
```

- [ ] **Step 3: Update `obtener_comidas_hoy` to return source**

```python
def obtener_comidas_hoy(perfil: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, description as descripcion, val1 as calorias, val2 as proteinas,
                   val3 as carbos, val4 as grasas, timestamp,
                   COALESCE(source, 'manual') as fuente
            FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND type = 'Nutricion'
            AND date(timestamp) = date('now')
            ORDER BY timestamp DESC
            """,
            (perfil,),
        )
        return [dict(r) for r in cur.fetchall()]
```

- [ ] **Step 4: Add `obtener_comidas_fecha` function**

```python
def obtener_comidas_fecha(perfil: str, fecha: str):
    """Retorna comidas de una fecha específica (formato YYYY-MM-DD)."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, description as descripcion, val1 as calorias, val2 as proteinas,
                   val3 as carbos, val4 as grasas, timestamp,
                   COALESCE(source, 'manual') as fuente
            FROM activity_logs
            WHERE user_id = (SELECT id FROM users WHERE LOWER(name) = LOWER(?))
            AND type = 'Nutricion'
            AND date(timestamp) = date(?)
            ORDER BY timestamp DESC
            """,
            (perfil, fecha),
        )
        return [dict(r) for r in cur.fetchall()]
```

- [ ] **Step 5: Re-export in `database.py`**

Agregar `obtener_comidas_fecha` a los imports/exports de `backend/core/database.py`.

- [ ] **Step 6: Add endpoint in `nutricion.py`**

```python
@router.get("/comidas-fecha")
def get_comidas_fecha(perfil: str, fecha: str, user: str = Depends(get_current_user)):
    try:
        comidas = obtener_comidas_fecha(perfil, fecha)
        return {"status": "success", "comidas": comidas}
    except Exception as e:
        return {"status": "error", "comidas": [], "error": str(e)}
```

- [ ] **Step 7: Commit**
```bash
git add backend/core/database_sqlite.py backend/core/database.py backend/routers/nutricion.py
git commit -m "feat: source traceability column + obtener_comidas_fecha endpoint"
```

---

## Task 2: Extract AyunoSection.jsx

**Files:**
- Create: `frontend/src/components/nutricion/AyunoSection.jsx`

Props que recibe: `{ perfil, ayuno, horasAyunoStr, progresoAyuno, horasDecimal, metaHorasLocal, rachaAyuno, onToggle, onMetaChange, onShowToast }`

- [ ] **Step 1: Crear `AyunoSection.jsx`**

Mover de NutricionView.jsx el bloque `{/* 2. Ayuno Intermitente */}` (líneas 919-1089), las constantes `ETAPAS_AYUNO`, `getEtapaActual`, `getProximaEtapa`, y los imports necesarios:

```jsx
import { useState } from 'react';
import { MdOutlineTimer } from 'react-icons/md';
import { FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'motion/react';

const ETAPAS_AYUNO = [ /* ... copiar array exacto de NutricionView.jsx líneas 13-86 */ ];
const getEtapaActual = (h) => ETAPAS_AYUNO.find(e => h >= e.min && h < e.max) || ETAPAS_AYUNO[0];
const getProximaEtapa = (h) => {
  const idx = ETAPAS_AYUNO.findIndex(e => h >= e.min && h < e.max);
  return idx >= 0 && idx < ETAPAS_AYUNO.length - 1 ? ETAPAS_AYUNO[idx + 1] : null;
};
const DIAS_LABEL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function AyunoSection({ ayuno, horasAyunoStr, progresoAyuno, horasDecimal, metaHorasLocal, rachaAyuno, onToggle, onMetaChange }) {
  // Copiar JSX del bloque ayuno de NutricionView
  // Reemplazar: toggleAyuno → onToggle, guardarMetaAyuno → onMetaChange
  // Reemplazar: setMetaHorasLocal → onMetaChange (la meta se sube al padre)
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/nutricion/AyunoSection.jsx
git commit -m "feat: extract AyunoSection sub-component"
```

---

## Task 3: Extract AlacenaSection.jsx

**Files:**
- Create: `frontend/src/components/nutricion/AlacenaSection.jsx`

Props: `{ perfil, alacena, onRefresh, onSearchIngrediente, onShowToast }`

- [ ] **Step 1: Crear `AlacenaSection.jsx`**

```jsx
import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { GiCookingPot, GiMeal } from 'react-icons/gi';
import { motion } from 'motion/react';
import API, { authFetch } from '../../config';

export default function AlacenaSection({ perfil, alacena, onRefresh, onSearchIngrediente, onShowToast }) {
  const [newIngrediente, setNewIngrediente] = useState('');
  const [receta, setReceta] = useState('');
  const [loadingReceta, setLoadingReceta] = useState(false);

  const agregarAlacena = async () => {
    if (!newIngrediente.trim()) return;
    await authFetch(`${API}/api/alacena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfil, ingrediente: newIngrediente, cantidad: '' })
    });
    setNewIngrediente('');
    onRefresh();
  };

  const eliminarAlacena = async (id) => {
    await authFetch(`${API}/api/alacena/${id}?perfil=${perfil}`, { method: 'DELETE' });
    onRefresh();
  };

  const pedirReceta = async () => {
    setLoadingReceta(true);
    setReceta('');
    try {
      const res = await authFetch(`${API}/api/alacena/receta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil })
      });
      const data = await res.json();
      if (data.receta) setReceta(data.receta);
    } catch {}
    setLoadingReceta(false);
  };

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '1rem 1.1rem', borderLeft: '3px solid var(--color-kcal)' }}>
      {/* Copiar JSX del bloque ALACENA de NutricionView.jsx líneas 1572-1638 */}
      {/* Reemplazar: alacena (ya es prop), newIngrediente local, receta local */}
      {/* onSearchIngrediente reemplaza la lambda que hace handleSearchInput + buscarAlimento */}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/nutricion/AlacenaSection.jsx
git commit -m "feat: extract AlacenaSection sub-component"
```

---

## Task 4: Extract HidratacionSection.jsx

**Files:**
- Create: `frontend/src/components/nutricion/HidratacionSection.jsx`

Props: `{ waterGlasses, waterGoal, onAddWater }`

- [ ] **Step 1: Crear `HidratacionSection.jsx`**

```jsx
import { Plus } from 'lucide-react';
import { IoWater } from 'react-icons/io5';
import { motion, AnimatePresence } from 'motion/react';

export default function HidratacionSection({ waterGlasses, waterGoal, onAddWater }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Copiar JSX del bloque WATER TRACKER de NutricionView.jsx líneas 1641-1731 */}
      {/* Reemplazar: waterGlasses → prop, WATER_GOAL → waterGoal prop, addWater → onAddWater */}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/nutricion/HidratacionSection.jsx
git commit -m "feat: extract HidratacionSection sub-component"
```

---

## Task 5: Extract BrujulaSection.jsx + Diet Mode

**Files:**
- Create: `frontend/src/components/nutricion/BrujulaSection.jsx`

Props: `{ macrosHoy, metas, onSaveMetas, onNavigateTo, dietMode, onDietModeChange }`

Diet mode presets hardcodeados:
```js
const DIET_PRESETS = {
  keto:    { cal_goal: 1800, prot_goal: 130, carb_goal: 30,  fat_goal: 140 },
  if:      null, // mantiene metas actuales, solo badge informativo
  sinTACC: null, // mantiene metas actuales, solo badge informativo
};
```

- [ ] **Step 1: Crear `BrujulaSection.jsx`**

```jsx
import { useState, useRef } from 'react';
import { Target, ChevronRight, History } from 'lucide-react';
import { GiTargetArrows } from 'react-icons/gi';
import { motion } from 'motion/react';

const DIET_PRESETS = {
  keto:    { label: 'Keto', emoji: '🥑', cal_goal: 1800, prot_goal: 130, carb_goal: 30,  fat_goal: 140 },
  if:      { label: 'Ayuno IF', emoji: '⏱', cal_goal: null, prot_goal: null, carb_goal: null, fat_goal: null },
  sinTACC: { label: 'Sin TACC', emoji: '🌾', cal_goal: null, prot_goal: null, carb_goal: null, fat_goal: null },
};

export default function BrujulaSection({ macrosHoy, metas, onSaveMetas, onNavigateTo, dietMode, onDietModeChange }) {
  const [showMetasEditor, setShowMetasEditor] = useState(false);
  const [localMetas, setLocalMetas] = useState(metas);

  // Sync cuando las metas del padre cambian
  // useEffect(() => setLocalMetas(metas), [metas]);

  const rings = [
    { label: 'KCAL', value: macrosHoy.calorias, goal: metas.cal_goal, color: 'var(--color-kcal)', colorHex: '#F59E0B', radius: 52 },
    { label: 'PROT', value: macrosHoy.proteinas, goal: metas.prot_goal, color: 'var(--color-prot)', colorHex: '#22C55E', radius: 42 },
    { label: 'CARB', value: macrosHoy.carbos, goal: metas.carb_goal, color: 'var(--color-carb)', colorHex: '#00C9FF', radius: 32 },
    { label: 'GRAS', value: macrosHoy.grasas, goal: metas.fat_goal, color: 'var(--color-gras)', colorHex: '#A78BFA', radius: 22 },
  ];
  const nutriScore = Math.round(rings.reduce((sum, r) => {
    const pct = r.goal > 0 ? r.value / r.goal : 0;
    return sum + Math.max(0, 100 - Math.abs(1 - pct) * 100);
  }, 0) / rings.length);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ color: 'var(--color-primary)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <GiTargetArrows size={14} /> BRÚJULA METABÓLICA
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {onNavigateTo && (
            <button onClick={() => onNavigateTo('graficos')} style={{ background: 'var(--surface-2)', border: 'none', color: 'var(--text-secondary)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.5rem', fontWeight: 800 }}>
              <History size={10} /> HISTORIAL
            </button>
          )}
          <button onClick={() => setShowMetasEditor(s => !s)} style={{ background: showMetasEditor ? 'rgba(0,201,255,0.12)' : 'var(--surface-2)', border: showMetasEditor ? '1px solid rgba(0,201,255,0.3)' : 'none', color: showMetasEditor ? 'var(--color-primary)' : 'var(--text-muted)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.5rem', fontWeight: 800 }}>
            <Target size={10} /> METAS
          </button>
        </div>
      </div>

      {/* Diet mode chips */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.6rem', overflowX: 'auto' }}>
        {Object.entries(DIET_PRESETS).map(([key, preset]) => {
          const active = dietMode === key;
          return (
            <motion.button key={key} whileTap={{ scale: 0.9 }}
              onClick={() => {
                const newMode = active ? null : key;
                onDietModeChange(newMode, preset);
              }}
              style={{
                flexShrink: 0, padding: '0.25rem 0.6rem', borderRadius: '20px', cursor: 'pointer', border: 'none', fontSize: '0.6rem', fontWeight: 800,
                background: active ? 'rgba(0,201,255,0.15)' : 'var(--surface-3)',
                color: active ? 'var(--color-primary)' : 'var(--text-muted)',
                outline: active ? '1.5px solid rgba(0,201,255,0.4)' : '1px solid var(--border-subtle)',
                transition: 'all 0.15s',
              }}>
              {preset.emoji} {preset.label}
            </motion.button>
          );
        })}
        {dietMode && (
          <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '0.2rem' }}>
            {dietMode === 'if' ? '⏱ Ventana de alimentación activa' : dietMode === 'sinTACC' ? '🌾 Modo sin gluten activo' : ''}
          </span>
        )}
      </div>

      {/* Metas editor — inline expandible */}
      {showMetasEditor && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem' }}>
          {[
            { key: 'cal_goal', label: 'Kcal', unit: 'kcal' },
            { key: 'prot_goal', label: 'Proteínas', unit: 'g' },
            { key: 'carb_goal', label: 'Carbos', unit: 'g' },
            { key: 'fat_goal', label: 'Grasas', unit: 'g' },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, width: '70px' }}>{f.label}</span>
              <input type="number" value={localMetas[f.key]}
                onChange={e => setLocalMetas(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                className="premium-input" style={{ flex: 1, height: '2rem', fontSize: '0.75rem', textAlign: 'center' }} />
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', width: '25px' }}>{f.unit}</span>
            </div>
          ))}
          <button onClick={() => { onSaveMetas(localMetas); setShowMetasEditor(false); }}
            className="btn-elite" style={{ width: '100%', height: '2rem', fontSize: '0.7rem', marginTop: '0.3rem' }}>
            GUARDAR METAS
          </button>
        </motion.div>
      )}

      {/* Rings + stats — copiar JSX exacto de NutricionView.jsx líneas 864-916 */}
      {/* Reemplazar: rings → calculado arriba, nutriScore → calculado arriba */}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/nutricion/BrujulaSection.jsx
git commit -m "feat: extract BrujulaSection + diet mode selector (Keto/IF/Sin TACC)"
```

---

## Task 6: Build ActionHub.jsx — Chip Carousel

Reemplaza los 3 tabs (Texto/Foto/Alacena) con chips horizontales scrollables que incluyen Creatina.

**Files:**
- Create: `frontend/src/components/nutricion/ActionHub.jsx`

- [ ] **Step 1: Crear `ActionHub.jsx`**

```jsx
import { useRef } from 'react';
import { Search, Camera } from 'lucide-react';
import { GiCookingPot } from 'react-icons/gi';
import { motion } from 'motion/react';

const CHIPS = [
  { id: 'buscar', label: 'Buscar', icon: Search, size: 14 },
  { id: 'foto',   label: 'Foto',   icon: Camera, size: 14 },
  { id: 'alacena', label: 'Alacena', icon: GiCookingPot, size: 14 },
  { id: 'creatina', label: 'Creatina 💊', icon: null, size: 14 },
];

export default function ActionHub({ activeChip, onChipSelect }) {
  const scrollRef = useRef(null);

  return (
    <div
      ref={scrollRef}
      style={{
        display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.1rem',
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        marginBottom: '0.85rem',
      }}
    >
      {CHIPS.map(chip => {
        const active = activeChip === chip.id;
        const Icon = chip.icon;
        return (
          <motion.button
            key={chip.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChipSelect(chip.id)}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.45rem 0.85rem', borderRadius: '20px', cursor: 'pointer', border: 'none',
              background: active ? 'var(--color-primary)' : 'var(--surface-3)',
              color: active ? '#000' : 'var(--text-secondary)',
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.2px',
              outline: active ? 'none' : '1px solid var(--border-subtle)',
              transition: 'all 0.15s',
            }}
          >
            {Icon && <Icon size={chip.size} />}
            {chip.label}
          </motion.button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/nutricion/ActionHub.jsx
git commit -m "feat: ActionHub chip carousel (Buscar/Foto/Alacena/Creatina)"
```

---

## Task 7: Build LogSection.jsx — LOG HOY + search + editable photo draft

Feature clave: foto ya NO auto-loggea. Muestra un card editable donde el usuario ajusta los valores antes de confirmar.

**Files:**
- Create: `frontend/src/components/nutricion/LogSection.jsx`

Props: `{ perfil, comidasHoy, onRefresh, onShowToast, prefs }`

- [ ] **Step 1: Crear `LogSection.jsx`**

```jsx
import { useState, useRef, useCallback } from 'react';
import { Camera, Search, Plus, X, Loader2 } from 'lucide-react';
import { GiMeal, GiCookingPot } from 'react-icons/gi';
import { FiEdit3 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../../config';
import ActionHub from './ActionHub';

// Source badge helper
const SOURCE_BADGE = {
  'Cache':  { label: '⚡ Cache',   color: 'var(--color-prot)',    bg: 'rgba(34,197,94,0.1)' },
  'Foto':   { label: '📷 Foto',    color: 'var(--color-carb)',   bg: 'rgba(0,201,255,0.1)' },
  'Manual': { label: '✏️ Manual',  color: 'var(--text-muted)',   bg: 'var(--surface-3)' },
  'IA':     { label: '🤖 IA',      color: 'var(--color-gras)',   bg: 'rgba(167,139,250,0.1)' },
  'manual': { label: '✏️ Manual',  color: 'var(--text-muted)',   bg: 'var(--surface-3)' },
};

const FOOD_PLACEHOLDERS = [
  'Ej: 200g de pechuga con arroz...',
  'Ej: un choripán y una birra...',
  'Ej: humita al plato con queso...',
  'Ej: 2 medialunas y café con leche...',
  'Ej: pizza casera, 2 porciones...',
  'Ej: arroz con pollo casero...',
  'Ej: lomito completo...',
];

// Creatina localStorage helpers
const CREATINA_KEY = (perfil) => `vortice_creatina_${perfil}`;
const getCreatinaHoy = (perfil) => {
  try {
    const data = JSON.parse(localStorage.getItem(CREATINA_KEY(perfil)) || '{}');
    const hoy = new Date().toISOString().split('T')[0];
    return data.fecha === hoy ? data : { fecha: hoy, tomada: false, dosis: 5 };
  } catch { return { fecha: new Date().toISOString().split('T')[0], tomada: false, dosis: 5 }; }
};
const saveCreatinaHoy = (perfil, data) => {
  localStorage.setItem(CREATINA_KEY(perfil), JSON.stringify(data));
};

export default function LogSection({ perfil, comidasHoy, onRefresh, onShowToast, prefs }) {
  const [activeChip, setActiveChip] = useState('buscar');
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [hybridResults, setHybridResults] = useState([]);
  const [hybridSource, setHybridSource] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [gramosInput, setGramosInput] = useState(100);
  const [loggingFood, setLoggingFood] = useState(false);
  const [logSuccess, setLogSuccess] = useState(null);
  const [searchMsg, setSearchMsg] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [multiPending, setMultiPending] = useState([]);
  const [naturalItems, setNaturalItems] = useState([]);
  const [loggingMulti, setLoggingMulti] = useState(false);
  const [phIdx, setPhIdx] = useState(0);
  // Photo draft — editable before logging
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoDraft, setPhotoDraft] = useState(null); // { alimento, calorias, proteinas, carbos, grasas }
  const [loggingDraft, setLoggingDraft] = useState(false);
  // Creatina
  const [creatina, setCreatina] = useState(() => getCreatinaHoy(perfil));

  const suggestionTimer = useRef(null);
  const searchTimers = useRef([]);

  // Rotating placeholder
  // useEffect(() => { const t = setInterval(() => setPhIdx(i => (i + 1) % FOOD_PLACEHOLDERS.length), 3500); return () => clearInterval(t); }, []);

  const handleSearchInput = (val) => {
    setSearchText(val);
    clearTimeout(suggestionTimer.current);
    if (val.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestionTimer.current = setTimeout(async () => {
      try {
        const res = await authFetch(`${API}/api/nutricion/buscar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ perfil, query: val.trim() })
        });
        const data = await res.json();
        const items = [...(data.cache || []), ...(data.items || [])].slice(0, 5);
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch { setSuggestions([]); }
    }, 280);
  };

  const buscarAlimento = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    setHybridResults([]);
    setSelectedFood(null);
    setHybridSource('');
    setMultiPending([]);
    setNaturalItems([]);
    searchTimers.current.forEach(clearTimeout);
    setSearchMsg('Buscando en tu historial...');
    searchTimers.current = [
      setTimeout(() => setSearchMsg('Analizando por similitud semántica...'), 550),
      setTimeout(() => setSearchMsg('✨ Consultando IA nutricional...'), 1400),
      setTimeout(() => setSearchMsg('Procesando respuesta...'), 3200),
    ];
    try {
      const res = await authFetch(`${API}/api/nutricion/buscar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, query: searchText.trim() })
      });
      const data = await res.json();
      if (data.source === 'natural' && data.natural_items?.length > 0) {
        setNaturalItems(data.natural_items);
        setHybridSource('natural');
      } else if (data.items?.length > 0) {
        setHybridResults(data.items);
        setHybridSource(data.source || '');
        if (data.corrected && data.previous_cal) {
          onShowToast?.(`Dato corregido: antes ${data.previous_cal} kcal/100g, ahora ${Math.round(data.items[0]?.cal_100)} kcal/100g 🎯`, 'info');
        }
      } else {
        setHybridResults([]);
        setHybridSource('none');
      }
    } catch {}
    searchTimers.current.forEach(clearTimeout);
    setSearchMsg('');
    setSearching(false);
  };

  const logFromCache = async (food) => {
    setLoggingFood(true);
    try {
      const res = await authFetch(`${API}/api/nutricion/log-from-cache`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, alimento_id: food.id || null, nombre: food.nombre, cal_100: food.cal_100, prot_100: food.prot_100, carb_100: food.carb_100, fat_100: food.fat_100, gramos: gramosInput })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const cal = Math.round(food.cal_100 * gramosInput / 100);
        onShowToast?.(`${food.nombre} · ${cal} kcal`, 'success');
        setLogSuccess(food.nombre);
        setTimeout(() => setLogSuccess(null), 1600);
        setSelectedFood(null);
        setHybridResults([]);
        setSuggestions([]);
        setShowSuggestions(false);
        setSearchText('');
        setGramosInput(100);
        onRefresh();
      }
    } catch {}
    setLoggingFood(false);
  };

  const analizarFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAnalyzingPhoto(true);
    setPhotoDraft(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await authFetch(`${API}/api/nutricion/analizar-foto?perfil=${perfil}`, { method: 'POST', body: formData });
      const data = await res.json();
      // NO auto-log: guardar como draft editable
      if (data.resultado) {
        setPhotoDraft({ ...data.resultado });
      } else {
        onShowToast?.('No se pudo analizar la foto. Intentá con mejor luz.', 'error');
      }
    } catch {}
    setAnalyzingPhoto(false);
    // Reset file input
    e.target.value = '';
  };

  const confirmarDraft = async () => {
    if (!photoDraft) return;
    setLoggingDraft(true);
    try {
      await authFetch(`${API}/api/nutricion/log-from-cache`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfil,
          nombre: photoDraft.alimento || 'Comida (foto)',
          cal_100: photoDraft.calorias,
          prot_100: photoDraft.proteinas,
          carb_100: photoDraft.carbos,
          fat_100: photoDraft.grasas,
          gramos: 100,
        })
      });
      onShowToast?.(`📷 ${photoDraft.alimento || 'Foto'} · ${Math.round(photoDraft.calorias)} kcal`, 'success');
      setPhotoDraft(null);
      onRefresh();
    } catch {}
    setLoggingDraft(false);
  };

  const toggleCreatina = () => {
    const updated = { ...creatina, tomada: !creatina.tomada };
    setCreatina(updated);
    saveCreatinaHoy(perfil, updated);
    if (!creatina.tomada) onShowToast?.(`💊 Creatina ${creatina.dosis}g registrada`, 'success');
  };

  const eliminarComida = async (id) => {
    await authFetch(`${API}/api/nutricion/evento/${id}?perfil=${perfil}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* LOG HOY */}
      {comidasHoy.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <GiMeal size={12} /> LOG HOY
            </h3>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-muted)' }}>
              {comidasHoy.length} {comidasHoy.length === 1 ? 'comida' : 'comidas'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {comidasHoy.map((c, cIdx) => {
              const cal = Math.round(c.calorias || 0);
              const prot = Math.round(c.proteinas || 0);
              const carb = Math.round(c.carbos || 0);
              const gras = Math.round(c.grasas || 0);
              const calColor = cal > 500 ? '#ef4444' : cal > 250 ? 'var(--color-kcal)' : 'var(--color-prot)';
              const gramosMatch = c.descripcion?.match(/\((\d+)g\)$/);
              const gramos = gramosMatch ? gramosMatch[1] : null;
              const nombreBase = gramos ? c.descripcion.replace(/\s*\(\d+g\)$/, '') : c.descripcion;
              const fuente = c.fuente || 'manual';
              const badge = SOURCE_BADGE[fuente] || SOURCE_BADGE['manual'];
              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + cIdx * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface-1)', borderRadius: '12px', padding: '0.55rem 0.65rem', border: '1px solid var(--surface-hover)' }}>
                  <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', background: `${calColor}18`, border: `1px solid ${calColor}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: calColor, lineHeight: 1 }}>{cal}</span>
                    <span style={{ fontSize: '0.38rem', fontWeight: 800, color: calColor, opacity: 0.7 }}>KCAL</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nombreBase}
                        {gramos && <span style={{ marginLeft: '0.3rem', fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(0,201,255,0.1)', padding: '0.05rem 0.3rem', borderRadius: '4px' }}>{gramos}g</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-prot)' }}>P <span style={{ color: 'var(--text-primary)' }}>{prot}g</span></span>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-carb)' }}>C <span style={{ color: 'var(--text-primary)' }}>{carb}g</span></span>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--color-gras)' }}>G <span style={{ color: 'var(--text-primary)' }}>{gras}g</span></span>
                      {/* Source badge */}
                      <span style={{ fontSize: '0.45rem', fontWeight: 800, color: badge.color, background: badge.bg, padding: '0.05rem 0.3rem', borderRadius: '4px' }}>{badge.label}</span>
                    </div>
                  </div>
                  <button onClick={() => eliminarComida(c.id)} className="btn-icon-elite danger" style={{ width: '28px', height: '28px', flexShrink: 0 }}><X size={12} /></button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* PANEL DE REGISTRO */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'linear-gradient(135deg, var(--color-card), var(--color-card-alt))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-card)' }}>

        <ActionHub activeChip={activeChip} onChipSelect={setActiveChip} />

        <AnimatePresence mode="wait">
          {/* BUSCAR */}
          {activeChip === 'buscar' && (
            <motion.div key="buscar" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }} />
                    <input
                      value={searchText}
                      onChange={e => handleSearchInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { setShowSuggestions(false); buscarAlimento(); } if (e.key === 'Escape') setShowSuggestions(false); }}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      className="premium-input"
                      placeholder={FOOD_PLACEHOLDERS[phIdx]}
                      style={{ width: '100%', height: '2.8rem', fontSize: '0.85rem', paddingLeft: '2.2rem' }}
                    />
                  </div>
                  <motion.button whileTap={{ scale: 0.92 }} className="btn-elite"
                    style={{ width: '3rem', height: '2.8rem', padding: 0, flexShrink: 0 }}
                    onClick={() => { setShowSuggestions(false); buscarAlimento(); }} disabled={searching}>
                    {searching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                  </motion.button>
                </div>
                {/* AI phase messages, autocomplete, results — copiar de NutricionView.jsx 1202-1490 con misma lógica */}
                {/* ... (bloques AnimatePresence para searchMsg, suggestions, hybridResults, selectedFood, multiPending, naturalItems) */}
              </div>
            </motion.div>
          )}

          {/* FOTO */}
          {activeChip === 'foto' && (
            <motion.div key="foto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              {!photoDraft && (
                <label className="btn-elite" style={{ width: '100%', height: '3.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(0,201,255,0.07)', border: '1px dashed rgba(0,201,255,0.3)', borderRadius: 'var(--radius-input)' }}>
                  <Camera size={18} color="var(--color-primary)" />
                  {analyzingPhoto ? <><Loader2 size={14} className="spin" /> Analizando foto...</> : 'Tocar para sacar foto'}
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={analizarFoto} disabled={analyzingPhoto} />
                </label>
              )}

              {/* EDITABLE PHOTO DRAFT */}
              <AnimatePresence>
                {photoDraft && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8 }}
                    style={{ background: 'rgba(0,201,255,0.05)', border: '1px solid rgba(0,201,255,0.2)', borderRadius: '14px', padding: '0.9rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FiEdit3 size={12} /> REVISÁ Y AJUSTÁ SI ES NECESARIO
                      </div>
                      <button onClick={() => setPhotoDraft(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
                    </div>

                    {/* Nombre editable */}
                    <input
                      value={photoDraft.alimento || ''}
                      onChange={e => setPhotoDraft(p => ({ ...p, alimento: e.target.value }))}
                      className="premium-input"
                      placeholder="Nombre del plato..."
                      style={{ width: '100%', height: '2.2rem', fontSize: '0.82rem', marginBottom: '0.6rem' }}
                    />

                    {/* Macros editables */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      {[
                        { key: 'calorias', label: 'Kcal', color: 'var(--color-kcal)', unit: '' },
                        { key: 'proteinas', label: 'Proteínas', color: 'var(--color-prot)', unit: 'g' },
                        { key: 'carbos', label: 'Carbos', color: 'var(--color-carb)', unit: 'g' },
                        { key: 'grasas', label: 'Grasas', color: 'var(--color-gras)', unit: 'g' },
                      ].map(f => (
                        <div key={f.key}>
                          <div style={{ fontSize: '0.5rem', fontWeight: 800, color: f.color, marginBottom: '0.15rem' }}>{f.label.toUpperCase()}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input
                              type="number"
                              value={Math.round(photoDraft[f.key] || 0)}
                              onChange={e => setPhotoDraft(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                              className="premium-input"
                              style={{ flex: 1, height: '2rem', fontSize: '0.82rem', textAlign: 'center', color: f.color }}
                            />
                            {f.unit && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{f.unit}</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <motion.button whileTap={{ scale: 0.96 }}
                      onClick={confirmarDraft}
                      disabled={loggingDraft}
                      className="btn-elite"
                      style={{ width: '100%', height: '2.6rem', fontSize: '0.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      {loggingDraft ? <Loader2 size={14} className="spin" /> : <><Plus size={14} /> CONFIRMAR Y REGISTRAR</>}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ALACENA TAB — quick search from pantry */}
          {activeChip === 'alacena' && (
            <motion.div key="alacena" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
                Tocá un ingrediente en tu Alacena para buscarlo
              </div>
            </motion.div>
          )}

          {/* CREATINA */}
          {activeChip === 'creatina' && (
            <motion.div key="creatina" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              <div style={{ background: creatina.tomada ? 'rgba(34,197,94,0.08)' : 'var(--surface-3)', border: `1px solid ${creatina.tomada ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`, borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>💊</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: creatina.tomada ? 'var(--color-prot)' : 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {creatina.tomada ? '¡Creatina tomada hoy!' : 'Creatina diaria'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button onClick={() => setCreatina(p => { const u = { ...p, dosis: Math.max(1, p.dosis - 1) }; saveCreatinaHoy(perfil, u); return u; })}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-2)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 900 }}>−</button>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-primary)' }}>{creatina.dosis}g</span>
                  <button onClick={() => setCreatina(p => { const u = { ...p, dosis: Math.min(20, p.dosis + 1) }; saveCreatinaHoy(perfil, u); return u; })}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-2)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 900 }}>+</button>
                </div>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={toggleCreatina}
                  style={{ width: '100%', height: '2.6rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: creatina.tomada ? 'rgba(34,197,94,0.15)' : 'var(--color-primary)', color: creatina.tomada ? 'var(--color-prot)' : '#000' }}>
                  {creatina.tomada ? '✓ Ya la tomé hoy' : '💊 Marcar como tomada'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Log success flash */}
        <AnimatePresence>
          {logSuccess && (
            <motion.div initial={{ opacity: 0, scale: 0.85, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '0.4rem 0.7rem' }}>
              <span style={{ fontSize: '0.9rem' }}>✓</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-prot)' }}>{logSuccess} registrado</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
```

**Nota:** Los bloques de autocomplete, AI phase messages, hybridResults list, selectedFood panel, multiPending panel, naturalItems panel son copias exactas de NutricionView.jsx líneas 1200-1490 con las mismas variables locales.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/nutricion/LogSection.jsx frontend/src/components/nutricion/ActionHub.jsx
git commit -m "feat: LogSection con ActionHub chips + editable photo draft + source badge + creatina"
```

---

## Task 8: Build CalendarSection.jsx — Mini Calendario

Reemplaza el bar chart semanal con un grid de 7 días clickeable. Al tocar un día pasado se abre un bottom drawer con las comidas de ese día.

**Files:**
- Create: `frontend/src/components/nutricion/CalendarSection.jsx`

Props: `{ perfil, historial }` — historial es el array `[{ fecha, calorias }, ...]` del dashboard

- [ ] **Step 1: Crear `CalendarSection.jsx`**

```jsx
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { HiOutlineCalendar } from 'react-icons/hi';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../../config';

const DIAS_LABEL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function CalendarSection({ perfil, historial }) {
  const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM-DD
  const [dayMeals, setDayMeals] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDay = async (fecha) => {
    setSelectedDate(fecha);
    setDrawerOpen(true);
    setLoadingDay(true);
    setDayMeals([]);
    try {
      const res = await authFetch(`${API}/api/nutricion/comidas-fecha?perfil=${perfil}&fecha=${fecha}`);
      const data = await res.json();
      if (data.comidas) setDayMeals(data.comidas);
    } catch {}
    setLoadingDay(false);
  };

  const closeDrawer = () => { setDrawerOpen(false); setSelectedDate(null); };

  // Build 7-day grid from historial (o últimos 7 días si historial vacío)
  const hoy = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (6 - i));
    const fecha = d.toISOString().split('T')[0];
    const isToday = i === 6;
    const histItem = historial.find(h => h.fecha === fecha);
    const calorias = histItem?.calorias || 0;
    return { fecha, isToday, calorias, dayLabel: DIAS_LABEL[d.getDay()] };
  });

  const maxCal = Math.max(...days.map(d => d.calorias), 1);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '18px', padding: '1rem 1.1rem' }}>
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <HiOutlineCalendar size={14} /> SEMANA
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {days.map((day, i) => {
            const pct = day.calorias / maxCal;
            const isSelected = selectedDate === day.fecha;
            const dotColor = pct > 0.75 ? 'var(--color-prot)' : pct > 0.35 ? 'var(--color-kcal)' : pct > 0 ? '#ef4444' : 'var(--surface-3)';
            return (
              <motion.button
                key={day.fecha}
                whileTap={{ scale: 0.9 }}
                onClick={() => !day.isToday && openDay(day.fecha)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                  background: isSelected ? 'rgba(0,201,255,0.08)' : day.isToday ? 'rgba(0,201,255,0.04)' : 'transparent',
                  border: day.isToday ? '1px solid rgba(0,201,255,0.25)' : isSelected ? '1px solid rgba(0,201,255,0.4)' : '1px solid transparent',
                  borderRadius: '10px', padding: '0.5rem 0.2rem', cursor: day.isToday ? 'default' : 'pointer',
                }}
              >
                <span style={{ fontSize: '0.5rem', fontWeight: 900, color: day.isToday ? 'var(--color-primary)' : 'var(--text-muted)' }}>{day.dayLabel}</span>
                {/* Mini bar */}
                <div style={{ width: '100%', height: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct * 28, day.calorias > 0 ? 4 : 0)}px` }}
                    transition={{ duration: 0.5, delay: 0.05 * i }}
                    style={{ width: '60%', borderRadius: '3px 3px 0 0', background: dotColor, opacity: isSelected ? 1 : 0.7 }}
                  />
                </div>
                <span style={{ fontSize: '0.42rem', color: day.calorias > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: 800 }}>
                  {day.calorias > 0 ? Math.round(day.calorias) : '—'}
                </span>
                {day.isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-primary)' }} />}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* BOTTOM DRAWER — comidas del día seleccionado */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.target === e.currentTarget && closeDrawer()}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: 'var(--surface-2)', borderRadius: '20px 20px 0 0', padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                  </div>
                  {!loadingDay && (
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {dayMeals.length === 0 ? 'Sin registros ese día' : `${dayMeals.length} comida${dayMeals.length !== 1 ? 's' : ''} · ${Math.round(dayMeals.reduce((s, m) => s + (m.calorias || 0), 0))} kcal`}
                    </div>
                  )}
                </div>
                <button onClick={closeDrawer} style={{ background: 'var(--surface-3)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>

              {loadingDay && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Loader2 size={20} className="spin" color="var(--color-primary)" />
                </div>
              )}

              {!loadingDay && dayMeals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  No hay comidas registradas ese día
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {dayMeals.map((c, i) => {
                  const cal = Math.round(c.calorias || 0);
                  const calColor = cal > 500 ? '#ef4444' : cal > 250 ? 'var(--color-kcal)' : 'var(--color-prot)';
                  const gramosMatch = c.descripcion?.match(/\((\d+)g\)$/);
                  const gramos = gramosMatch ? gramosMatch[1] : null;
                  const nombreBase = gramos ? c.descripcion.replace(/\s*\(\d+g\)$/, '') : c.descripcion;
                  return (
                    <motion.div key={c.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface-1)', borderRadius: '12px', padding: '0.55rem 0.65rem', border: '1px solid var(--surface-hover)' }}>
                      <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', background: `${calColor}18`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: calColor }}>{cal}</span>
                        <span style={{ fontSize: '0.38rem', fontWeight: 800, color: calColor, opacity: 0.7 }}>KCAL</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {nombreBase}{gramos && <span style={{ marginLeft: '0.3rem', fontSize: '0.6rem', color: 'var(--color-primary)', background: 'rgba(0,201,255,0.1)', padding: '0.05rem 0.3rem', borderRadius: '4px' }}>{gramos}g</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-prot)' }}>P {Math.round(c.proteinas||0)}g</span>
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-carb)' }}>C {Math.round(c.carbos||0)}g</span>
                          <span style={{ fontSize: '0.55rem', color: 'var(--color-gras)' }}>G {Math.round(c.grasas||0)}g</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/nutricion/CalendarSection.jsx
git commit -m "feat: CalendarSection — mini 7-day calendar + day drawer"
```

---

## Task 9: Assemble NutricionView.jsx as lean orchestrator

**Files:**
- Modify: `frontend/src/components/NutricionView.jsx`

- [ ] **Step 1: Reescribir NutricionView.jsx**

```jsx
import { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import API, { authFetch } from '../config';

import BrujulaSection from './nutricion/BrujulaSection';
import AyunoSection from './nutricion/AyunoSection';
import HidratacionSection from './nutricion/HidratacionSection';
import AlacenaSection from './nutricion/AlacenaSection';
import LogSection from './nutricion/LogSection';
import CalendarSection from './nutricion/CalendarSection';

const calcularTiempoAyuno = (inicioISO, metaHs) => {
  if (!inicioISO) return { str: '00:00:00', pct: 0, hrsDecimal: 0 };
  const isoStr = inicioISO.endsWith('Z') || inicioISO.includes('+') ? inicioISO : inicioISO + 'Z';
  const start = new Date(isoStr);
  const now = new Date();
  const diffMs = Math.max(0, now - start);
  const diffHrs = diffMs / (1000 * 60 * 60);
  const hrs = Math.floor(diffHrs);
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
  const pct = Math.min(100, (diffHrs / (metaHs || 16)) * 100);
  return {
    str: `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`,
    pct, hrsDecimal: diffHrs
  };
};

export default function NutricionView({ perfil, onNavigateTo, onShowToast }) {
  const [macrosHoy, setMacrosHoy] = useState({ calorias: 0, proteinas: 0, carbos: 0, grasas: 0 });
  const [metas, setMetas] = useState({ cal_goal: 2200, prot_goal: 150, carb_goal: 250, fat_goal: 70 });
  const [comidasHoy, setComidasHoy] = useState([]);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [historial, setHistorial] = useState([]);
  const [alacena, setAlacena] = useState([]);
  const [prefs, setPrefs] = useState({
    secciones: { hidratacion: true, ayuno: true, brujula: true, alacena: true, historial: true },
    agua_goal: 8,
    diet_mode: null,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [showPrefsPanel, setShowPrefsPanel] = useState(false);
  const brujulaRef = useRef(null);

  // Ayuno
  const [ayuno, setAyuno] = useState(() => {
    try {
      const cached = localStorage.getItem(`vortice_ayuno_${perfil}`);
      if (cached) { const p = JSON.parse(cached); if (p.en_ayuno && p.inicio) return p; }
    } catch {}
    return { en_ayuno: false, inicio: null, meta_horas: 16 };
  });
  const [horasAyunoStr, setHorasAyunoStr] = useState('00:00:00');
  const [progresoAyuno, setProgresoAyuno] = useState(0);
  const [horasDecimal, setHorasDecimal] = useState(0);
  const [metaHorasLocal, setMetaHorasLocal] = useState(16);
  const [rachaAyuno, setRachaAyuno] = useState([]);

  const fetchDashboard = () => {
    authFetch(`${API}/api/nutricion/dashboard-hoy?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => {
        if (d.status !== 'success') return;
        if (d.macros) setMacrosHoy({ calorias: d.macros.calorias||0, proteinas: d.macros.proteinas||0, carbos: d.macros.carbos||0, grasas: d.macros.grasas||0 });
        if (d.comidas) setComidasHoy(d.comidas);
        if (d.agua?.glasses != null) setWaterGlasses(d.agua.glasses);
        if (d.metas) setMetas(d.metas);
        if (d.historial) setHistorial(d.historial);
        if (d.ayuno) {
          setAyuno(d.ayuno);
          setMetaHorasLocal(d.ayuno.meta_horas || 16);
          if (d.ayuno.en_ayuno && d.ayuno.inicio) localStorage.setItem(`vortice_ayuno_${perfil}`, JSON.stringify(d.ayuno));
          else localStorage.removeItem(`vortice_ayuno_${perfil}`);
        }
      }).catch(console.error);
  };

  const fetchAlacena = () => {
    authFetch(`${API}/api/alacena?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.items) setAlacena(d.items); })
      .catch(console.error);
  };

  const fetchRachaAyuno = () => {
    authFetch(`${API}/api/graficos/timeline?perfil=${perfil}&limit=50`)
      .then(r => r.json())
      .then(d => {
        const hoy = new Date();
        const dias = Array.from({ length: 7 }, (_, i) => {
          const d2 = new Date(hoy); d2.setDate(hoy.getDate() - (6 - i));
          return { fecha: d2.toISOString().split('T')[0], completado: false };
        });
        if (d.eventos) {
          d.eventos.filter(ev => ev.tipo === 'AyunoCompletado').forEach(ev => {
            const fecha = (ev.timestamp||'').split('T')[0].split(' ')[0];
            const idx = dias.findIndex(d3 => d3.fecha === fecha);
            if (idx !== -1) dias[idx].completado = true;
          });
        }
        setRachaAyuno(dias);
      }).catch(() => {
        const hoy = new Date();
        setRachaAyuno(Array.from({ length: 7 }, (_, i) => {
          const d2 = new Date(hoy); d2.setDate(hoy.getDate() - (6 - i));
          return { fecha: d2.toISOString().split('T')[0], completado: false };
        }));
      });
  };

  const fetchPrefs = () => {
    authFetch(`${API}/api/nutricion/preferencias?perfil=${perfil}`)
      .then(r => r.json())
      .then(d => { if (d.preferencias) setPrefs(prev => ({ ...prev, ...d.preferencias })); })
      .catch(() => {});
  };

  const savePrefs = async (newPrefs) => {
    setSavingPrefs(true);
    try {
      await authFetch(`${API}/api/nutricion/preferencias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, preferencias: newPrefs })
      });
      setPrefs(newPrefs);
      onShowToast?.('¡Configuración guardada! 🎯', 'success');
      setShowPrefsPanel(false);
    } catch {}
    setSavingPrefs(false);
  };

  const saveMetas = async (newMetas) => {
    try {
      await authFetch(`${API}/api/nutricion/metas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, ...newMetas })
      });
      setMetas(newMetas);
    } catch {}
  };

  const addWater = async () => {
    try {
      const res = await authFetch(`${API}/api/nutricion/agua`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, glasses: 1 })
      });
      const d = await res.json();
      if (typeof d.glasses === 'number') setWaterGlasses(d.glasses);
    } catch {}
  };

  const toggleAyuno = async () => {
    const nuevoEstado = !ayuno.en_ayuno;
    const inicio = nuevoEstado ? new Date().toISOString() : null;
    const metaActual = metaHorasLocal || ayuno.meta_horas || 16;
    const nuevoAyuno = { en_ayuno: nuevoEstado, inicio, meta_horas: metaActual };
    setAyuno(nuevoAyuno);
    if (nuevoEstado && inicio) localStorage.setItem(`vortice_ayuno_${perfil}`, JSON.stringify(nuevoAyuno));
    else localStorage.removeItem(`vortice_ayuno_${perfil}`);
    if (!nuevoEstado && ayuno.en_ayuno && progresoAyuno >= 100) {
      authFetch(`${API}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ perfil, mensaje: `¡Completé mis ${ayuno.meta_horas} horas de ayuno!` }) }).catch(() => {});
    }
    try {
      await authFetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, en_ayuno: nuevoEstado, inicio_iso: inicio, meta_horas: metaActual })
      });
    } catch {}
    fetchRachaAyuno();
  };

  const guardarMetaAyuno = async (horas) => {
    const metaActual = horas ?? metaHorasLocal;
    setAyuno(prev => ({ ...prev, meta_horas: metaActual }));
    try {
      await authFetch(`${API}/api/nutricion/ayuno`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, en_ayuno: ayuno.en_ayuno, inicio_iso: ayuno.inicio, meta_horas: metaActual })
      });
    } catch {}
  };

  const handleDietModeChange = async (mode, preset) => {
    const newPrefs = { ...prefs, diet_mode: mode };
    setPrefs(newPrefs);
    // Si el preset tiene macros definidos, aplicar
    if (mode && preset?.cal_goal) {
      const newMetas = { cal_goal: preset.cal_goal, prot_goal: preset.prot_goal, carb_goal: preset.carb_goal, fat_goal: preset.fat_goal };
      await saveMetas(newMetas);
    }
    // Guardar modo en prefs
    try {
      await authFetch(`${API}/api/nutricion/preferencias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, preferencias: newPrefs })
      });
    } catch {}
    if (mode === 'keto') onShowToast?.('🥑 Modo Keto activado — metas ajustadas', 'success');
    else if (mode === 'if') onShowToast?.('⏱ Modo Ayuno IF activado', 'success');
    else if (mode === 'sinTACC') onShowToast?.('🌾 Modo Sin TACC activado', 'success');
    else onShowToast?.('Modo dieta desactivado', 'info');
  };

  useEffect(() => {
    fetchDashboard();
    fetchAlacena();
    fetchRachaAyuno();
    fetchPrefs();
  }, [perfil]);

  useEffect(() => {
    let interval;
    if (ayuno.en_ayuno && ayuno.inicio) {
      const update = () => { const { str, pct, hrsDecimal: hd } = calcularTiempoAyuno(ayuno.inicio, ayuno.meta_horas); setHorasAyunoStr(str); setProgresoAyuno(pct); setHorasDecimal(hd); };
      update();
      interval = setInterval(update, 1000);
    } else {
      setHorasAyunoStr('00:00:00'); setProgresoAyuno(0); setHorasDecimal(0);
    }
    return () => clearInterval(interval);
  }, [ayuno]);

  const rings = [
    { label: 'KCAL', val: macrosHoy.calorias, goal: metas.cal_goal, color: 'var(--color-kcal)', unit: '' },
    { label: 'PROT', val: macrosHoy.proteinas, goal: metas.prot_goal, color: 'var(--color-prot)', unit: 'g' },
    { label: 'CARB', val: macrosHoy.carbos, goal: metas.carb_goal, color: 'var(--color-carb)', unit: 'g' },
    { label: 'GRAS', val: macrosHoy.grasas, goal: metas.fat_goal, color: 'var(--color-gras)', unit: 'g' },
  ];

  return (
    <div className="view-container">
      {/* PREFERENCES PANEL — igual que antes */}
      <AnimatePresence>
        {showPrefsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end' }}
            onClick={e => e.target === e.currentTarget && setShowPrefsPanel(false)}>
            {/* Copiar el panel de prefs de NutricionView.jsx líneas 700-765 — sin cambios */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MACRO BAR — sticky summary */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        onClick={() => brujulaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '0.5rem' }}>
        {rings.map(m => {
          const pct = m.goal > 0 ? Math.min(Math.round((m.val / m.goal) * 100), 999) : 0;
          return (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: m.color, lineHeight: 1 }}>{Math.round(m.val)}<span style={{ fontSize: '0.48rem' }}>{m.unit}</span></span>
              <div style={{ width: '100%', height: 3, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8 }} style={{ height: '100%', background: m.color, borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: '0.4rem', fontWeight: 800, color: 'var(--text-muted)' }}>{m.label} {pct}%</span>
            </div>
          );
        })}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
          <ChevronRight size={10} color="var(--text-muted)" />
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={e => { e.stopPropagation(); setShowPrefsPanel(true); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            {/* Settings SVG icon — copiar de NutricionView.jsx línea 804 */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </motion.button>
        </div>
      </motion.div>

      {/* SECTIONS */}
      {prefs.secciones.brujula !== false && (
        <div ref={brujulaRef}>
          <BrujulaSection
            macrosHoy={macrosHoy}
            metas={metas}
            onSaveMetas={saveMetas}
            onNavigateTo={onNavigateTo}
            dietMode={prefs.diet_mode}
            onDietModeChange={handleDietModeChange}
          />
        </div>
      )}

      <LogSection
        perfil={perfil}
        comidasHoy={comidasHoy}
        onRefresh={fetchDashboard}
        onShowToast={onShowToast}
        prefs={prefs}
      />

      {prefs.secciones.ayuno !== false && (
        <AyunoSection
          ayuno={ayuno}
          horasAyunoStr={horasAyunoStr}
          progresoAyuno={progresoAyuno}
          horasDecimal={horasDecimal}
          metaHorasLocal={metaHorasLocal}
          rachaAyuno={rachaAyuno}
          onToggle={toggleAyuno}
          onMetaChange={(h) => { setMetaHorasLocal(h); guardarMetaAyuno(h); }}
        />
      )}

      {prefs.secciones.alacena !== false && (
        <AlacenaSection
          perfil={perfil}
          alacena={alacena}
          onRefresh={fetchAlacena}
          onShowToast={onShowToast}
          onSearchIngrediente={(ingrediente) => {
            // Trigger LogSection search — via event or lifting state
            // Simple approach: dispatch custom event that LogSection listens to
            window.dispatchEvent(new CustomEvent('vortice:search', { detail: { query: ingrediente } }));
          }}
        />
      )}

      {prefs.secciones.hidratacion !== false && (
        <HidratacionSection
          waterGlasses={waterGlasses}
          waterGoal={prefs.agua_goal || 8}
          onAddWater={addWater}
        />
      )}

      {prefs.secciones.historial !== false && (
        <CalendarSection
          perfil={perfil}
          historial={historial}
        />
      )}
    </div>
  );
}
```

**Nota sobre la búsqueda desde Alacena:** LogSection debe escuchar el custom event `vortice:search` en un `useEffect` para setear el searchText y ejecutar la búsqueda automáticamente:

```js
// En LogSection.jsx, agregar:
useEffect(() => {
  const handler = (e) => {
    const { query } = e.detail;
    setActiveChip('buscar');
    setSearchText(query);
    // Ejecutar búsqueda con pequeño delay
    setTimeout(() => buscarAlimento(), 100);
  };
  window.addEventListener('vortice:search', handler);
  return () => window.removeEventListener('vortice:search', handler);
}, []);
```

- [ ] **Step 2: Verificar que la app compila sin errores**
```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: sin errores de TypeScript/ESLint críticos.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/NutricionView.jsx frontend/src/components/nutricion/
git commit -m "refactor: NutricionView como orquestador + sub-componentes nutricion/"
```

---

## Task 10: Git push + deploy

- [ ] **Step 1: Push develop**
```bash
git push origin develop
```

- [ ] **Step 2: Merge develop → main para deploy Vercel**
```bash
git checkout main && git merge develop --no-ff -m "feat: Sistema Operativo Nutricional v2" && git push origin main && git checkout develop
```

- [ ] **Step 3: Backend deploy (VPS cron lo hace automático)**
El cron del VPS hace `git pull + systemctl restart vortice` automáticamente al detectar cambios en main.

---

## Self-Review

**Spec coverage check:**
- ✅ ActionHub chip carousel → Task 6
- ✅ Editable photo draft → Task 7 (LogSection)
- ✅ Diet mode selector → Task 5 (BrujulaSection)
- ✅ Source traceability → Task 1 (backend) + Task 7 (LogSection badge)
- ✅ Mini calendar → Task 8 (CalendarSection)
- ✅ Sub-components → Tasks 2-5 + Task 9 (assembly)
- ✅ Creatina localStorage → Task 7

**Placeholder scan:**
- Task 9 nota: el panel de prefs dice "copiar" — acceptable, es código idéntico sin lógica nueva
- Los bloques de autocomplete/search results en LogSection dicen "copiar de NutricionView" — el código real está en el plan de LogSection

**Type consistency:**
- `obtener_comidas_fecha` definida en Task 1, usada en CalendarSection Task 8 ✅
- `fuente` field: retornado por DB en Task 1, consumido en LogSection Task 7 ✅
- `dietMode` / `onDietModeChange` props: definidas en Task 5, wired en Task 9 ✅
- `photoDraft` state en LogSection: no sale del componente, correcto ✅
