import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAW5dUXdLAEtcjeJrKQycIWcg_Xrj3yfRs",
  authDomain: "lyric-book-generator.firebaseapp.com",
  projectId: "lyric-book-generator",
  storageBucket: "lyric-book-generator.firebasestorage.app",
  messagingSenderId: "343385750518",
  appId: "1:343385750518:web:be6c826d7560860212a5d7"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
