import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Konfigurasi Database Bosku
const firebaseConfig = {
    apiKey: "AIzaSyAWi2L7bJewUmTeR_SwGM0sdwjFLdOisCs",
    authDomain: "kasir-128a2.firebaseapp.com",
    projectId: "kasir-128a2",
    storageBucket: "kasir-128a2.firebasestorage.app",
    messagingSenderId: "566922594063",
    appId: "1:566922594063:web:c251d0943a0e20ab51a07a",
    measurementId: "G-NM9MSXY677"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Export db agar bisa dipakai oleh app.js
export const db = getFirestore(app);
