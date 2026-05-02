import { useState, useEffect, useCallback } from 'react';
import { authFetch, API } from '../config';

/**
 * Hook para auto-guardar datos con debounce
 * @param {Object} data - Datos a guardar
 * @param {string} key - Clave para localStorage
 * @param {number} delay - Delay en ms (default: 3000)
 * @param {Function} onSave - Callback opcional al guardar
 */
export function useAutoSave(data, key, delay = 3000, onSave = null) {
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;

    setHasChanges(true);
    setIsSaving(false);

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        
        // 1. Guardar en localStorage (siempre funciona)
        localStorage.setItem(`draft_${key}`, JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));

        // 2. Llamar al callback si existe
        if (onSave) {
          await onSave(data);
        }

        setLastSaved(new Date());
        setHasChanges(false);
      } catch (error) {
        console.error('[AutoSave] Error:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [data, key, delay, onSave]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(`draft_${key}`);
    setLastSaved(null);
    setHasChanges(false);
  }, [key]);

  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(`draft_${key}`);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        return { data, timestamp };
      }
      return null;
    } catch {
      return null;
    }
  }, [key]);

  return { 
    lastSaved, 
    isSaving, 
    hasChanges, 
    clearDraft, 
    restoreDraft 
  };
}

/**
 * Hook específico para rutinas de gym
 */
export function useRutinaDraft(perfil, rutinaId = null) {
  const key = `rutina_${perfil}_${rutinaId || 'nueva'}`;
  
  const saveToBackend = useCallback(async (rutinaData) => {
    // Solo si tiene ID (rutina existente)
    if (rutinaId) {
      try {
        await authFetch(`${API}/api/gym/rutinas/${rutinaId}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ejercicios: rutinaData.ejercicios,
            updated_at: new Date().toISOString()
          })
        });
      } catch (e) {
        // Silencioso — localStorage ya guardó
        console.warn('[RutinaDraft] Backend save failed, keeping local:', e);
      }
    }
  }, [rutinaId]);

  return useAutoSave(rutinaData, key, 3000, saveToBackend);
}
