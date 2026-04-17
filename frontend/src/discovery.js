import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Escucha cambios en la URL del servidor en tiempo real.
 * @param {Function} callback - Función que recibe la nueva URL.
 * @returns {Function} - Función para cancelar la suscripción.
 */
export const subscribeToApiUrl = (callback) => {
  const docRef = doc(db, "config", "server");
  
  // Usamos onSnapshot para que si el backend se reinicia y cambia la URL, 
  // el frontend se entere al instante sin recargar la página.
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      if (data.url) {
        console.log("[DISCOVERY] Nueva API URL detectada:", data.url);
        callback(data.url);
      }
    } else {
      console.warn("[DISCOVERY] No se encontró el documento de configuración en Firebase.");
    }
  });
};
