import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdeLWvF7UFK9mn5xYr8SkjiS2z1Ft7Nfs",
  authDomain: "cinemasupremo-d9943.firebaseapp.com",
  projectId: "cinemasupremo-d9943",
  storageBucket: "cinemasupremo-d9943.firebasestorage.app",
  messagingSenderId: "511598571592",
  appId: "1:511598571592:web:5a87e992e7ad0b6096e87d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);