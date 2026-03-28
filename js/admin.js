import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_EMAIL = "domenicosdgcisternino@gmail.com";
const BRANDS = ["marvel", "dc"];
const content = document.getElementById("admin-content");

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== ADMIN_EMAIL) {
    window.location.replace("home");
    return;
  }
  renderAdmin();
});

let allItems = {};
let activeBrand = "marvel";
let activeFilter = "all";
let editingId = null;

async function renderAdmin() {
  content.innerHTML = `<div class="admin-page"><p class="admin-page-loading">Caricamento...</p></div>`;

  await loadAll();

  content.innerHTML = `
    <div class="admin-page">

      <!-- Brand tabs -->
      <div class="admin-tabs">
        <button class="admin-tab ${activeBrand === "marvel" ? "admin-tab--active" : ""}" data-brand="marvel">Marvel</button>
        <button class="admin-tab ${activeBrand === "dc" ? "admin-tab--active" : ""}" data-brand="dc">DC</button>
      </div>

      <!-- Toolbar -->
      <div class="admin-toolbar">
        <div class="admin-filters">
          <button class="admin-filter-btn ${activeFilter === "all" ? "active" : ""}" data-filter="all">Tutti</button>
          <button class="admin-filter-btn ${activeFilter === "movie" ? "active" : ""}" data-filter="movie">Cinema</button>
          <button class="admin-filter-btn ${activeFilter === "show" ? "active" : ""}" data-filter="show">Televisione</button>
        </div>
        <button class="admin-add-btn" id="addBtn">+ Aggiungi</button>
      </div>

      <!-- Table -->
      <div class="admin-table-wrap" id="tableWrap"></div>

    </div>
  `;

  const existingOverlay = document.getElementById("modalOverlay");
  if (existingOverlay) existingOverlay.remove();
  const overlayEl = document.createElement("div");
  overlayEl.className = "admin-modal-overlay hidden";
  overlayEl.id = "modalOverlay";
  overlayEl.innerHTML = `<div class="admin-modal" id="modal"></div>`;
  document.body.appendChild(overlayEl);

  bindTabs();
  bindFilters();
  document.getElementById("addBtn").addEventListener("click", () => openModal(null));
  renderTable();
}

async function loadAll() {
  allItems = {};
  await Promise.all(BRANDS.map(async brand => {
    try {
      const snap = await getDocs(collection(db, "releases", brand, "items"));
      allItems[brand] = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    } catch {
      allItems[brand] = [];
    }
  }));
}

async function reloadBrand(brand) {
  try {
    const snap = await getDocs(collection(db, "releases", brand, "items"));
    allItems[brand] = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  } catch {
    allItems[brand] = [];
  }
}

function bindTabs() {
  document.querySelectorAll(".admin-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeBrand = btn.dataset.brand;
      document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("admin-tab--active"));
      btn.classList.add("admin-tab--active");
      renderTable();
    });
  });
}

function bindFilters() {
  document.querySelectorAll(".admin-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll(".admin-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderTable();
    });
  });
}

function renderTable() {
  const wrap = document.getElementById("tableWrap");
  if (!wrap) return;

  let items = allItems[activeBrand] || [];
  items = [...items].sort((a, b) => {
    if ((a.year ?? 9999) !== (b.year ?? 9999)) return (a.year ?? 9999) - (b.year ?? 9999);
    return (a.order ?? 999) - (b.order ?? 999);
  });
  if (activeFilter !== "all") items = items.filter(i => i.type === activeFilter);

  if (items.length === 0) {
    wrap.innerHTML = `<p class="admin-empty">Nessun elemento. Clicca "+ Aggiungi" per crearne uno.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Ord.</th>
          <th>Poster</th>
          <th>Titolo</th>
          <th>Tipo</th>
          <th>Anno</th>
          <th>Data uscita</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
          <tr data-id="${item.id}">
            <td class="admin-td-order">${index + 1}</td>
            <td class="admin-td-img">
              ${item.image
                ? `<img src="${item.image}" alt="${item.title}" class="admin-poster">`
                : `<div class="admin-poster-placeholder">?</div>`}
            </td>
            <td class="admin-td-title">
              <span class="admin-item-title">${item.title}</span>
              ${item.format ? `<span class="admin-item-format">${item.format}</span>` : ""}
            </td>
            <td>
              <span class="admin-badge admin-badge--${item.type}">
                ${item.type === "movie" ? "Cinema" : "TV"}
              </span>
            </td>
            <td>${item.year ?? "—"}</td>
            <td>${item.date ?? "—"}</td>
            <td class="admin-td-actions">
              <button class="admin-action-btn admin-action-btn--edit" data-id="${item.id}" title="Modifica">✎</button>
              <button class="admin-action-btn admin-action-btn--delete" data-id="${item.id}" title="Elimina">✕</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll(".admin-action-btn--edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = (allItems[activeBrand] || []).find(i => i.id === btn.dataset.id);
      if (item) openModal(item);
    });
  });

  wrap.querySelectorAll(".admin-action-btn--delete").forEach(btn => {
    btn.addEventListener("click", () => confirmDelete(btn.dataset.id));
  });
}

async function confirmDelete(id) {
  const item = (allItems[activeBrand] || []).find(i => i.id === id);
  if (!item) return;
  const ok = window.confirm(`Eliminare "${item.title}"? L'azione è irreversibile.`);
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "releases", activeBrand, "items", id));
    await reloadBrand(activeBrand);
    renderTable();
  } catch {
    alert("Errore durante l'eliminazione. Riprova.");
  }
}

