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

// --- Realce + botão copiar para blocos de código (fix indent + cores) ---
(function () {
  "use strict";

  // Remove indentação comum. Se a primeira linha tem 0 e as demais têm indent > 0,
  // ignora a primeira linha ao calcular o mínimo (caso típico de <pre> em HTML).
  function dedentSmart(text) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");

    // tira vazias do começo/fim
    while (lines.length && lines[0].trim() === "") lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    if (!lines.length) return "";

    const firstIndent = (lines[0].match(/^(\s+)/) || ["", ""])[1].length;

    // min geral
    let minAll = Infinity;
    for (const ln of lines) {
      if (!ln.trim()) continue;
      const m = ln.match(/^(\s+)/);
      const indent = m ? m[1].length : 0;
      if (indent < minAll) minAll = indent;
      if (minAll === 0) break;
    }
    if (!isFinite(minAll)) minAll = 0;

    // min excluindo a primeira linha (para o caso clássico “primeira sem indent”)
    let minSkipFirst = Infinity;
    for (let i = 1; i < lines.length; i++) {
      const ln = lines[i];
      if (!ln.trim()) continue;
      const m = ln.match(/^(\s+)/);
      const indent = m ? m[1].length : 0;
      if (indent < minSkipFirst) minSkipFirst = indent;
      if (minSkipFirst === 0) break;
    }
    if (!isFinite(minSkipFirst)) minSkipFirst = 0;

    // se o min geral é 0 só por causa da primeira linha, use o min sem a primeira
    const min = (minAll === 0 && firstIndent === 0 && minSkipFirst > 0)
      ? minSkipFirst
      : minAll;

    return lines.map(ln => ln.slice(Math.min(min, ln.length))).join("\n");
  }

  function addCopyButton(preEl, codeEl) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "Copiar";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codeEl.textContent);
        const old = btn.textContent;
        btn.textContent = "Copiado!";
        setTimeout(() => (btn.textContent = old), 1200);
      } catch {
        const old = btn.textContent;
        btn.textContent = "Erro";
        setTimeout(() => (btn.textContent = old), 1200);
      }
    });
    preEl.appendChild(btn);
  }

  function enhance() {
    const blocks = document.querySelectorAll(".article pre.code > code");
    if (!blocks.length) return;

    blocks.forEach(codeEl => {
      // 1) Dedenta de forma “esperta”
      codeEl.textContent = dedentSmart(codeEl.textContent);

      // 2) Garante que tenha language-*
      //    (para C#, tanto "language-cs" quanto "language-csharp" funcionam)
      if (![...codeEl.classList].some(c => c.startsWith("language-"))) {
        codeEl.classList.add("language-plaintext");
      }

      // 3) Highlight
      if (window.hljs && typeof window.hljs.highlightElement === "function") {
        window.hljs.highlightElement(codeEl);
      } else if (window.hljs && typeof window.hljs.highlightAll === "function") {
        window.hljs.highlightAll();
      }

      // 4) Botão copiar
      const pre = codeEl.closest("pre.code");
      if (pre && !pre.querySelector(".copy-btn")) {
        addCopyButton(pre, codeEl);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }
})();
