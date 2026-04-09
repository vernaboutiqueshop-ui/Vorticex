import { useState, useEffect, useCallback } from 'react';
import { User, Save, RefreshCw, LogOut, ChevronRight, Zap } from 'lucide-react';

const API = 'http://localhost:8000';

export default function PerfilView({ perfil, onLogout }) {
  const [perfilData, setPerfilData] = useState({
    descripcion: '',
    detalle: '',
    objetivo_ia: '',
    memoria_viva: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPerfil = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/perfil/${perfil}`);
      const data = await res.json();
      if (data.perfil) setPerfilData(data.perfil);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [perfil]);

  useEffect(() => {
    fetchPerfil();
  }, [perfil, fetchPerfil]);

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
      
      {/* 1. Usuario Activo */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} color="var(--accent-color)" /> Usuario Activo
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(56,189,248,0.07)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>
            {perfil.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{perfil}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sesión activa</div>
          </div>
          <span className="dot pulse" style={{ marginLeft: 'auto' }}></span>
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
            style={{ width: '100%', fontFamily: 'inherit' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Detalle de Rutina actual</label>
          <textarea 
            className="chat-input"
            style={{ width: '100%', height: '80px', paddingTop: '0.75rem', fontFamily: 'inherit', resize: 'vertical' }}
            value={perfilData.detalle}
            onChange={e => setPerfilData({...perfilData, detalle: e.target.value})}
            placeholder="Ej: Empuje, Tracción, Pierna 3 veces por semana..."
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Consigna para la IA (Su personalidad contigo)</label>
          <textarea 
            className="chat-input"
            style={{ width: '100%', height: '80px', border: '1px solid rgba(56, 189, 248, 0.2)', paddingTop: '0.75rem', fontFamily: 'inherit', resize: 'vertical' }}
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

      <button 
        className="btn" 
        style={{ background: 'transparent', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', marginTop: '1rem' }} 
        onClick={onLogout}
      >
        <LogOut size={18} /> Cerrar Sesión
      </button>

    </div>
  );
}