function openModal(item) {
  editingId = item ? item.id : null;
  const overlay = document.getElementById("modalOverlay");
  const modal = document.getElementById("modal");
  overlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  const castStr = (item?.cast && item.cast[0] !== "TBD") ? item.cast.join(", ") : "";
  const trailersStr = (item?.trailers && item.trailers.length > 0) ? item.trailers.join("\n") : "";

  modal.innerHTML = `
    <div class="admin-modal-header">
      <h2 class="admin-modal-title">${item ? "Modifica" : "Aggiungi"}</h2>
      <button class="admin-modal-close" id="modalClose" aria-label="Chiudi">✕</button>
    </div>

    <div class="admin-modal-body">

      <div class="admin-form-row admin-form-row--2">
        <div class="admin-field">
          <label class="admin-label">Brand</label>
          <select class="admin-input" id="f-brand">
            <option value="marvel" ${activeBrand === "marvel" ? "selected" : ""}>Marvel</option>
            <option value="dc" ${activeBrand === "dc" ? "selected" : ""}>DC</option>
          </select>
        </div>
        <div class="admin-field">
          <label class="admin-label">Tipo</label>
          <select class="admin-input" id="f-type">
            <option value="movie" ${item?.type === "movie" ? "selected" : ""}>Cinema</option>
            <option value="show" ${item?.type === "show" ? "selected" : ""}>Televisione</option>
          </select>
        </div>
      </div>

      <div class="admin-form-row admin-form-row--2">
        <div class="admin-field">
          <label class="admin-label">ID</label>
          <input type="text" class="admin-input" id="f-id"
            value="${item ? item.id : ""}"
            placeholder="avengers-secret-wars"
            ${item ? "readonly" : ""}
          >
        </div>
        <div class="admin-field">
          <label class="admin-label">Titolo</label>
          <input type="text" class="admin-input" id="f-title" value="${item?.title ?? ""}" placeholder="Avengers: Secret Wars">
        </div>
      </div>

      <div class="admin-field">
        <label class="admin-label">Trama</label>
        <textarea class="admin-input admin-textarea" id="f-description" rows="4" placeholder="Trama del film...">${item?.description ?? ""}</textarea>
      </div>

      <div class="admin-form-row admin-form-row--3">
        <div class="admin-field">
          <label class="admin-label">Anno</label>
          <input type="text" class="admin-input" id="f-year" value="${item?.year ?? ""}" placeholder="2025 oppure TBD">
        </div>
        <div class="admin-field">
          <label class="admin-label">Data uscita</label>
          <input type="text" class="admin-input" id="f-date" value="${item?.date ?? ""}" placeholder="1 Gennaio 2025 oppure lascia vuoto">
        </div>
        <div class="admin-field">
          <label class="admin-label">Ordine</label>
          <input type="number" class="admin-input" id="f-order" value="${item?.order ?? ""}" placeholder="1">
        </div>
      </div>

      <div class="admin-form-row admin-form-row--2">
        <div class="admin-field">
          <label class="admin-label">Formato</label>
          <input type="text" class="admin-input" id="f-format" value="${item?.format ?? ""}" placeholder="Film Live-Action">
        </div>
        <div class="admin-field">
          <label class="admin-label">Durata</label>
          <input type="text" class="admin-input" id="f-duration" value="${item?.duration ?? ""}" placeholder="120 Minuti (Circa)">
        </div>
      </div>

      <div class="admin-form-row admin-form-row--2">
        <div class="admin-field">
          <label class="admin-label">Regista</label>
          <input type="text" class="admin-input" id="f-director" value="${item?.director ?? ""}" placeholder="Anthony e Joe Russo">
        </div>
        <div class="admin-field">
          <label class="admin-label">Cast</label>
          <input type="text" class="admin-input" id="f-cast" value="${castStr}" placeholder="Chris Pratt, Paul Rudd, Paul Bettany, Altri">
        </div>
      </div>

      <div class="admin-field">
        <label class="admin-label">Logo</label>
        <div class="admin-image-row">
          <input type="text" class="admin-input" id="f-image" value="${item?.image ?? ""}" placeholder="https://res.cloudinary.com/...">
          <button class="admin-preview-btn" id="previewBtn" type="button">Anteprima</button>
        </div>
        <div class="admin-image-preview hidden" id="imagePreview">
          <img id="previewImg" src="" alt="Anteprima poster">
        </div>
      </div>

      <div class="admin-field">
        <label class="admin-label">Trailer</label>
        <textarea class="admin-input admin-textarea" id="f-trailers" rows="3" placeholder="https://www.youtube.com/embed/...">${trailersStr}</textarea>
      </div>

      <p class="admin-modal-msg hidden" id="modalMsg"></p>

    </div>

    <div class="admin-modal-footer">
      <button class="admin-modal-cancel" id="modalCancel">Annulla</button>
      <button class="admin-modal-save" id="modalSave">${item ? "Salva modifiche" : "Crea"}</button>
    </div>
  `;

  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalCancel").addEventListener("click", closeModal);

  document.getElementById("previewBtn").addEventListener("click", () => {
    const url = document.getElementById("f-image").value.trim();
    const preview = document.getElementById("imagePreview");
    const img = document.getElementById("previewImg");
    if (url) {
      img.src = url;
      preview.classList.remove("hidden");
    }
  });

  document.getElementById("modalSave").addEventListener("click", () => saveItem());

  if (item?.image) {
    const preview = document.getElementById("imagePreview");
    const img = document.getElementById("previewImg");
    img.src = item.image;
    preview.classList.remove("hidden");
  }
}

