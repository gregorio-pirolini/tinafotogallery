(function () {
  function buildItemsFromGallery(galleryEl) {
    return Array.from(galleryEl.querySelectorAll('a[data-tina-lightbox]'))
      .map(a => a.getAttribute("href"))
      .filter(Boolean);
  }

  function openLightbox(items, startIndex) {
    let index = startIndex;

	  // Save scroll position
const scrollY = window.scrollY;

// Lock body start
document.body.style.position = "fixed";
document.body.style.top = `-${scrollY}px`;
document.body.style.left = "0";
document.body.style.right = "0";scrollY
// Lock body end
    const overlay = document.createElement("div");
    overlay.className = "tina-lightbox";
    overlay.innerHTML = `
      <button class="tina-lb-btn tina-lb-close" aria-label="Close">×</button>
<button class="tina-lb-btn tina-lb-prev" aria-label="Previous">‹</button>
<img class="tina-lb-img" alt="">
<button class="tina-lb-btn tina-lb-next" aria-label="Next">›</button>
    `;
const fade = document.createElement("div");
fade.className = "tina-lb-fade";
overlay.appendChild(fade);

    

    const img = overlay.querySelector(".tina-lb-img");
    const btnPrev = overlay.querySelector(".tina-lb-prev");
    const btnNext = overlay.querySelector(".tina-lb-next");
    const btnClose = overlay.querySelector(".tina-lb-close");

const currentImg = overlay.querySelector(".tina-lb-current");
const nextImg = overlay.querySelector(".tina-lb-next-img");

function render() {
  // Fade to black quickly
  fade.classList.add("is-on");

  const targetSrc = items[index];

  // Swap image while black
  setTimeout(() => {
    img.src = targetSrc;

    // When image is ready, fade back
    img.onload = () => {
      fade.classList.remove("is-on");
    };

    // If cached and onload fires too fast, still remove fade shortly
    setTimeout(() => fade.classList.remove("is-on"), 180);
  }, 120);

  // Preload neighbors (keep this)
  const nextIndex = (index + 1) % items.length;
  const prevIndex = (index - 1 + items.length) % items.length;
  new Image().src = items[nextIndex];
  new Image().src = items[prevIndex];
}

    function close() {
  document.removeEventListener("keydown", onKey);

  // Restore scroll
  const scrollY = document.body.style.top;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";

  window.scrollTo(0, parseInt(scrollY || "0") * -1);

  overlay.remove();
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

    // Click behaviors
    overlay.addEventListener("click", (e) => {
      // click on background closes
      if (e.target === overlay) close();
    });
    btnClose.addEventListener("click", close);
    btnPrev.addEventListener("click", prev);
    btnNext.addEventListener("click", next);

    document.addEventListener("keydown", onKey);

    // --- Swipe (mobile) on the image ---
    var MIN_DISTANCE = 50;      // px
    var MAX_SWIPE_TIME = 500;   // ms
    var MAX_VERTICAL = 80;      // px (ignore mostly vertical swipes)

    var startX = null, startY = null, startTime = null;

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

      const dx = endX - startX; // >0 swipe right, <0 swipe left
      const dy = endY - startY;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      startX = startY = startTime = null;

      if (dt > MAX_SWIPE_TIME) return;
      if (absX < MIN_DISTANCE) return;
      if (absY > MAX_VERTICAL) return;

      // common gallery behavior:
      // swipe left => next, swipe right => prev
      if (dx < 0) next();
      else prev();
    }

    img.addEventListener("touchstart", onTouchStart, { passive: true });
    img.addEventListener("touchend", onTouchEnd, { passive: true });

    document.body.appendChild(overlay);
    render();
  }

  document.addEventListener("click", function (e) {
  const a = e.target.closest('a[data-tina-lightbox]');
  if (!a) return;

  e.preventDefault();

  const galleries = document.querySelectorAll(".tina-gallery");
  if (!galleries.length) return;

  let items = [];
  galleries.forEach(g => { items = items.concat(buildItemsFromGallery(g)); });
  items = Array.from(new Set(items)); // dedupe

  const startIndex = Math.max(0, items.indexOf(a.getAttribute("href")));
  openLightbox(items, startIndex);
});
})();
