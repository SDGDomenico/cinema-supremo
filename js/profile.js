import { auth, db } from "./firebase.js";
import { onAuthStateChanged, sendPasswordResetEmail, deleteUser, verifyBeforeUpdateEmail, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, getDocs, updateDoc, deleteDoc, setDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAllFavorites } from "./favorites.js";

const ADMIN_EMAIL = "domenicosdgcisternino@gmail.com";
const AVATARS = Array.from({ length: 10 }, (_, i) => `avatar-${i + 1}.png`);
const content = document.getElementById("profilo-content");

let currentUser = null;
let currentAvatar = null;
let currentDisplayName = null;
let currentNickname = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login");
  } else {
    currentUser = user;
    loadAndRender(user);
  }
});

async function loadAndRender(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      currentAvatar = data.avatar || null;
      currentDisplayName = data.displayName || null;
      currentNickname = data.nickname || null;
    }
  } catch {
    currentAvatar = null;
    currentDisplayName = null;
    currentNickname = null;
  }
  renderProfile(user);
}

function avatarSrc(filename) {
  return `assets/avatars/${filename}`;
}

function renderAvatarEl(email) {
  if (currentAvatar) {
    return `<img src="${avatarSrc(currentAvatar)}" alt="Avatar" class="profilo-avatar-img" id="avatarImg">`;
  }
  const initial = currentDisplayName
    ? currentDisplayName.charAt(0).toUpperCase()
    : email.charAt(0).toUpperCase();
  return `<div class="profilo-avatar-circle" id="avatarImg">${initial}</div>`;
}

