import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBck7B5h-Ym_1IlPzkNyA71CXiPCPl20hw",
    authDomain: "mybookshelf-1cd84.firebaseapp.com",
    projectId: "mybookshelf-1cd84",
    storageBucket: "mybookshelf-1cd84.firebasestorage.app",
    messagingSenderId: "639789266327",
    appId: "1:639789266327:web:2d6b4e188187f5a6bc40d2",
    measurementId: "G-111CWNH6BZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
