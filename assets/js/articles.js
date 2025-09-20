(async function renderArticles() {
  const container = document.getElementById("articles-list");

  function toBR(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("pt-BR");
  }

  function articleCard(a) {
    const tags = Array.isArray(a.tags) && a.tags.length
      ? `<ul class="article-tags">${a.tags.map(t => `<li>${t}</li>`).join("")}</ul>`
      : "";
    return `
      <article class="article-card">
        <h2 class="article-title"><a href="${a.link}">${a.title}</a></h2>
        <div class="article-meta">
          <time datetime="${a.date}">${toBR(a.date)}</time>
        </div>
        <p class="article-desc">${a.description ?? ""}</p>
        ${tags}
      </article>
    `;
  }

  try {
    const res = await fetch("/data/articles.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("Falha ao carregar articles.json");
    const data = await res.json();

    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = data.map(articleCard).join("");
    container.setAttribute("aria-busy", "false");
  } catch (err) {
    container.innerHTML = `
      <div class="alert">
        <p>Não foi possível carregar os artigos agora.</p>
        <pre style="white-space:pre-wrap">${err.message}</pre>
      </div>
    `;
    container.setAttribute("aria-busy", "false");
  }
})();
