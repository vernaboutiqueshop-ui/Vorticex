import { useState, useEffect, useCallback } from 'react';
import { API, authFetch } from '../../../config';

/**
 * Hook para manejar datos de gym (rutinas, ejercicios, carpetas)
 */
export function useGymData(perfil) {
  const [ejerciciosMaster, setEjerciciosMaster] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!perfil) return;
    
    try {
      setLoading(true);
      setError(null);

      const [rutinasRes, foldersRes, ejerciciosRes] = await Promise.all([
        authFetch(`${API}/api/gym/rutinas?perfil=${perfil}`),
        authFetch(`${API}/api/gym/folders?perfil=${perfil}`),
        authFetch(`${API}/api/exercises`),
      ]);

      const rutinasData = await rutinasRes.json();
      const foldersData = await foldersRes.json();
      const ejerciciosData = await ejerciciosRes.json();

      if (rutinasData.status === 'success') setRutinas(rutinasData.rutinas || []);
      if (foldersData.status === 'success') setFolders(foldersData.folders || []);
      if (ejerciciosData.status === 'success') setEjerciciosMaster(ejerciciosData.ejercicios || []);

    } catch (err) {
      console.error('[useGymData] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [perfil]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    ejerciciosMaster,
    rutinas,
    folders,
    loading,
    error,
    refetch,
    // Setters para actualizaciones optimistas
    setRutinas,
    setFolders,
  };
}

/**
 * Hook para manejar el builder de rutinas con auto-save
 */
export function useRoutineBuilder(perfil, routineId = null) {
  const [routineName, setRoutineName] = useState('');
  const [builderExercises, setBuilderExercises] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Auto-save draft
  useEffect(() => {
    if (!hasChanges || !perfil) return;

    const timer = setTimeout(() => {
      const draft = {
        routineName,
        builderExercises,
        selectedFolderId,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`gym_draft_${perfil}_${routineId || 'new'}`, JSON.stringify(draft));
      console.log('[useRoutineBuilder] Auto-saved draft');
    }, 3000);

    return () => clearTimeout(timer);
  }, [routineName, builderExercises, selectedFolderId, hasChanges, perfil, routineId]);

  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(`gym_draft_${perfil}_${routineId || 'new'}`);
      if (saved) {
        const draft = JSON.parse(saved);
        setRoutineName(draft.routineName || '');
        setBuilderExercises(draft.builderExercises || []);
        setSelectedFolderId(draft.selectedFolderId || null);
        return true;
      }
    } catch (e) {
      console.error('[useRoutineBuilder] Error restoring draft:', e);
    }
    return false;
  }, [perfil, routineId]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(`gym_draft_${perfil}_${routineId || 'new'}`);
    setHasChanges(false);
  }, [perfil, routineId]);

  const addExercise = useCallback((exercise) => {
    setBuilderExercises(prev => [...prev, { ...exercise, sets_data: [{ reps: 12, kg: '', type: 'normal' }] }]);
    setHasChanges(true);
  }, []);

  const removeExercise = useCallback((index) => {
    setBuilderExercises(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  }, []);

  const updateExerciseSets = useCallback((index, sets_data) => {
    setBuilderExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], sets_data };
      return updated;
    });
    setHasChanges(true);
  }, []);

  const reorderExercises = useCallback((newOrder) => {
    setBuilderExercises(newOrder);
    setHasChanges(true);
  }, []);

  return {
    routineName,
    setRoutineName: (v) => { setRoutineName(v); setHasChanges(true); },
    builderExercises,
    selectedFolderId,
    setSelectedFolderId: (v) => { setSelectedFolderId(v); setHasChanges(true); },
    isCreating,
    setIsCreating,
    hasChanges,
    addExercise,
    removeExercise,
    updateExerciseSets,
    reorderExercises,
    restoreDraft,
    clearDraft,
  };
}
