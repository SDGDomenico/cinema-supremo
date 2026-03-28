const COOKIE_KEY = "cinemasupremo_cookie_consent";

function initCookieBanner() {
  if (localStorage.getItem(COOKIE_KEY)) return;

  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.id = "cookieBanner";
  banner.innerHTML = `
    <p class="cookie-banner-text">
      Utilizziamo cookie tecnici necessari al funzionamento del sito e cookie di terze parti (YouTube) per la riproduzione dei trailer.
      Leggi la nostra <a href="cookies">Cookie Policy</a> e la <a href="privacy">Privacy Policy</a>.
    </p>
    <div class="cookie-banner-actions">
      <button class="cookie-btn cookie-btn-reject" id="cookieReject">Rifiuta</button>
      <button class="cookie-btn cookie-btn-accept" id="cookieAccept">Accetta tutti</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("cookieAccept").addEventListener("click", () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    hideBanner();
  });

  document.getElementById("cookieReject").addEventListener("click", () => {
    localStorage.setItem(COOKIE_KEY, "rejected");
    hideBanner();
    blockYouTube();
  });
}

function hideBanner() {
  const banner = document.getElementById("cookieBanner");
  if (banner) {
    banner.style.animation = "none";
    banner.style.opacity = "0";
    banner.style.transform = "translateX(-50%) translateY(20px)";
    banner.style.transition = "opacity 0.3s, transform 0.3s";
    setTimeout(() => banner.remove(), 300);
  }
}

function blockYouTube() {
  document.querySelectorAll('iframe[src*="youtube"]').forEach(iframe => {
    const placeholder = document.createElement("div");
    placeholder.style.cssText = `
      aspect-ratio: 16/9;
      background: var(--surface-2);
      border-radius: var(--r-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-lo);
      font-size: 0.8rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      border: 1px solid var(--line-lo);
    `;
    placeholder.textContent = "Video non disponibile (cookie rifiutati)";
    iframe.replaceWith(placeholder);
  });
}

function applyConsent() {
  if (localStorage.getItem(COOKIE_KEY) === "rejected") blockYouTube();
}

document.addEventListener("DOMContentLoaded", () => {
  initCookieBanner();
  applyConsent();
});