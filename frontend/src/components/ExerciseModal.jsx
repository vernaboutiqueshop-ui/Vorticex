import React from 'react';
import { X, Play, Info, Dumbbell, Target } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function ExerciseModal({ exercise, onClose, lang }) {
  if (!exercise) return null;

  const instructions = lang === 'en' ? (exercise.instrucciones_en || []) : (exercise.instrucciones_es || []);
  const name = lang === 'en' ? (exercise.nombre_en || exercise.nombre_es) : (exercise.nombre_es || exercise.name);

  return (
    <div className="modal-overlay" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div className="modal-content animate-slide-up" style={{
        width: '100%', maxWidth: '500px', backgroundColor: 'var(--surface-2)',
        borderTopLeftRadius: '30px', borderTopRightRadius: '30px',
        padding: '2rem', maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid var(--border-default)', borderBottom: 'none'
      }}>
        <div style={{ width: '40px', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 1.5rem' }} onClick={onClose} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{name}</h2>
            <div style={{ color: 'var(--accent-gym)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.25rem' }}>{exercise.target}</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: '50%', padding: '0.5rem', color: 'white' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', marginBottom: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <img 
            src={exercise.gif_url || `/gifs/${exercise.id_ejercicio || exercise.id}.gif`} 
            alt={name} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--surface-1)', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <Dumbbell size={20} color="var(--accent-gym)" />
             <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>EQUIPMENT</div>
                <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>{exercise.equipment || 'None'}</div>
             </div>
          </div>
          <div style={{ background: 'var(--surface-1)', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <Target size={20} color="#10b981" />
             <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>BODY PART</div>
                <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>{exercise.body_part || 'Full Body'}</div>
             </div>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Info size={18} color="var(--accent-gym)" /> {lang === 'en' ? 'Instructions' : 'Instrucciones'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {instructions.length > 0 ? instructions.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--accent-gym)', fontWeight: 900, fontSize: '0.9rem' }}>{i + 1}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>{step}</div>
              </div>
            )) : <p style={{ color: 'var(--text-muted)' }}>{lang === 'en' ? 'No instructions available.' : 'No hay instrucciones disponibles.'}</p>}
          </div>
        </div>

        <button onClick={onClose} className="hevy-btn hevy-btn-primary" style={{ width: '100%', padding: '1.25rem', borderRadius: '16px', fontSize: '1rem' }}>
          {lang === 'en' ? 'Got it' : 'Entendido'}
        </button>
      </div>
    </div>
  );
}