function renderProfile(user) {
  const email = user.email;
  const isAdmin = email === ADMIN_EMAIL;
  const isGoogle = user.providerData.some(p => p.providerId === "google.com");
  const dateReg = new Date(user.metadata.creationTime);
  const dateLogin = new Date(user.metadata.lastSignInTime);
  const days = Math.floor((new Date() - dateReg) / 86400000);

  const fmtDate = d => d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fmtDateTime = d => d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const headerName = currentDisplayName || email;
  const headerNickname = currentNickname ? `@${currentNickname}` : null;

  content.innerHTML = `
    <section class="profilo-container">

      <div class="profilo-avatar">
        <button class="profilo-avatar-wrap" id="avatarBtn" aria-label="Modifica profilo" title="Modifica profilo">
          ${renderAvatarEl(email)}
          <span class="profilo-avatar-overlay">✎</span>
        </button>
        <div class="profilo-avatar-meta">
          <p class="profilo-display-name">${headerName}</p>
          ${headerNickname ? `<p class="profilo-nickname">${headerNickname}</p>` : ""}
          <div class="profilo-badges">
            ${isAdmin
              ? '<span class="profilo-role-badge profilo-role-badge--admin">Admin</span>'
              : isGoogle
                ? '<span class="profilo-role-badge profilo-role-badge--google">Utente Google</span>'
                : '<span class="profilo-role-badge profilo-role-badge--user">Utente</span>'
            }
          </div>
        </div>
        <button class="profilo-refresh-btn" id="refreshBtn" aria-label="Aggiorna profilo" title="Aggiorna profilo">
          <span class="profilo-refresh-icon">↻</span>
        </button>
      </div>

      <div class="avatar-picker hidden" id="avatarPicker">

        <div class="avatar-picker-fields">
          <div class="avatar-field">
            <label class="avatar-field-label" for="inputDisplayName">Nome visualizzato</label>
            <input
              type="text"
              id="inputDisplayName"
              class="avatar-field-input"
              placeholder="Es. Mario Rossi"
              maxlength="32"
              value="${currentDisplayName || ""}"
            >
          </div>
          <div class="avatar-field">
            <label class="avatar-field-label" for="inputNickname">Nickname</label>
            <div class="avatar-field-nickname-wrap">
              <span class="avatar-field-at">@</span>
              <input
                type="text"
                id="inputNickname"
                class="avatar-field-input avatar-field-input--nickname"
                placeholder="Es. mariorossi"
                maxlength="24"
                value="${currentNickname || ""}"
              >
            </div>
            <p class="avatar-field-hint">Solo lettere, numeri e underscore.</p>
          </div>
        </div>

        <p class="avatar-picker-title">Scegli il tuo avatar</p>
        <div class="avatar-picker-grid">
          ${AVATARS.map(name => `
            <button class="avatar-option ${currentAvatar === name ? "avatar-option--active" : ""}" data-avatar="${name}" aria-label="${name}">
              <img src="assets/avatars/${name}" alt="${name}">
            </button>
          `).join("")}
        </div>

        <div class="avatar-picker-actions">
          <button class="avatar-picker-save" id="avatarPickerSave">Salva</button>
          <button class="avatar-picker-close" id="avatarPickerClose">Annulla</button>
        </div>
        <p class="avatar-picker-msg" id="avatarPickerMsg"></p>
      </div>

      <div class="profilo-cards">
        <div class="profilo-card">
          <span class="profilo-card-icon">✉️</span>
          <span class="profilo-card-label">Email</span>
          <span class="profilo-card-value">${email}</span>
        </div>
        <div class="profilo-card">
          <span class="profilo-card-icon">📅</span>
          <span class="profilo-card-label">Iscritto dal</span>
          <span class="profilo-card-value">${fmtDate(dateReg)}</span>
        </div>
        <div class="profilo-card">
          <span class="profilo-card-icon">🏆</span>
          <span class="profilo-card-label">Giorni iscritto</span>
          <span class="profilo-card-value">${days} ${days === 1 ? "giorno" : "giorni"}</span>
        </div>
        <div class="profilo-card">
          <span class="profilo-card-icon">🕐</span>
          <span class="profilo-card-label">Ultimo accesso</span>
          <span class="profilo-card-value">${fmtDateTime(dateLogin)}</span>
        </div>
      </div>

      <div id="favorites-section"></div>
      <div id="email-section"></div>
      <div id="password-section"></div>
      <div id="danger-section"></div>
      ${isAdmin ? `
      <div class="profilo-admin-link-wrap">
        <a href="admin" class="profilo-admin-link">
          <span class="profilo-admin-link-icon">⚙️</span>
          <div class="profilo-admin-link-text">
            <span class="profilo-admin-link-title">Pannello Admin</span>
            <span class="profilo-admin-link-sub">Gestisci film e serie Marvel e DC</span>
          </div>
          <span class="profilo-admin-link-arrow">→</span>
        </a>
      </div>` : ""}
    </section>
  `;

  initAvatarPicker();
  initRefresh();
  renderFavorites(user.uid);
  if (!isGoogle) renderChangeEmail();
  if (!isGoogle) renderPasswordReset(email);
  renderDanger(isGoogle);
}

async function isNicknameTaken(nickname, currentUid) {
  const snap = await getDoc(doc(db, "nicknames", nickname.toLowerCase())).catch(() => null);
  if (!snap || !snap.exists()) return false;
  return snap.data().uid !== currentUid;
}

