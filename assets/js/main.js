async function loadPartials() {
  async function inject(selector, file) {
    const el = document.querySelector(selector);
    if (!el) return;
    const res = await fetch(file);
    el.innerHTML = await res.text();
  }

  await inject("[data-include='header']", "../partials/header.html");
  await inject("[data-include='footer']", "../partials/footer.html");

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function initThemeSystem() {
  const root = document.documentElement;

  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = saved || (prefersDark ? "dark" : "light");
  applyTheme(initial);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-theme");
    if (!btn) return;

    const current = root.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    updateIcons(theme);
  }

  function updateIcons(theme) {
    document.querySelectorAll(".btn-theme i").forEach((icon) => {
      icon.classList.remove("bi-sun", "bi-moon");
      icon.classList.add(theme === "dark" ? "bi-sun" : "bi-moon");
    });
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  await loadPartials();
  initThemeSystem();
});
