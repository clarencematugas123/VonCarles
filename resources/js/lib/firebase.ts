import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
const hasRealFirebaseConfig = Boolean(
    firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId &&
        firebaseConfig.appId &&
        firebaseConfig.projectId !== 'student-record-demo',
);

const app = hasRealFirebaseConfig
    ? getApps().length
        ? getApp()
        : initializeApp(firebaseConfig)
    : null;

export const db = app ? getFirestore(app) : null;

if (db && useEmulator && typeof window !== 'undefined') {
    try {
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
    } catch {
        // Ignore emulator setup issues so the app can still run without a local emulator.
    }
}

export const firebaseIsConfigured = hasRealFirebaseConfig;