function initAvatarPicker() {
  const btn = document.getElementById("avatarBtn");
  const picker = document.getElementById("avatarPicker");
  const closeBtn = document.getElementById("avatarPickerClose");
  const saveBtn = document.getElementById("avatarPickerSave");
  const msg = document.getElementById("avatarPickerMsg");

  let selectedAvatar = currentAvatar;

  btn.addEventListener("click", () => picker.classList.toggle("hidden"));
  closeBtn.addEventListener("click", () => {
    picker.classList.add("hidden");
    msg.textContent = "";
  });

  picker.querySelectorAll(".avatar-option").forEach(opt => {
    opt.addEventListener("click", () => {
      picker.querySelectorAll(".avatar-option").forEach(o => o.classList.remove("avatar-option--active"));
      opt.classList.add("avatar-option--active");
      selectedAvatar = opt.dataset.avatar;
    });
  });

  saveBtn.addEventListener("click", async () => {
    const rawName = document.getElementById("inputDisplayName").value.trim();
    const rawNick = document.getElementById("inputNickname").value.trim();

    if (rawNick && !/^[a-zA-Z0-9_]+$/.test(rawNick)) {
      msg.textContent = "Il nickname può contenere solo lettere, numeri e underscore.";
      msg.style.color = "#e05252";
      return;
    }

    saveBtn.disabled = true;
    msg.textContent = "";

    if (rawNick && await isNicknameTaken(rawNick, currentUser.uid)) {
      msg.textContent = "Questo nickname è già in uso. Scegline un altro.";
      msg.style.color = "#e05252";
      saveBtn.disabled = false;
      return;
    }

    try {
      const updates = {
        avatar: selectedAvatar || null,
        displayName: rawName || null,
        nickname: rawNick || null
      };

      await updateDoc(doc(db, "users", currentUser.uid), updates);

      if (rawNick && rawNick !== currentNickname) {
        if (currentNickname) await deleteDoc(doc(db, "nicknames", currentNickname.toLowerCase())).catch(() => {});
        await setDoc(doc(db, "nicknames", rawNick.toLowerCase()), { uid: currentUser.uid });
      } else if (!rawNick && currentNickname) {
        await deleteDoc(doc(db, "nicknames", currentNickname.toLowerCase())).catch(() => {});
      }

      currentAvatar = updates.avatar;
      currentDisplayName = updates.displayName;
      currentNickname = updates.nickname;

      msg.textContent = "Salvato!";
      msg.style.color = "#4caf50";

      const old = document.getElementById("avatarImg");
      if (old && currentAvatar) {
        const newEl = document.createElement("img");
        newEl.src = avatarSrc(currentAvatar);
        newEl.alt = "Avatar";
        newEl.className = "profilo-avatar-img";
        newEl.id = "avatarImg";
        old.replaceWith(newEl);
      }

      const nameEl = document.querySelector(".profilo-display-name");
      if (nameEl) nameEl.textContent = currentDisplayName || currentUser.email;

      const nickEl = document.querySelector(".profilo-nickname");
      if (currentNickname) {
        if (nickEl) {
          nickEl.textContent = `@${currentNickname}`;
        } else {
          const nameElRef = document.querySelector(".profilo-display-name");
          if (nameElRef) {
            const p = document.createElement("p");
            p.className = "profilo-nickname";
            p.textContent = `@${currentNickname}`;
            nameElRef.insertAdjacentElement("afterend", p);
          }
        }
      } else if (nickEl) {
        nickEl.remove();
      }

      setTimeout(() => {
        picker.classList.add("hidden");
        msg.textContent = "";
        saveBtn.disabled = false;
      }, 800);

    } catch {
      msg.textContent = "Errore nel salvataggio. Riprova.";
      msg.style.color = "#e05252";
      saveBtn.disabled = false;
    }
  });
}

