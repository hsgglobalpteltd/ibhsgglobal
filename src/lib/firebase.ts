import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCWpOhgBR1RvDhtRSVCsXP11FHjeUn2iRw",
  authDomain: "ib-hsg-global.firebaseapp.com",
  projectId: "ib-hsg-global",
  storageBucket: "ib-hsg-global.firebasestorage.app",
  messagingSenderId: "591203722314",
  appId: "1:591203722314:web:18e0204e5c148f6a53b2b3",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup, signOut };
