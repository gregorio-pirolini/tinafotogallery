(function () {
  // 1) helper functions (top of file inside IIFE)
  let tinaScrollY = 0;
  function setHashForId(id) {
    if (!id) return;
    history.replaceState(null, "", "#photo=" + encodeURIComponent(id));
  }

  function getHashPhotoId() {
    const m = location.hash.match(/^#photo=([^#]+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function clearHash() {
    if (location.hash.startsWith("#photo=")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function buildItemsFromGallery(galleryEl) {
    return Array.from(galleryEl.querySelectorAll("a[data-tina-lightbox]"))
      .map((a) => {
        const im = a.querySelector("img");

        return {
          id: a.id || a.dataset.tinaId || "",
          src: a.getAttribute("href"), // full image URL
          alt: a.dataset.tinaAlt || im?.alt || "",
          caption: a.dataset.tinaCaption || "",
          desc: a.dataset.tinaDesc || "",

          // ✅ pull responsive info from the thumbnail image
          srcset: im?.getAttribute("srcset") || "",
          sizes: im?.getAttribute("sizes") || "",
        };
      })
      .filter((x) => x.src);
  }

  function buildItemsFromPage() {
    const galleries = document.querySelectorAll(".tina-gallery");
    let items = [];
    galleries.forEach((g) => {
      items = items.concat(buildItemsFromGallery(g));
    });

    // dedupe by src (works for objects)
    const seen = new Set();
    items = items.filter((it) => {
      if (!it.src) return false;
      if (seen.has(it.src)) return false;
      seen.add(it.src);
      return true;
    });

    return items;
  }

  function disableSmoothScroll() {
    document.documentElement.style.scrollBehavior = "auto";
  }

  function enableSmoothScroll() {
    document.documentElement.style.scrollBehavior = "";
  }

  function lockBodyScroll() {
    tinaScrollY = window.scrollY || document.documentElement.scrollTop || 0;

    disableSmoothScroll(); // <— key

    document.body.dataset.tinaScrollY = String(tinaScrollY);
    document.body.style.position = "fixed";
    document.body.style.top = `-${tinaScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockBodyScroll() {
    const saved = parseInt(document.body.dataset.tinaScrollY || "0", 10);

    // keep smooth disabled until AFTER scroll restore
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.dataset.tinaScrollY = "";

    window.scrollTo(0, saved);

    // re-enable on next tick
    setTimeout(enableSmoothScroll, 0);
  }
 
  function openLightbox(items, startIndex) {
    // openLightbox start
    let index = Math.max(0, startIndex);




    lockBodyScroll();

    window.addEventListener("resize", onResize);

    const overlay = document.createElement("div");
    overlay.className = "tina-lightbox";

    overlay.innerHTML = `
      <button class="tina-lb-btn tina-lb-close" aria-label="Close">
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path d="M6 6l12 12M18 6l-12 12" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>
</button>
      <button class="tina-lb-btn tina-lb-prev" aria-label="Previous">
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path d="M15 18l-6-6 6-6" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</button>


      <div class="tina-lb-stage">
  <img class="tina-lb-img" alt="">
</div>
      <div class="tina-lb-caption" aria-live="polite"></div>
      <button class="tina-lb-btn tina-lb-next" aria-label="Next">
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path d="M9 6l6 6-6 6" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</button>
    `;

    // Fade curtain (stable "transition")
    const fade = document.createElement("div");
    fade.className = "tina-lb-fade";
    overlay.appendChild(fade);

    const img = overlay.querySelector(".tina-lb-img");
    const stage = overlay.querySelector(".tina-lb-stage");
    
    const btnPrev = overlay.querySelector(".tina-lb-prev");
    const btnNext = overlay.querySelector(".tina-lb-next");
    const btnClose = overlay.querySelector(".tina-lb-close");
    const captionEl = overlay.querySelector(".tina-lb-caption");

function setDynamicSizes() {
  const w = Math.ceil(stage.getBoundingClientRect().width);
  img.sizes = w > 0 ? `${w}px` : "90vw";
}

function onResize() {
  requestAnimationFrame(setDynamicSizes);
}

img.onload = () => {
  requestAnimationFrame(() => {
    setDynamicSizes();
    fade.classList.remove("is-on");
  });
};

window.addEventListener("resize", onResize);
    function applyCaption() {
      const it = items[index];
      const cap = (it.caption || it.desc || "").trim();
      captionEl.textContent = cap;
      captionEl.style.display = cap ? "" : "none";
    }

    function preloadNeighbors() {
      const nextIndex = (index + 1) % items.length;
      const prevIndex = (index - 1 + items.length) % items.length;
      new Image().src = items[nextIndex].src;
      new Image().src = items[prevIndex].src;
    }

    
    img.onload = () => {
  requestAnimationFrame(() => {
    setDynamicSizes();
    fade.classList.remove("is-on");
  });
};

   function render() {
  const it = items[index];
  if (!it) return;

  applyCaption();
  fade.classList.add("is-on");

  img.src = it.src;
  img.alt = it.alt || "";

  if (it.srcset) img.srcset = it.srcset;
  else img.removeAttribute("srcset");

  requestAnimationFrame(setDynamicSizes);

  setHashForId(it.id);

  // fallback (cached edge case)
  setTimeout(() => fade.classList.remove("is-on"), 220);

  preloadNeighbors();
}

function close() {
  document.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", onResize);
  unlockBodyScroll();
  overlay.remove();
  clearHash();
}
    function prev() {
      index = (index - 1 + items.length) % items.length;
      render();
    }

    function next() {
      index = (index + 1) % items.length;
      render();
    }

    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }

    // Close when clicking backdrop (not buttons/image)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    btnClose.addEventListener("click", close);
    btnPrev.addEventListener("click", prev);
    btnNext.addEventListener("click", next);
    document.addEventListener("keydown", onKey);

    // Swipe (mobile) on the image
    const MIN_DISTANCE = 50;
    const MAX_SWIPE_TIME = 500;
    const MAX_VERTICAL = 80;

    let startX = null,
      startY = null,
      startTime = null;

    function onTouchStart(e) {
      if (!e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
    }

    function onTouchEnd(e) {
      if (startX === null || startY === null) return;
      if (!e.changedTouches || !e.changedTouches[0]) return;

      const t = e.changedTouches[0];
      const endX = t.clientX;
      const endY = t.clientY;
      const dt = Date.now() - startTime;

      const dx = endX - startX;
      const dy = endY - startY;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      startX = startY = startTime = null;

      if (dt > MAX_SWIPE_TIME) return;
      if (absX < MIN_DISTANCE) return;
      if (absY > MAX_VERTICAL) return;

      if (dx < 0) next();
      else prev();
    }

    img.addEventListener("touchstart", onTouchStart, { passive: true });
    img.addEventListener("touchend", onTouchEnd, { passive: true });

    document.body.appendChild(overlay);
    render();
  }

  document.addEventListener("click", function (e) {
    const a = e.target.closest("a[data-tina-lightbox]");
    if (!a) return;

    e.preventDefault();

    const items = buildItemsFromPage();
    if (!items.length) return;

    const href = a.getAttribute("href");
    const startIndex = Math.max(
      0,
      items.findIndex((it) => it.src === href),
    );

    openLightbox(items, startIndex);
  });

  window.addEventListener("popstate", () => {
    const overlay = document.querySelector(".tina-lightbox");
    if (overlay) {
      unlockBodyScroll();
      overlay.remove();
      clearHash();
    }
  });
  // 4) auto-open if a hash is present (bottom of file)
  function openFromHash() {
    const id = getHashPhotoId();
    if (!id) return;

    const items = buildItemsFromPage();
    const idx = items.findIndex((it) => it.id === id);
    if (idx >= 0) openLightbox(items, idx);
  }

  // Try on initial load
  window.addEventListener("load", openFromHash);
})();