function renderChangeEmail() {
  const section = document.getElementById("email-section");
  if (!section) return;
  section.innerHTML = `
    <div class="profilo-password">
      <h2 class="profilo-password-title">Cambia email</h2>
      <p class="profilo-password-desc">Inserisci la nuova email e la tua password attuale per confermare. Riceverai un link di verifica alla nuova email.</p>
      <input type="email" id="newEmailInput" class="profilo-input" placeholder="Nuova email" autocomplete="email">
      <input type="password" id="currentPasswordInput" class="profilo-input" placeholder="Password attuale" autocomplete="current-password">
      <button class="profilo-password-btn" id="changeEmailBtn">Aggiorna email</button>
      <p class="profilo-password-msg" id="changeEmailMsg"></p>
    </div>
  `;

  const btn = document.getElementById("changeEmailBtn");
  const msg = document.getElementById("changeEmailMsg");

  btn.addEventListener("click", async () => {
    const newEmail = document.getElementById("newEmailInput").value.trim();
    const password = document.getElementById("currentPasswordInput").value;
    msg.className = "profilo-password-msg";
    msg.textContent = "";

    if (!newEmail) { msg.textContent = "Inserisci la nuova email."; msg.classList.add("profilo-password-msg--error"); return; }
    if (!password) { msg.textContent = "Inserisci la password attuale."; msg.classList.add("profilo-password-msg--error"); return; }

    btn.disabled = true;
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      await verifyBeforeUpdateEmail(currentUser, newEmail);
      await updateDoc(doc(db, "users", currentUser.uid), { email: newEmail });
      msg.textContent = "Email di verifica inviata alla nuova email. Controlla la casella.";
      msg.classList.add("profilo-password-msg--success");
      document.getElementById("newEmailInput").value = "";
      document.getElementById("currentPasswordInput").value = "";
    } catch (error) {
      switch (error.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          msg.textContent = "Password errata."; break;
        case "auth/email-already-in-use":
          msg.textContent = "Questa email è già in uso."; break;
        case "auth/invalid-email":
          msg.textContent = "Email non valida."; break;
        default:
          msg.textContent = "Errore nell'aggiornamento. Riprova.";
      }
      msg.classList.add("profilo-password-msg--error");
      btn.disabled = false;
    }
  });
}

function renderPasswordReset(email) {
  const section = document.getElementById("password-section");
  if (!section) return;
  section.innerHTML = `
    <div class="profilo-password">
      <h2 class="profilo-password-title">Cambia password</h2>
      <p class="profilo-password-desc">Riceverai un'email con il link per impostare una nuova password.</p>
      <button class="profilo-password-btn" id="resetPasswordBtn">Invia email di reset</button>
      <p class="profilo-password-msg" id="passwordMsg"></p>
    </div>
  `;

  const btn = document.getElementById("resetPasswordBtn");
  const msg = document.getElementById("passwordMsg");

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    msg.textContent = "";
    msg.className = "profilo-password-msg";
    try {
      await sendPasswordResetEmail(auth, email);
      msg.textContent = "Email inviata! Controlla la tua casella di posta.";
      msg.classList.add("profilo-password-msg--success");
    } catch {
      msg.textContent = "Errore nell'invio dell'email. Riprova.";
      msg.classList.add("profilo-password-msg--error");
      btn.disabled = false;
    }
  });
}

async function deleteUserData(uid) {
  try {
    const favsSnap = await getDocs(collection(db, "users", uid, "favorites"));
    await Promise.all(favsSnap.docs.map(d => deleteDoc(d.ref)));
  } catch {}
  if (currentNickname) {
    await deleteDoc(doc(db, "nicknames", currentNickname.toLowerCase())).catch(() => {});
  }
  await deleteDoc(doc(db, "users", uid));
}

function renderDanger(isGoogle) {
  const section = document.getElementById("danger-section");
  if (!section) return;
  section.innerHTML = `
    <div class="profilo-danger">
      <h2 class="profilo-danger-title">Elimina account</h2>
      <p class="profilo-danger-desc">Questa azione è irreversibile. Il tuo account e tutti i tuoi dati verranno eliminati definitivamente.</p>
      ${!isGoogle ? `<input type="password" id="deletePasswordInput" class="profilo-input" placeholder="Password attuale per confermare">` : ""}
      <button class="profilo-danger-btn" id="deleteAccountBtn">Elimina il mio account</button>
      <p class="profilo-password-msg" id="deleteAccountMsg"></p>
    </div>
  `;

  const btn = document.getElementById("deleteAccountBtn");
  const msg = document.getElementById("deleteAccountMsg");

  btn.addEventListener("click", async () => {
    msg.className = "profilo-password-msg";
    msg.textContent = "";

    if (!isGoogle) {
      const password = document.getElementById("deletePasswordInput").value;
      if (!password) { msg.textContent = "Inserisci la password per confermare."; msg.classList.add("profilo-password-msg--error"); return; }
      const confirmed = window.confirm("Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.");
      if (!confirmed) return;
      btn.disabled = true;
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);
        await deleteUserData(currentUser.uid);
        await deleteUser(currentUser);
        window.location.replace("home");
      } catch (error) {
        switch (error.code) {
          case "auth/wrong-password":
          case "auth/invalid-credential":
            msg.textContent = "Password errata."; break;
          default:
            msg.textContent = "Errore nell'eliminazione. Riprova.";
        }
        msg.classList.add("profilo-password-msg--error");
        btn.disabled = false;
      }
    } else {
      const confirmed = window.confirm("Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.");
      if (!confirmed) return;
      btn.disabled = true;
      try {
        await deleteUserData(currentUser.uid);
        await deleteUser(currentUser);
        window.location.replace("home");
      } catch (error) {
        msg.textContent = error.code === "auth/requires-recent-login"
          ? "Sessione scaduta. Esci e rientra con Google, poi riprova."
          : "Errore nell'eliminazione. Riprova.";
        msg.classList.add("profilo-password-msg--error");
        btn.disabled = false;
      }
    }
  });
}

