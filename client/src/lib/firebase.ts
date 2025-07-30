import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebasestorage.app`,
  messagingSenderId: "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Connect to emulator in development if no API key is provided
if (!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch (error) {
    // Emulator already connected or not available
  }
}

export default app;