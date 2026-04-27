import React, { createContext, useState, useContext, useEffect } from 'react';

const translations = {
  es: {
    gym: "Gym",
    nutrition: "Nutrición",
    stats: "Estadísticas",
    profile: "Perfil",
    train: "Entrenar",
    explore: "Explorar",
    history: "Historial",
    new_routine: "NUEVA RUTINA",
    new_folder: "NUEVA CARPETA",
    my_routines: "MIS RUTINAS",
    active_session: "Sesión Actual",
    finish_workout: "TERMINAR ENTRENAMIENTO",
    add_exercise: "Añadir ejercicio",
    search_placeholder: "¿Qué entrenamos hoy?",
    physical_config: "Configuración Física",
    age: "EDAD",
    weight: "PESO (KG)",
    height: "ALTURA (CM)",
    language: "IDIOMA",
    save: "GUARDAR",
    feedback_title: "Envíanos tus comentarios",
    feedback_placeholder: "¿Cómo podemos mejorar Vórtice?",
    send_feedback: "ENVIAR COMENTARIOS",
    logout: "Cerrar Sesión",
    level: "NIVEL",
    intensity: "INTENSIDAD ACTUAL"
  },
  en: {
    gym: "Gym",
    nutrition: "Nutrition",
    stats: "Stats",
    profile: "Profile",
    train: "Train",
    explore: "Explore",
    history: "History",
    new_routine: "NEW ROUTINE",
    new_folder: "NEW FOLDER",
    my_routines: "MY ROUTINES",
    active_session: "Active Session",
    finish_workout: "FINISH WORKOUT",
    add_exercise: "Add exercise",
    search_placeholder: "What are we training today?",
    physical_config: "Physical Stats",
    age: "AGE",
    weight: "WEIGHT (KG)",
    height: "HEIGHT (CM)",
    language: "LANGUAGE",
    save: "SAVE",
    feedback_title: "Send us your feedback",
    feedback_placeholder: "How can we improve Vórtice?",
    send_feedback: "SEND FEEDBACK",
    logout: "Log Out",
    level: "LEVEL",
    intensity: "CURRENT INTENSITY"
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('vortice_lang') || 'es');

  useEffect(() => {
    localStorage.setItem('vortice_lang', lang);
  }, [lang]);

  const t = (key) => translations[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
