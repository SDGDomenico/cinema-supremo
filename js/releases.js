import { db } from "./firebase.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const brand = document.body.dataset.brand;
const container = document.getElementById("releases-container");

async function loadReleases() {
  try {
    const metaSnap = await getDoc(doc(db, "releases", brand));
    if (metaSnap.exists()) setHero(metaSnap.data());

    const itemsSnap = await getDocs(collection(db, "releases", brand, "items"));
    const releases = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderReleases(groupByYear(releases));
    initFilters();
  } catch (err) {
    console.error("Errore nel caricamento dati:", err);
  }
}

function setHero(data) {
  const title = document.getElementById("hero-title");
  const text = document.getElementById("hero-text");
  if (title) title.textContent = data.heroTitle;
  if (text) text.textContent = data.heroText;
}

function groupByYear(releases) {
  const sorted = [...releases].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return sorted.reduce((acc, item) => {
    const key = item.year ?? "TBD";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function renderReleases(grouped) {
  Object.keys(grouped)
    .sort((a, b) => {
      if (a === "TBD") return 1;
      if (b === "TBD") return -1;
      return a - b;
    })
    .forEach((year, index) => {
      const group = document.createElement("div");
      group.className = "year-group";
      group.style.animationDelay = `${index * 60}ms`;
      group.innerHTML = `<h2>${year}</h2>`;
      grouped[year].forEach(item => { group.innerHTML += createCard(item); });
      container.appendChild(group);
    });
}

function createCard(item) {
  return `
    <a
      href="project?brand=${brand}&type=${item.type}&title=${item.id}"
      class="card"
      data-type="${item.type}"
      aria-label="${item.title} — ${item.format}"
    >
      <img src="${item.image}" alt="${item.title}" loading="lazy">
      <h3>${item.title}</h3>
      <p>${[item.format, item.date].filter(Boolean).join(" · ")}</p>
    </a>
  `;
}

function applyFilters() {
  const buttons = document.querySelectorAll(".filters button");
  const activeFilter = document.querySelector(".filters button.active")?.dataset.filter || "all";
  const searchQuery = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const yearGroups = document.querySelectorAll(".year-group");

  yearGroups.forEach(group => {
    const cards = group.querySelectorAll(".card");
    let visible = 0;
    cards.forEach(card => {
      const typeMatch = activeFilter === "all" || card.dataset.type === activeFilter;
      const titleMatch = !searchQuery || card.querySelector("h3")?.textContent.toLowerCase().includes(searchQuery);
      const show = typeMatch && titleMatch;
      card.style.display = show ? "block" : "none";
      if (show) visible++;
    });
    group.style.display = visible === 0 ? "none" : "";
  });
}

function initFilters() {
  const buttons = document.querySelectorAll(".filters button");
  const searchInput = document.getElementById("searchInput");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }
}

loadReleases();