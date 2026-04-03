import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace this with your project's configuration from the Firebase Console
// Go to Settings > Project Settings > Your Apps > Firebase SDK config
const firebaseConfig = {
  apiKey: "AIzaSyC2aJeNNDK40dTb6n66QXrS7aDfsiDcwFQ",
  authDomain: "journal-eef46.firebaseapp.com",
  projectId: "journal-eef46",
  storageBucket: "journal-eef46.firebasestorage.app",
  messagingSenderId: "325588171541",
  appId: "1:325588171541:web:d93389b2f023418b8b471c",
  measurementId: "G-B8LQZDF3YR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