function initRefresh() {
  const btn = document.getElementById("refreshBtn");
  const icon = btn?.querySelector(".profilo-refresh-icon");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    if (icon) icon.classList.add("spinning");
    try {
      await currentUser.reload();
      await loadAndRender(currentUser);
    } catch {
      if (icon) icon.classList.remove("spinning");
      btn.disabled = false;
    }
  });
}

async function renderFavorites(uid) {
  const section = document.getElementById("favorites-section");
  if (!section) return;

  section.innerHTML = `<div class="fav-container"><h2 class="fav-title">★ Preferiti</h2><p class="fav-loading">Caricamento...</p></div>`;

  try {
    const favorites = await getAllFavorites(uid);

    if (favorites.length === 0) {
      section.innerHTML = `<div class="fav-container"><h2 class="fav-title">★ Preferiti</h2><p class="fav-empty">Non hai ancora aggiunto nessun preferito. Vai su una pagina film o serie e clicca la stella ☆</p></div>`;
      return;
    }

    const brandGroups = {};
    favorites.forEach(fav => {
      if (!brandGroups[fav.brand]) brandGroups[fav.brand] = [];
      brandGroups[fav.brand].push(fav);
    });

    const brandData = {};
    await Promise.all(Object.keys(brandGroups).map(async brand => {
      try {
        const snap = await getDocs(collection(db, "releases", brand, "items"));
        brandData[brand] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        brandData[brand] = [];
      }
    }));

    const cards = favorites.map(fav => {
      const project = (brandData[fav.brand] || []).find(r => r.id === fav.slug);
      if (!project) return "";
      return `
        <a href="project?brand=${fav.brand}&type=${project.type}&title=${fav.slug}" class="fav-card" aria-label="${project.title}">
          <img src="${project.image}" alt="${project.title}" loading="lazy">
          <div class="fav-card-info">
            <h3>${project.title}</h3>
            <p>${project.format} · ${project.date}</p>
            <span class="fav-card-brand fav-card-brand--${fav.brand}">${fav.brand.toUpperCase()}</span>
          </div>
        </a>
      `;
    }).filter(Boolean);

    if (cards.length === 0) {
      section.innerHTML = `<div class="fav-container"><h2 class="fav-title">★ Preferiti</h2><p class="fav-empty">I tuoi preferiti non sono più disponibili sul sito.</p></div>`;
      return;
    }

    section.innerHTML = `
      <div class="fav-container">
        <h2 class="fav-title">★ Preferiti</h2>
        <p class="fav-subtitle">${cards.length} ${cards.length === 1 ? "titolo salvato" : "titoli salvati"}</p>
        <div class="fav-grid">${cards.join("")}</div>
      </div>
    `;
  } catch {
    section.innerHTML = `<div class="fav-container"><h2 class="fav-title">★ Preferiti</h2><p class="fav-error">❌ Errore nel caricamento dei preferiti.</p></div>`;
  }
}