function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  editingId = null;
}

async function saveItem() {
  const msgEl = document.getElementById("modalMsg");
  const saveBtn = document.getElementById("modalSave");

  const brand = document.getElementById("f-brand").value;
  const type = document.getElementById("f-type").value;
  const id = document.getElementById("f-id").value.trim();
  const title = document.getElementById("f-title").value.trim();
  const description = document.getElementById("f-description").value.trim();
  const yearRaw = document.getElementById("f-year").value.trim();
  const year = yearRaw.toUpperCase() === "TBD" ? "TBD" : parseInt(yearRaw, 10);
  const date = document.getElementById("f-date").value.trim();
  const orderRaw = document.getElementById("f-order").value.trim();
  const format = document.getElementById("f-format").value.trim();
  const duration = document.getElementById("f-duration").value.trim();
  const director = document.getElementById("f-director").value.trim();
  const castRaw = document.getElementById("f-cast").value.trim();
  const image = document.getElementById("f-image").value.trim();
  const trailersRaw = document.getElementById("f-trailers").value.trim();

  const showError = (msg) => {
    msgEl.textContent = msg;
    msgEl.classList.remove("hidden", "admin-modal-msg--success");
    msgEl.classList.add("admin-modal-msg--error");
  };

  if (!id) return showError("L'ID documento è obbligatorio.");
  if (!/^[a-z0-9-]+$/.test(id)) return showError("L'ID può contenere solo lettere minuscole, numeri e trattini.");
  if (!title) return showError("Il titolo è obbligatorio.");
  if (!date && year !== "TBD") return showError("La data di uscita è obbligatoria.");
  if (year !== "TBD" && isNaN(year)) return showError('L\'anno deve essere un numero valido oppure "TBD".');

  if (!editingId) {
    try {
      const existing = await getDoc(doc(db, "releases", brand, "items", id));
      if (existing.exists()) return showError(`Esiste già un elemento con ID "${id}" in ${brand}.`);
    } catch {
      return showError("Errore nella verifica dell'ID. Riprova.");
    }
  }

  const cast = castRaw
    ? castRaw.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const trailers = trailersRaw
    ? trailersRaw.split("\n").map(s => s.trim()).filter(Boolean)
    : [];

  const data = {
    title,
    type,
    year,
    date,
    format: format || "",
    description: description || "",
    image: image || "",
    director: director || "",
    duration: duration || "",
    cast,
    trailers,
    ...(orderRaw !== "" ? { order: parseInt(orderRaw, 10) } : {})
  };

  saveBtn.disabled = true;
  msgEl.classList.add("hidden");

  try {
    const ref = doc(db, "releases", brand, "items", id);
    if (editingId) {
      await updateDoc(ref, data);
    } else {
      await setDoc(ref, data);
    }

    msgEl.textContent = editingId ? "Modifiche salvate!" : "Elemento creato!";
    msgEl.classList.remove("hidden", "admin-modal-msg--error");
    msgEl.classList.add("admin-modal-msg--success");

    await reloadBrand(brand);
    if (brand !== activeBrand) {
      activeBrand = brand;
      document.querySelectorAll(".admin-tab").forEach(b => {
        b.classList.toggle("admin-tab--active", b.dataset.brand === brand);
      });
    }

    setTimeout(() => {
      closeModal();
      renderTable();
    }, 800);

  } catch (err) {
    msgEl.textContent = "Errore nel salvataggio. Riprova.";
    msgEl.classList.remove("hidden", "admin-modal-msg--success");
    msgEl.classList.add("admin-modal-msg--error");
    saveBtn.disabled = false;
  }
}