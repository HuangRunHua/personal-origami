/**
 * 从 data/works.json 渲染画廊、筛选、灯箱与作品计数
 * 完成时间：优先 w.completedOn（ISO YYYY-MM-DD），否则用 w.year
 */
const state = {
  works: [],
  filter: "全部",
  /** 灯箱多图：键盘左右键；teardown 在关闭/打开新作品时执行 */
  lightboxNav: null,
  lightboxCleanup: null,
  /** 防止多图 Promise 在关闭或切换作品后写回已移除的节点 */
  lightboxSession: 0,
};

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

/** 绝对 URL 或站点内相对路径；同页内用 UTF-8 路径，避免多轮 encode */
function imageSrc(rel) {
  if (!rel) return "";
  if (/^https?:\/\//i.test(rel)) return rel;
  return rel;
}

function imageSrcEncoded(relPath) {
  if (!relPath) return "";
  if (/^https?:\/\//i.test(relPath)) return relPath;
  return relPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

/** 多图用 images: ["a.jpg","b.jpg"]；与旧单图 image 可并存，优先 images */
function getWorkImagePaths(w) {
  if (!w) return [];
  if (Array.isArray(w.images) && w.images.length) {
    return w.images.map((p) => String(p).trim()).filter(Boolean);
  }
  if (w.image) return [String(w.image).trim()];
  return [];
}

function loadImageFromPath(srcPath) {
  return fetch(imageSrcEncoded(srcPath), { cache: "force-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("fetch");
      return r.blob();
    })
    .then((blob) => {
      if (!blob.size) throw new Error("empty");
      const u = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => {
          URL.revokeObjectURL(u);
          resolve(im);
        };
        im.onerror = () => {
          URL.revokeObjectURL(u);
          reject(new Error("img"));
        };
        im.src = u;
      });
    });
}

/** completedOn 优先：ISO YYYY-MM-DD；否则用 year 显示粗略完成时间 */
function formatCompletionLabel(w) {
  const raw = w && w.completedOn;
  if (typeof raw === "string") {
    const s = raw.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      return `${y} 年 ${mo} 月 ${d} 日完成`;
    }
  }
  if (w.year != null && w.year !== "") return `${w.year} 完成`;
  return "";
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
  const img = document.createElement("img");
  img.alt = w.title || "作品";
  const ph = el("div", { className: "card-placeholder", text: "图片整理中" });
  ph.hidden = true;
  const onOk = () => {
    ph.hidden = true;
  };
  const onBad = () => {
    ph.hidden = false;
  };
  visual.append(img, ph);
  const card = el("div", {
    className: "gallery-card",
    role: "button",
    tabindex: "0",
    "aria-label": `查看 ${w.title || "作品"}`,
  });
  const paths = getWorkImagePaths(w);
  if (paths.length) {
    const n = paths.length;
    if (n > 1) {
      visual.append(
        el("span", {
          className: "card-image-badge",
          text: `共 ${n} 张`,
          "aria-hidden": "true",
        })
      );
    }
    queueMicrotask(() => {
      const path = imageSrcEncoded(paths[0]);
      fetch(path, { cache: "force-cache" })
        .then((r) => {
          if (!r.ok) throw new Error("fetch");
          return r.blob();
        })
        .then((blob) => {
          if (!blob.size) throw new Error("empty");
          const u = URL.createObjectURL(blob);
          const cleanup = () => URL.revokeObjectURL(u);
          img.addEventListener(
            "load",
            () => {
              onOk();
              cleanup();
            },
            { once: true }
          );
          img.addEventListener(
            "error",
            () => {
              onBad();
              cleanup();
            },
            { once: true }
          );
          img.src = u;
        })
        .catch(() => onBad());
    });
  } else {
    onBad();
  }

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
    el("p", { className: "card-designer", text: `设计者：${w.designer || "—"}` })
  );
  if (w.source) {
    bodyParts.push(
      el("p", { className: "card-source", text: truncate(w.source, 96) })
    );
  }
  bodyParts.push(
    el("p", {
      className: "card-meta",
      text: [w.paper, formatCompletionLabel(w)].filter(Boolean).join(" · "),
    }),
    el("div", { className: "card-tags" }, tags)
  );
  const body = el("div", { className: "card-body" }, bodyParts);
  card.append(visual, body);
  const open = () => openLightbox(w);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
  return card;
}

const lightbox = () => document.getElementById("lightbox");
const lightboxContent = () => document.getElementById("lightbox-content");

function getCarouselIndex(track) {
  const w = track.clientWidth;
  if (!w) return 0;
  return Math.min(
    track.children.length - 1,
    Math.max(0, Math.round(track.scrollLeft / w))
  );
}

function setCarouselIndex(track, i, behavior) {
  const w = track.clientWidth;
  if (!w) return;
  const n = track.children.length;
  const idx = Math.min(n - 1, Math.max(0, i));
  track.scrollTo({ left: idx * w, behavior: behavior || "smooth" });
}

