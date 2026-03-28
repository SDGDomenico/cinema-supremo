document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburgerBtn");
  const menu = document.getElementById("mainMenu");

  if (!hamburger || !menu) return;

  const toggle = () => {
    const isOpen = menu.classList.toggle("show");
    hamburger.classList.toggle("active", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen);
  };

  hamburger.addEventListener("click", toggle);

  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      if (menu.classList.contains("show")) toggle();
    });
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
      menu.classList.remove("show");
      hamburger.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });
});