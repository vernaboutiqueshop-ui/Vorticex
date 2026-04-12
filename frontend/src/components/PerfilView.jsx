import { useState, useEffect, useCallback } from 'react';
import { User, Save, RefreshCw, LogOut, Zap } from 'lucide-react';
import API from '../config';

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

  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [errorAudit, setErrorAudit] = useState(null);

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
      console.error("Error saving perfil:", e);
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
      
      {/* 1. Usuario Activo + AUDITORÍA (v3.1) */}
      <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} color="var(--accent-color)" /> Usuario Activo
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(56,189,248,0.07)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>
            {perfil.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{perfil}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-nutri)', fontWeight: 600 }}>v3.1 Elite Edition</div>
          </div>
          <span className="dot pulse" style={{ marginLeft: 'auto' }}></span>
        </div>

        {/* Auditoría Interna - Integrada en la primera tarjeta */}
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🔍 Sistema v3.1
            </span>
            <button 
              className="btn" 
              style={{ width: 'auto', marginBottom: 0, padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
              onClick={async () => {
                 setLoadingAudit(true);
                 setErrorAudit(null);
                 try {
                   const res = await fetch(`${API}/api/logs?perfil=${perfil}`);
                   const data = await res.json();
                   if (data.status === 'success') setAuditLogs(data.logs);
                   else setErrorAudit(data.error || 'Err');
                 } catch (e) {
                   setErrorAudit('Link Error');
                 }
                 setLoadingAudit(false);
              }}
              disabled={loadingAudit}
            >
              {loadingAudit ? '...' : 'Refrescar'}
            </button>
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.7rem' }}>
            {auditLogs && auditLogs.length > 0 ? auditLogs.map((log, i) => (
              <div key={i} style={{ padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{log.type}</span>
                <span style={{ opacity: 0.9 }}>{log.description}</span>
              </div>
            )) : <div style={{ opacity: 0.5, textAlign: 'center', padding: '0.5rem' }}>Sin logs recientes.</div>}
            {errorAudit && <div style={{ color: 'var(--danger-color)', textAlign: 'center' }}>{errorAudit}</div>}
          </div>
        </div>
      </div>

      {/* 2. Configuración de IA */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#38bdf8' }}>⚙️ Configuración</h2>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: 'auto', marginBottom: 0, padding: '0.5rem 1rem' }}>
            {saving ? '...' : <Save size={16} />} 
          </button>
        </div>
        
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <input 
            className="chat-input"
            value={perfilData.descripcion}
            onChange={e => setPerfilData({...perfilData, descripcion: e.target.value})}
            placeholder="Descripción corta..."
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <textarea 
            className="chat-input"
            style={{ width: '100%', height: '60px', paddingTop: '0.75rem' }}
            value={perfilData.detalle}
            onChange={e => setPerfilData({...perfilData, detalle: e.target.value})}
            placeholder="Detalle de rutina..."
          />
        </div>

        <div className="form-group">
          <textarea 
            className="chat-input"
            style={{ width: '100%', height: '60px', border: '1px solid rgba(56, 189, 248, 0.2)', paddingTop: '0.75rem' }}
            value={perfilData.objetivo_ia}
            onChange={e => setPerfilData({...perfilData, objetivo_ia: e.target.value})}
            placeholder="Consigna IA..."
          />
        </div>
      </div>

      {/* 3. Memoria Viva */}
      <div className="card" style={{ borderLeft: '3px solid #38bdf8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} color="#38bdf8" /> Memoria Viva
          </h2>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
            onClick={handleRefreshMemoria}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
          "{perfilData.memoria_viva}"
        </div>
      </div>

      <button 
        className="btn" 
        style={{ background: 'transparent', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', marginTop: '0.5rem' }} 
        onClick={onLogout}
      >
        <LogOut size={18} /> Cerrar Sesión
      </button>

    </div>
  );
}
