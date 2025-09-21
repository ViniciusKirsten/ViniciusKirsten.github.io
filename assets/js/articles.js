(function () {
  "use strict";

  const $list = document.getElementById("articles-list");
  if (!$list) return;

  const $status = document.getElementById("search-status");

  function norm(s) {
    return (s ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }
  function tokens(s) {
    const n = norm(s);
    return n ? n.split(/\s+/) : [];
  }
  function toBR(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("pt-BR");
  }
  function setStatus(total, shown, q, tag) {
    if (!$status) return;
    const parts = [];
    if (q) parts.push(`q="${q}"`);
    if (tag) parts.push(`tag="${tag}"`);
    if (!parts.length) {
      $status.textContent = "Todos os artigos (sem filtro)";
      return;
    }
    $status.textContent = `${shown} de ${total} resultado(s) para ${parts.join(" · ")}`;
  }

  function articleCard(a) {
    const tags = Array.isArray(a.tags) && a.tags.length
      ? `<ul class="article-tags">${a.tags.map(t => `<li>${t}</li>`).join("")}</ul>`
      : "";
    return `
      <article class="article-card">
        <a class="card-link" href="${a.link}" aria-label="${a.title}" tabindex="-1" aria-hidden="true"></a>
        <h2 class="article-title"><a href="${a.link}">${a.title}</a></h2>
        <div class="article-meta">
          <time datetime="${a.date}">${toBR(a.date)}</time>
        </div>
        <p class="article-desc">${a.description ?? ""}</p>
        ${tags}
      </article>
    `;
  }

  function scoreArticle(a, qTokens) {
    if (!qTokens.length) return 0;
    const tTitle = norm(a.title);
    const tDesc = norm(a.description);
    const tTags = norm((a.tags || []).join(" "));

    let score = 0;
    for (const tk of qTokens) {
      if (!tk) continue;
      if (tTitle.includes(tk)) score += 3;
      if (tTags.includes(tk)) score += 2;
      if (tDesc.includes(tk)) score += 1;
    }
    return score;
  }

  function matchesTag(a, tag) {
    if (!tag) return true;
    const nt = norm(tag);
    return (a.tags || []).some(t => {
      const tt = norm(t);
      return tt === nt || tt.includes(nt);
    });
  }

  async function run() {
    try {
      const params = new URLSearchParams(location.search);
      const q = params.get("q") || "";
      const tagParam = params.get("tag") || "";

      const res = await fetch("/data/articles.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("Falha ao carregar articles.json");
      const data = await res.json();

      data.sort((a, b) => new Date(b.date) - new Date(a.date));

      const qTokens = tokens(q);

      const withScores = data
        .filter(a => matchesTag(a, tagParam))
        .map(a => ({ a, s: scoreArticle(a, qTokens) }));

      const total = withScores.length;

      let filtered;
      if (qTokens.length) {
        filtered = withScores.filter(x => x.s > 0).sort((x, y) => y.s - x.s);
      } else {
        filtered = withScores;
      }

      if (!filtered.length) {
        $list.innerHTML = `
          <div class="alert">
            <p>Nenhum artigo encontrado.</p>
          </div>
        `;
      } else {
        $list.innerHTML = filtered.map(x => articleCard(x.a)).join("");
      }
      $list.setAttribute("aria-busy", "false");
      setStatus(total, filtered.length, q, tagParam);

      const qInput = document.querySelector('.header__search-input[name="q"]');
      if (qInput && q) qInput.value = q;

    } catch (err) {
      $list.innerHTML = `
        <div class="alert">
          <p>Não foi possível carregar os artigos agora.</p>
          <pre style="white-space:pre-wrap">${err.message}</pre>
        </div>
      `;
      $list.setAttribute("aria-busy", "false");
      if ($status) $status.textContent = "Erro ao carregar resultados.";
    }
  }
  run();
})();
