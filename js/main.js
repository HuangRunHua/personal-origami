/**
 * 从 data/works.json 渲染画廊、筛选、灯箱与作品计数
 */
const state = { works: [], filter: "全部" };

async function loadWorks() {
  const res = await fetch("data/works.json", { cache: "no-store" });
  if (!res.ok) throw new Error("无法加载 data/works.json");
  return res.json();
}

function uniqueTags(works) {
  const s = new Set();
  for (const w of works) {
    (w.tags || []).forEach((t) => s.add(t));
  }
  return Array.from(s).sort();
}

function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "className") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on") && typeof v === "function")
      n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") n.innerHTML = v;
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  });
  children.forEach((c) => n.append(c));
  return n;
}

function truncate(s, n) {
  if (!s) return "";
  const one = s.replace(/\s+/g, " ").trim();
  if (one.length <= n) return one;
  return one.slice(0, n) + "…";
}

/** 相对路径含中文/空格时，按段 encode，避免部分环境下 img 无法加载 */
function imageUrl(relPath) {
  if (!relPath) return "";
  return relPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function workMatches(w, filter) {
  if (filter === "全部" || !filter) return true;
  return (w.tags || []).includes(filter);
}

function renderGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;
  grid.replaceChildren();
  const list = state.works.filter((w) => workMatches(w, state.filter));
  if (list.length === 0) {
    const empty = el("p", { className: "section-desc" });
    empty.textContent = grid.getAttribute("data-empty") || "暂无作品。";
    grid.append(empty);
    return;
  }
  for (const w of list) {
    grid.append(createCard(w));
  }
}

function createCard(w) {
  const visual = el("div", { className: "card-visual" });
  const img = new Image();
  img.alt = w.title || "作品";
  img.loading = "lazy";
  img.decoding = "async";
  const ph = el("div", { className: "card-placeholder", text: "请放置照片" });
  ph.hidden = true;
  img.addEventListener("load", () => {
    ph.hidden = true;
  });
  img.addEventListener("error", () => {
    ph.hidden = false;
  });
  img.src = imageUrl(w.image);
  visual.append(img, ph);

  const tags = (w.tags || []).map((t) =>
    el("span", { className: "pill", text: t })
  );
  const bodyParts = [
    el("h3", { className: "card-title", text: w.title || "无标题" }),
  ];
  if (w.titleAlt) {
    bodyParts.push(
      el("p", { className: "card-subtitle", text: w.titleAlt })
    );
  }
  bodyParts.push(
    el("p", { className: "card-designer", text: `设计：${w.designer || "—"}` })
  );
  if (w.source) {
    bodyParts.push(
      el("p", { className: "card-source", text: truncate(w.source, 96) })
    );
  }
  bodyParts.push(
    el("p", {
      className: "card-meta",
      text: [w.paper, w.year].filter(Boolean).join(" · "),
    }),
    el("div", { className: "card-tags" }, tags)
  );
  const body = el("div", { className: "card-body" }, bodyParts);

  const btn = el("button", {
    className: "gallery-card",
    type: "button",
    "aria-label": `查看 ${w.title || "作品"}`,
  });
  btn.append(visual, body);
  btn.addEventListener("click", () => openLightbox(w));
  return btn;
}

const lightbox = () => document.getElementById("lightbox");
const lightboxContent = () => document.getElementById("lightbox-content");

function openLightbox(w) {
  const root = lightbox();
  const content = lightboxContent();
  if (!root || !content) return;
  content.replaceChildren();
  const img = new Image();
  img.src = imageUrl(w.image);
  img.alt = w.title || "";
  const wrap = el("div", { className: "lightbox-image-wrap" }, [img]);
  const textParts = [el("h2", { text: w.title || "无标题" })];
  if (w.titleAlt) {
    textParts.push(
      el("p", { className: "field field-alt", text: w.titleAlt })
    );
  }
  textParts.push(
    el("p", { className: "field", text: `设计：${w.designer || "—"}` }),
    el("p", { className: "field", text: `纸张：${w.paper || "—"}` }),
    el("p", { className: "field", text: `成稿年份：${w.year ?? "—"}` })
  );
  if (w.source) {
    textParts.push(
      el("p", { className: "field field-source", text: w.source })
    );
  }
  if (w.note) {
    const noteEl = el("p", { className: "note" });
    noteEl.textContent = w.note;
    textParts.push(noteEl);
  }
  const text = el("div", { className: "lightbox-text" }, textParts);
  content.append(wrap, text);
  root.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const root = lightbox();
  if (!root) return;
  root.hidden = true;
  document.body.style.overflow = "";
}

function renderFilterBar(configTags) {
  const bar = document.getElementById("filter-bar");
  if (!bar) return;
  bar.replaceChildren();
  const fromWorks = uniqueTags(state.works);
  let tags = configTags?.length
    ? [...configTags]
    : ["全部", ...fromWorks];
  if (!tags.includes("全部")) tags = ["全部", ...tags];
  const seen = new Set();
  tags = tags.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  for (const t of tags) {
    const b = el("button", {
      className: "filter-btn",
      type: "button",
      text: t,
    });
    b.addEventListener("click", () => {
      state.filter = t;
      updateFilterVisual(bar);
      renderGallery();
    });
    bar.append(b);
  }
  updateFilterVisual(bar);
}

function updateFilterVisual(bar) {
  const active = state.filter;
  bar.querySelectorAll(".filter-btn").forEach((btn) => {
    const label = (btn.textContent || "").trim();
    const on = active === "全部" ? label === "全部" : label === active;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function updateStatCount() {
  const elN = document.querySelector('[data-stat="count"]');
  if (elN) elN.textContent = String(state.works.length);
}

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function initLightbox() {
  const closeBtn = document.getElementById("lightbox-close");
  const root = lightbox();
  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (root) {
    root.addEventListener("click", (e) => {
      if (e.target === root) closeLightbox();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
}

async function main() {
  try {
    const data = await loadWorks();
    state.works = data.works || [];
    state.filter = "全部";
    renderFilterBar(data.tags);
    renderGallery();
    updateStatCount();
  } catch (e) {
    console.error(e);
    const grid = document.getElementById("gallery-grid");
    if (grid) {
      grid.replaceChildren();
      const p = el("p", { className: "section-desc" });
      p.textContent = "作品列表暂时无法加载，请刷新页面或稍后再试。";
      grid.append(p);
    }
  }
  initNav();
  initLightbox();
}

main();