function openLightbox(w) {
  if (state.lightboxCleanup) {
    state.lightboxCleanup();
    state.lightboxCleanup = null;
  }
  state.lightboxNav = null;
  const session = ++state.lightboxSession;

  const root = lightbox();
  const content = lightboxContent();
  if (!root || !content) return;
  content.replaceChildren();
  const paths = getWorkImagePaths(w);
  const wrap = el("div", { className: "lightbox-image-wrap" });
  const textParts = [el("h2", { text: w.title || "无标题" })];
  if (w.titleAlt) {
    textParts.push(
      el("p", { className: "field field-alt", text: w.titleAlt })
    );
  }
  textParts.push(
    el("p", { className: "field", text: `设计者：${w.designer || "—"}` }),
    el("p", { className: "field", text: `用纸：${w.paper || "—"}` }),
    el("p", {
      className: "field",
      text: `完成时间：${formatCompletionLabel(w) || "—"}`,
    })
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
  if (!paths.length) {
    const ph = el("p", { className: "lightbox-missing" });
    ph.textContent = "这件作品的图片还没补上。";
    wrap.append(ph);
  } else if (paths.length === 1) {
    const img = new Image();
    img.src = imageSrcEncoded(paths[0]) || imageSrc(paths[0]);
    img.alt = w.title || "";
    wrap.append(img);
  } else {
    const carousel = el("div", { className: "lightbox-carousel" });
    const track = el("div", { className: "lightbox-slides", tabIndex: 0 });
    const counter = el("p", {
      className: "lightbox-carousel-counter",
      "aria-live": "polite",
    });
    const navPrev = el("button", {
      type: "button",
      className: "lightbox-nav lightbox-nav-prev",
      text: "‹",
    });
    navPrev.setAttribute("aria-label", "上一张");
    const navNext = el("button", {
      type: "button",
      className: "lightbox-nav lightbox-nav-next",
      text: "›",
    });
    navNext.setAttribute("aria-label", "下一张");
    carousel.append(track, navPrev, navNext, counter);
    wrap.append(carousel);

    const syncFromScroll = () => {
      const i = getCarouselIndex(track);
      const n = track.children.length;
      counter.textContent = `${i + 1} / ${n}`;
      const atFirst = i <= 0;
      const atLast = i >= n - 1;
      navPrev.disabled = atFirst;
      navNext.disabled = atLast;
      navPrev.setAttribute("aria-disabled", atFirst ? "true" : "false");
      navNext.setAttribute("aria-disabled", atLast ? "true" : "false");
    };

    let scrollTid;
    const onScroll = () => {
      clearTimeout(scrollTid);
      scrollTid = setTimeout(() => syncFromScroll(), 48);
    };

    const onResize = () => {
      const i = getCarouselIndex(track);
      setCarouselIndex(track, i, "instant");
      syncFromScroll();
    };

    navPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = getCarouselIndex(track);
      if (i > 0) setCarouselIndex(track, i - 1, "smooth");
    });
    navNext.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = getCarouselIndex(track);
      const n = track.children.length;
      if (i < n - 1) setCarouselIndex(track, i + 1, "smooth");
    });
    track.addEventListener("scroll", onScroll, { passive: true });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => onResize())
        : null;
    if (ro) ro.observe(track);

    state.lightboxNav = { track };
    state.lightboxCleanup = () => {
      clearTimeout(scrollTid);
      track.removeEventListener("scroll", onScroll);
      if (ro) ro.disconnect();
    };

    Promise.all(paths.map((p) => loadImageFromPath(p)))
      .then((imgs) => {
        if (session !== state.lightboxSession) return;
        imgs.forEach((im, i) => {
          im.alt = `${w.title || "作品"}（${i + 1} / ${imgs.length}）`;
          const block = el("div", { className: "lightbox-fig" });
          block.append(im);
          const slide = el("div", { className: "lightbox-slide" });
          slide.append(block);
          track.append(slide);
        });
        requestAnimationFrame(() => {
          if (session !== state.lightboxSession) return;
          setCarouselIndex(track, 0, "instant");
          syncFromScroll();
        });
      })
      .catch(() => {
        if (session !== state.lightboxSession) return;
        if (state.lightboxCleanup) {
          state.lightboxCleanup();
          state.lightboxCleanup = null;
        }
        state.lightboxNav = null;
        const err = el("p", { className: "lightbox-missing" });
        err.textContent = "图片没能完整加载出来，可以稍后再试。";
        wrap.replaceChildren(err);
      });
  }
  content.append(wrap, text);
  root.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  state.lightboxSession += 1;
  if (state.lightboxCleanup) {
    state.lightboxCleanup();
    state.lightboxCleanup = null;
  }
  state.lightboxNav = null;
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
    const root = lightbox();
    if (!root || root.hidden || !state.lightboxNav) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const track = state.lightboxNav.track;
      const i = getCarouselIndex(track);
      if (i > 0) setCarouselIndex(track, i - 1, "smooth");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const track = state.lightboxNav.track;
      const i = getCarouselIndex(track);
      const n = track.children.length;
      if (i < n - 1) setCarouselIndex(track, i + 1, "smooth");
    }
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
      p.textContent = "作品列表暂时没加载出来，可以刷新页面或稍后再试。";
      grid.append(p);
    }
    state.works = [];
  }
  initNav();
  initLightbox();
}

main();
