import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
let dbInstance;
try {
  dbInstance = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
  
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(dbInstance).catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore: Persistence failed-precondition');
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore: Persistence unimplemented');
      }
    });
  }
} catch (error) {
  console.error('Firebase: Erro ao inicializar Firestore com banco nomeado, tentando padrão:', error);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const auth = getAuth(app);
