import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signInWithPopup, sendEmailVerification, signOut, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const provider = new GoogleAuthProvider();

const form = document.getElementById("loginForm");
const errorEl = document.getElementById("loginError");
const googleBtn = document.getElementById("googleBtn");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await signOut(auth);
        errorEl.innerHTML = `Email non verificata. <button type="button" id="resendBtn" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:inherit;text-decoration:underline;padding:0;">Reinvia email</button>`;
        document.getElementById("resendBtn").addEventListener("click", async () => {
          try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(cred.user);
            await signOut(auth);
            errorEl.textContent = "Email di verifica inviata! Controlla la tua casella.";
          } catch {
            errorEl.textContent = "Errore nell'invio. Riprova più tardi.";
          }
        });
        return;
      }

      window.location.replace("profile");

    } catch (error) {
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/invalid-credential":
          errorEl.textContent = "Email o password errati.";
          break;
        case "auth/wrong-password":
          errorEl.textContent = "Password errata.";
          break;
        case "auth/invalid-email":
          errorEl.textContent = "Email non valida.";
          break;
        case "auth/too-many-requests":
          errorEl.textContent = "Troppi tentativi. Riprova più tardi.";
          break;
        default:
          errorEl.textContent = "Errore durante l'accesso.";
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