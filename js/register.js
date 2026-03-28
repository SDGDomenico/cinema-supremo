import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithPopup, sendEmailVerification, signOut, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const AVATARS = Array.from({ length: 10 }, (_, i) => `avatar-${i + 1}.png`);
const provider = new GoogleAuthProvider();
const fromGoogle = new URLSearchParams(window.location.search).get("from") === "google";

const form = document.getElementById("registerForm");
const errorEl = document.getElementById("registerError");
const googleBtn = document.getElementById("googleBtn");
const emailPasswordSection = document.getElementById("emailPasswordSection");
const heroTitle = document.getElementById("registerHeroTitle");
const heroText = document.getElementById("registerHeroText");
const formTitle = document.getElementById("registerFormTitle");
const submitBtn = document.getElementById("submitBtn");

if (fromGoogle) {
  if (emailPasswordSection) emailPasswordSection.style.display = "none";
  if (heroTitle) heroTitle.textContent = "Completa il tuo profilo";
  if (heroText) heroText.textContent = "Scegli come vuoi apparire su CinemaSupremo.";
  if (formTitle) formTitle.textContent = "Il tuo profilo";
  if (submitBtn) submitBtn.textContent = "Salva e continua";
}

const grid = document.getElementById("registerAvatarGrid");
if (grid) {
  AVATARS.forEach(name => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "register-avatar-option";
    btn.dataset.avatar = name;
    btn.setAttribute("aria-label", name);
    btn.innerHTML = `<img src="assets/avatars/${name}" alt="${name}">`;
    btn.addEventListener("click", () => {
      grid.querySelectorAll(".register-avatar-option").forEach(b => b.classList.remove("register-avatar-option--active"));
      btn.classList.add("register-avatar-option--active");
      document.getElementById("selectedAvatar").value = name;
    });
    grid.appendChild(btn);
  });
}

function validate(checkEmailPassword = true) {
  const displayName = document.getElementById("displayName").value.trim();
  const nickname = document.getElementById("nickname").value.trim();
  const avatar = document.getElementById("selectedAvatar").value;

  if (checkEmailPassword) {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (!email) { errorEl.textContent = "Inserisci un'email."; return false; }
    if (!password) { errorEl.textContent = "Inserisci una password."; return false; }
  }

  if (!displayName) { errorEl.textContent = "Inserisci un nome visualizzato."; return false; }
  if (!nickname) { errorEl.textContent = "Inserisci un nickname."; return false; }
  if (!/^[a-zA-Z0-9_]+$/.test(nickname)) { errorEl.textContent = "Il nickname può contenere solo lettere, numeri e underscore."; return false; }
  if (!avatar) { errorEl.textContent = "Scegli un avatar."; return false; }
  return true;
}

async function isNicknameTaken(nickname) {
  const snap = await getDoc(doc(db, "nicknames", nickname.toLowerCase())).catch(() => null);
  return snap && snap.exists();
}

async function saveProfile(uid, email, displayName, nickname, avatar) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref).catch(() => null);
  if (snap && snap.exists()) {
    await updateDoc(ref, { displayName, nickname, avatar });
  } else {
    await setDoc(ref, {
      email,
      displayName,
      nickname,
      avatar,
      registratoIl: new Date().toISOString(),
      ultimoAccesso: new Date().toISOString()
    });
  }
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    if (fromGoogle) {
      if (!validate(false)) return;

      const user = auth.currentUser;
      if (!user) { errorEl.textContent = "Sessione scaduta. Riprova."; return; }

      const displayName = document.getElementById("displayName").value.trim();
      const nickname = document.getElementById("nickname").value.trim();
      const avatar = document.getElementById("selectedAvatar").value;

      try {
        if (await isNicknameTaken(nickname)) {
          errorEl.textContent = "Questo nickname è già in uso. Scegline un altro.";
          return;
        }
        await saveProfile(user.uid, user.email, displayName, nickname, avatar);
        await setDoc(doc(db, "nicknames", nickname.toLowerCase()), { uid: user.uid });
        window.location.replace("profile");
      } catch {
        errorEl.textContent = "Errore nel salvataggio. Riprova.";
      }

    } else {
      if (!validate(true)) return;

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const displayName = document.getElementById("displayName").value.trim();
      const nickname = document.getElementById("nickname").value.trim();
      const avatar = document.getElementById("selectedAvatar").value;

      try {
        if (await isNicknameTaken(nickname)) {
          errorEl.textContent = "Questo nickname è già in uso. Scegline un altro.";
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await saveProfile(userCredential.user.uid, email, displayName, nickname, avatar);
        await setDoc(doc(db, "nicknames", nickname.toLowerCase()), { uid: userCredential.user.uid });
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        window.location.replace("verify");
      } catch (error) {
        switch (error.code) {
          case "auth/email-already-in-use": errorEl.textContent = "Esiste già un account con questa email."; break;
          case "auth/invalid-email": errorEl.textContent = "Email non valida."; break;
          case "auth/weak-password": errorEl.textContent = "La password deve essere di almeno 6 caratteri."; break;
          default: errorEl.textContent = "Errore durante la registrazione.";
        }
      }
    }
  });
}

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    errorEl.textContent = "";
    try {
      const result = await signInWithPopup(auth, provider);
      const snap = await getDoc(doc(db, "users", result.user.uid)).catch(() => null);

      if (snap && snap.exists() && snap.data().displayName) {
        window.location.replace("profile");
      } else {
        window.location.replace("register?from=google");
      }
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user") {
        errorEl.textContent = "Errore con Google. Riprova.";
      }
    }
  });
}