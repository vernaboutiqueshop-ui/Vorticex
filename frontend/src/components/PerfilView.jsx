import { useState, useEffect, useCallback } from 'react';
import { User, Save, LogOut, MessageSquare, Globe, Scale, Ruler, Calendar, ChevronRight, Check } from 'lucide-react';
import API from '../config';
import MuscleMap from './MuscleMap';
import { useLanguage } from '../LanguageContext';

export default function PerfilView({ perfil, onLogout }) {
  const { t, lang, setLang } = useLanguage();
  const [userData, setUserData] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    level: 1,
    exp: 0
  });
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRoutines, setActiveRoutines] = useState([]);
  const [realIntensity, setRealIntensity] = useState([]);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/perfil/${perfil}`);
      const data = await res.json();
      if (data.perfil) {
        setUserData({
          name: perfil,
          age: data.perfil.age || '',
          weight: data.perfil.weight || '',
          height: data.perfil.height || '',
          level: data.perfil.level || 1,
          exp: data.perfil.exp || 0
        });
      }
      const resR = await fetch(`${API}/api/gym/rutinas?perfil=${perfil}`);
      const dataR = await resR.json();
      if (dataR.status === 'success') setActiveRoutines(dataR.rutinas);
      const resI = await fetch(`${API}/api/gym/intensidad?perfil=${perfil}`);
      const dataI = await resI.json();
      if (dataI.status === 'success') setRealIntensity(dataI.intensidad);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [perfil]);

  useEffect(() => {
    fetchUserData();
  }, [perfil, fetchUserData]);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/perfil/${perfil}/update_stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, language: lang })
      });
      alert(lang === 'es' ? '¡Perfil actualizado!' : 'Profile updated!');
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (loading) return <div className="loading-state">...</div>;

  const allTargets = [
    ...activeRoutines.flatMap(r => r.ejercicios.map(e => e.target)),
    ...realIntensity.map(i => i.target)
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem', maxWidth: '500px', margin: '0 auto' }}>
      
      {/* HEADER PREMIUM */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
         <div style={{ width: '64px', height: '64px', borderRadius: '22px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 900, color: 'white', boxShadow: '0 8px 20px rgba(6, 182, 212, 0.2)' }}>
            {perfil.charAt(0).toUpperCase()}
         </div>
         <div style={{ flex: 1 }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{perfil}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.3rem' }}>
               <div style={{ background: 'var(--accent-gym)', color: 'black', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900 }}>{t('level')} {userData.level}</div>
               <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>{userData.exp} EXP</div>
            </div>
         </div>
         <button onClick={onLogout} style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', padding: '0.8rem', borderRadius: '18px', transition: 'all 0.2s' }}><LogOut size={22}/></button>
      </div>

      {/* MUSCLE HEATMAP (ELITE LOOK) */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '32px', padding: '2rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
         <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)' }}></div>
         <h3 style={{ color: 'white', marginTop: 0, fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', color: '#94a3b8' }}>{t('intensity')}</h3>
         <div style={{ height: '240px', margin: '1.5rem 0' }}>
            <MuscleMap targets={allTargets} />
         </div>
      </div>

      {/* SELECTOR DE IDIOMA (RADIO BUTTONS PREMIUM) */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
         <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} color="var(--accent-gym)" /> {t('language')}
         </h3>
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {['es', 'en'].map(l => (
               <button 
                 key={l}
                 onClick={() => setLang(l)}
                 style={{ 
                   padding: '1rem', 
                   borderRadius: '16px', 
                   background: lang === l ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.03)', 
                   border: lang === l ? '1px solid var(--accent-gym)' : '1px solid transparent',
                   color: lang === l ? 'white' : '#64748b',
                   fontWeight: 800,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   gap: '0.75rem',
                   transition: 'all 0.2s',
                   fontSize: '0.9rem'
                 }}
               >
                  <span style={{ fontSize: '1.4rem' }}>{l === 'es' ? '🇪🇸' : '🇺🇸'}</span>
                  {l === 'es' ? 'ESPAÑOL' : 'ENGLISH'}
               </button>
            ))}
         </div>
      </div>

      {/* CONFIGURACIÓN FÍSICA (PREMIUM INPUTS) */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{t('physical_config')}</h3>
            <button onClick={handleUpdateProfile} disabled={saving} style={{ background: 'var(--accent-gym)', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '12px', color: 'black', fontWeight: 900, fontSize: '0.8rem' }}>
               {saving ? '...' : t('save')}
            </button>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { id: 'age', label: t('age'), icon: Calendar, value: userData.age },
              { id: 'weight', label: t('weight'), icon: Scale, value: userData.weight },
              { id: 'height', label: t('height'), icon: Ruler, value: userData.height }
            ].map(f => (
               <div key={f.id} style={{ position: 'relative' }}>
                  <label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 800, position: 'absolute', top: '10px', left: '1rem', zIndex: 1 }}>{f.label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.8rem 1rem 0.8rem 1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <f.icon size={18} color="var(--accent-gym)" style={{ marginRight: '0.75rem' }} />
                     <input 
                       type="number" 
                       value={f.value} 
                       onChange={e => setUserData({...userData, [f.id]: e.target.value})} 
                       style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 700, width: '100%', fontSize: '1.1rem', outline: 'none' }} 
                     />
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* FEEDBACK BOX */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
         <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} color="var(--accent-gym)" /> {t('feedback_title')}
         </h3>
         <textarea 
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder={t('feedback_placeholder')} 
            style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1rem', color: 'white', fontSize: '0.9rem', resize: 'none', outline: 'none' }}
         />
         <button 
           onClick={() => {}}
           style={{ width: '100%', marginTop: '1rem', padding: '1.1rem', borderRadius: '18px', background: 'white', color: 'black', border: 'none', fontWeight: 900, cursor: 'pointer' }}
         >
            {t('send_feedback')}
         </button>
      </div>
    </div>
  );
}
