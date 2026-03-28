import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  const authLinks = document.getElementById("authLinks");
  if (!authLinks) return;

  const currentPage = window.location.pathname.split("/").pop().replace(".html", "");

  if (user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef).catch(() => null);

    if (userSnap && userSnap.exists()) {
      updateDoc(userRef, { ultimoAccesso: new Date().toISOString() }).catch(() => {});
    } else {
      setDoc(userRef, {
        email: user.email,
        registratoIl: user.metadata.creationTime
          ? new Date(user.metadata.creationTime).toISOString()
          : new Date().toISOString(),
        ultimoAccesso: new Date().toISOString()
      }).catch(() => {});
    }

    authLinks.innerHTML = `
      <li><a href="profile" class="${currentPage === "profile" ? "active" : ""}">Profilo</a></li>
      <li><a href="#" id="logoutBtn">Esci</a></li>
    `;

    document.getElementById("logoutBtn").addEventListener("click", (e) => {
      e.preventDefault();
      signOut(auth).then(() => window.location.replace("home"));
    });

  } else {
    authLinks.innerHTML = `
      <li><a href="register" class="${currentPage === "register" ? "active" : ""}">Registrati</a></li>
      <li><a href="login" class="${currentPage === "login" ? "active" : ""}">Accedi</a></li>
    `;
  }
});