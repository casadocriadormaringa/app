import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
let dbInstance;
try {
  dbInstance = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (error) {
  console.error('Firebase: Erro ao inicializar Firestore com banco nomeado, tentando padrão:', error);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const auth = getAuth(app);
