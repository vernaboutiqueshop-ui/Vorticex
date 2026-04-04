import { useState, useEffect } from 'react';
import { User, Save, RefreshCw, LogOut, ChevronRight, Zap } from 'lucide-react';

const API = 'http://localhost:8000';

export default function PerfilView({ perfil, perfiles, onChangePerfil }) {
  const [perfilData, setPerfilData] = useState({
    descripcion: '',
    detalle: '',
    objetivo_ia: '',
    memoria_viva: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPerfil = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/perfil/${perfil}`);
      const data = await res.json();
      if (data.perfil) setPerfilData(data.perfil);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPerfil();
  }, [perfil]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/perfil/${perfil}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: perfilData.descripcion,
          detalle: perfilData.detalle,
          objetivo_ia: perfilData.objetivo_ia
        })
      });
      alert('Perfil actualizado con éxito');
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleRefreshMemoria = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API}/api/memoria/refresh?perfil=${perfil}`, { method: 'POST' });
      await fetchPerfil();
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  };

  if (loading) return <div className="loading-state">Interpretando identidad...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      
      {/* 1. Selector de Perfil (Migrado del header) */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} color="var(--accent-color)" /> Usuario Activo
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {perfiles.map(p => (
            <button 
              key={p} 
              className={`suggestion-chip ${perfil === p ? 'active' : ''}`}
              onClick={() => onChangePerfil(p)}
              style={{
                background: perfil === p ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                color: perfil === p ? '#000' : 'var(--text-primary)',
                padding: '0.6rem 1.2rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Configuración de IA y Perfil */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#38bdf8' }}>⚙️ Configuración Vórtice</h2>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: 'auto', marginBottom: 0, padding: '0.5rem 1rem' }}>
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} 
            <span>{saving ? 'Guardando' : 'Guardar'}</span>
          </button>
        </div>
        
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Tu descripción corta</label>
          <input 
            className="chat-input"
            value={perfilData.descripcion}
            onChange={e => setPerfilData({...perfilData, descripcion: e.target.value})}
            placeholder="Ej: Programador, 32 años, foco en hipertrofia"
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Detalle de Rutina actual</label>
          <textarea 
            className="chat-input"
            style={{ height: '80px', paddingTop: '0.75rem' }}
            value={perfilData.detalle}
            onChange={e => setPerfilData({...perfilData, detalle: e.target.value})}
            placeholder="Ej: Empuje, Tracción, Pierna 3 veces por semana..."
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Consigna para la IA (Su personalidad contigo)</label>
          <textarea 
            className="chat-input"
            style={{ height: '80px', border: '1px solid rgba(56, 189, 248, 0.2)', paddingTop: '0.75rem' }}
            value={perfilData.objetivo_ia}
            onChange={e => setPerfilData({...perfilData, objetivo_ia: e.target.value})}
            placeholder="Ej: Sé muy exigente con mi nutrición, no me dejes pasar ni una. En el gym motiva al máximo."
          />
        </div>
      </div>

      {/* 3. Memoria Viva (AI Narration) */}
      <div className="card" style={{ borderLeft: '3px solid #38bdf8', background: 'linear-gradient(135deg, var(--bg-card), rgba(56, 189, 248, 0.05))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} color="#38bdf8" /> Memoria Viva actual
          </h2>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={handleRefreshMemoria}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
        <div style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--text-primary)', fontStyle: 'italic', padding: '0.5rem 0' }}>
          "{perfilData.memoria_viva}"
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Este párrafo es lo que la IA "sabe" de vos. Evoluciona con cada chat y cada entrenamiento.
        </div>
      </div>

      <button className="btn" style={{ background: 'transparent', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', marginTop: '1rem' }} onClick={() => alert('Cerrando sesión...')}>
        <LogOut size={18} /> Cerrar Sesión
      </button>

    </div>
  );
}
