import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD5O7yUkf_mOm3koUbtu4gdtHpkmIdga80",
  authDomain: "bean-98667.firebaseapp.com",
  projectId: "bean-98667",
  storageBucket: "bean-98667.firebasestorage.app",
  messagingSenderId: "146837032163",
  appId: "1:146837032163:web:43e76e30c74acaf8f089d6",
  measurementId: "G-EX3ERB57DG"
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleAuthProvider = new GoogleAuthProvider();
export const firestoreDb = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

setPersistence(firebaseAuth, browserLocalPersistence).catch(() => undefined);

