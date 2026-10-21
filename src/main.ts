import "./styles.css";
import poster1 from "../assets/coming-soon/web/poster1.webp";
import poster2 from "../assets/coming-soon/web/poster2.webp";
import poster3 from "../assets/coming-soon/web/poster3.webp";
import poster4 from "../assets/coming-soon/web/poster4.webp";

/* ───────────── Config ───────────── */

const POSTERS = [
  { src: poster1, title: "The GMC Experience" },
  { src: poster2, title: "Meet GNX" },
  { src: poster3, title: "The GMC Journey" },
  { src: poster4, title: "What's Next" },
];

const LAUNCH_DATE = (import.meta.env.VITE_LAUNCH_DATE ?? "").trim();
const NOTIFY_ENDPOINT = (import.meta.env.VITE_NOTIFY_ENDPOINT ?? "").trim();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ───────────── Helpers ───────────── */

function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
}
function $$<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

let toastTimer = 0;
function toast(message: string): void {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("is-on");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("is-on"), 2600);
}

/* ───────────── Video players ───────────── */

interface Player {
  video: HTMLVideoElement;
  root: HTMLElement;
  soundBtn: HTMLButtonElement | null;
  bar: HTMLElement | null;
  /** user paused it by hand, so don't auto-resume on scroll */
  heldByUser: boolean;
  inView: boolean;
}

const players: Player[] = [];

function makePlayer(video: HTMLVideoElement, root: HTMLElement): Player {
  const p: Player = {
    video,
    root,
    soundBtn: root.querySelector<HTMLButtonElement>("[data-sound]"),
    bar: root.querySelector<HTMLElement>(".progress span"),
    heldByUser: false,
    inView: false,
  };
  players.push(p);

  video.addEventListener("play", () => root.classList.add("is-playing"));
  video.addEventListener("pause", () => root.classList.remove("is-playing"));
  video.addEventListener("click", () => {
    if (video.paused) {
      p.heldByUser = false;
      void safePlay(p);
    } else {
      p.heldByUser = true;
      video.pause();
    }
  });
  p.soundBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setSound(p, video.muted);
    if (video.paused) {
      p.heldByUser = false;
      void safePlay(p);
    }
  });
  return p;
}

async function safePlay(p: Player): Promise<void> {
  try {
    await p.video.play();
  } catch {
    // Browsers refuse unmuted autoplay without a gesture; fall back to muted.
    if (!p.video.muted) {
      setSound(p, false);
      try {
        await p.video.play();
      } catch {
        /* still blocked, the poster frame stays up */
      }
    }
  }
}

function setSound(p: Player, on: boolean): void {
  if (on) {
    for (const other of players) if (other !== p) setSound(other, false);
  }
  p.video.muted = !on;
  if (p.soundBtn) {
    p.soundBtn.setAttribute("aria-pressed", String(on));
    p.soundBtn.setAttribute("aria-label", on ? "Mute sound" : "Turn sound on");
  }
}

function tickProgress(): void {
  for (const p of players) {
    if (!p.bar || !p.video.duration) continue;
    p.bar.style.transform = `scaleX(${p.video.currentTime / p.video.duration})`;
  }
  requestAnimationFrame(tickProgress);
}

const heroVideo = $<HTMLVideoElement>("#hero-video");
const hero = makePlayer(heroVideo, $(".hero__stage"));
for (const reel of $$<HTMLElement>(".reel")) makePlayer($<HTMLVideoElement>("video", reel), reel);
requestAnimationFrame(tickProgress);

let autoplayEnabled = false; // switched on once the gate is passed

function syncAutoplay(p: Player): void {
  if (!autoplayEnabled || reduceMotion) return;
  if (p.inView && !p.heldByUser) {
    if (p.video.paused) void safePlay(p);
  } else if (!p.inView && !p.video.paused) {
    p.video.pause();
  }
}

function onVisibility(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    const p = players.find((x) => x.root === entry.target);
    if (!p) continue;
    p.inView = entry.isIntersecting;
    syncAutoplay(p);
  }
}
// The hero teaser starts as soon as it peeks in (on phones it sits below the
// fold); reels wait until they are mostly on screen.
const heroObserver = new IntersectionObserver(onVisibility, { threshold: 0.2 });
const reelObserver = new IntersectionObserver(onVisibility, { threshold: 0.55 });
for (const p of players) (p === hero ? heroObserver : reelObserver).observe(p.root);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    for (const p of players) p.video.pause();
  } else {
    for (const p of players) syncAutoplay(p);
  }
});

$("#play-teaser").addEventListener("click", () => {
  hero.root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  hero.video.currentTime = 0;
  hero.heldByUser = false;
  setSound(hero, true);
  void safePlay(hero);
});

/* ───────────── Entry gate ───────────── */

// The gate starts hidden. After the loader we try to start the teaser with
// sound on its own; the ENTER screen only appears when the browser blocks that.
const gate = $("#gate");
const params = new URLSearchParams(window.location.search);
gate.classList.add("is-gone");

function startSite(): void {
  autoplayEnabled = true;
  for (const p of players) syncAutoplay(p);
}

function showGate(): void {
  if (!gate.classList.contains("is-gone")) return;
  gate.classList.remove("is-gone", "is-leaving");
  document.body.classList.add("is-locked");
  const enter = $<HTMLButtonElement>("#gate-enter");
  enter.focus({ preventScroll: true });
  enter.addEventListener(
    "click",
    () => {
      document.body.classList.remove("is-locked");
      gate.classList.add("is-leaving");
      window.setTimeout(() => gate.classList.add("is-gone"), reduceMotion ? 0 : 1000);

      // This click is a user gesture, so the teaser can start with sound.
      setSound(hero, true);
      hero.heldByUser = false;
      void safePlay(hero);
      startSite();
    },
    { once: true },
  );
}

/**
 * Try to play the teaser with sound without a click. Browsers only allow this
 * for some visitors (Chrome, for example, once someone has engaged with the
 * site before); otherwise play() is refused straight away.
 * Resolves true when sound playback started (or is buffering and not refused).
 */
function tryAutoplayWithSound(): Promise<boolean> {
  if (reduceMotion) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    let settled = false;
    setSound(hero, true);
    // still buffering after 1.5 s but not refused: treat as allowed
    const timer = window.setTimeout(() => {
      settled = true;
      resolve(true);
    }, 1500);
    hero.video.play().then(
      () => {
        window.clearTimeout(timer);
        if (!settled) resolve(true);
        settled = true;
      },
      () => {
        window.clearTimeout(timer);
        setSound(hero, false);
        if (!settled) resolve(false);
        else showGate(); // refused late, after we had already moved on
        settled = true;
      },
    );
  });
}

/* ───────────── Header, progress, active nav ───────────── */

const header = $(".site-header");
const progressBar = $(".scroll-progress span");
let scrollQueued = false;
function onScroll(): void {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    scrollQueued = false;
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 12);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const navLinks = $$<HTMLAnchorElement>(".nav a");
const navObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const a of navLinks) a.classList.toggle("is-active", a.hash === `#${entry.target.id}`);
    }
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
for (const a of navLinks) {
  const section = document.querySelector(a.hash);
  if (section) navObserver.observe(section);
}

/* ───────────── Scroll reveal ───────────── */

for (const group of $$(".rail, .pillars")) {
  $$(".reveal", group).forEach((el, i) => el.style.setProperty("--d", `${i * 0.09}s`));
}
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
);
for (const el of $$(".reveal")) revealObserver.observe(el);

/* ───────────── Tilt (desktop pointers only) ───────────── */

if (finePointer && !reduceMotion) {
  for (const el of $$("[data-tilt]")) {
    const strength = el.classList.contains("hero__stage") ? 10 : 7;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", `${(x - 0.5) * strength}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * strength}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--rx", "0deg");
    });
  }
}

/* ───────────── Rails (mobile carousels) ───────────── */

for (const nav of $$(".rail-nav")) {
  const rail = $(`#${nav.dataset.rail}`);
  const items = Array.from(rail.children) as HTMLElement[];
  const dotsWrap = $(".dots", nav);
  const prev = $<HTMLButtonElement>('[data-dir="-1"]', nav);
  const next = $<HTMLButtonElement>('[data-dir="1"]', nav);

  const dots = items.map((item, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    b.setAttribute("aria-label", `Go to item ${i + 1}`);
    b.addEventListener("click", () => scrollToItem(item));
    dotsWrap.append(b);
    return b;
  });

  function scrollToItem(item: HTMLElement): void {
    const left = item.offsetLeft - (rail.clientWidth - item.clientWidth) / 2;
    rail.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
  }
  function current(): number {
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    items.forEach((item, i) => {
      const d = Math.abs(item.offsetLeft + item.clientWidth / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }
  function update(): void {
    const i = current();
    dots.forEach((d, j) => d.setAttribute("aria-current", String(i === j)));
    prev.disabled = rail.scrollLeft < 4;
    next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4;
  }
  prev.addEventListener("click", () => scrollToItem(items[Math.max(0, current() - 1)]));
  next.addEventListener("click", () => scrollToItem(items[Math.min(items.length - 1, current() + 1)]));
  rail.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* ───────────── Poster lightbox ───────────── */

const lightbox = $<HTMLDialogElement>("#lightbox");
const lbImg = $<HTMLImageElement>("#lightbox-img");
const lbTitle = $("#lightbox-title");
const lbCount = $("#lightbox-count");
let lbIndex = 0;

function showPoster(i: number, animate = true): void {
  lbIndex = (i + POSTERS.length) % POSTERS.length;
  const poster = POSTERS[lbIndex];
  const card = $$<HTMLImageElement>(".poster img")[lbIndex];
  lbImg.src = poster.src;
  lbImg.alt = card?.alt ?? poster.title;
  lbTitle.textContent = poster.title;
  lbCount.textContent = `${lbIndex + 1} / ${POSTERS.length}`;
  if (animate) {
    lbImg.classList.remove("is-swapping");
    void lbImg.offsetWidth;
    lbImg.classList.add("is-swapping");
  }
  // warm the neighbours so swiping feels instant
  for (const n of [lbIndex + 1, lbIndex - 1]) {
    const img = new Image();
    img.src = POSTERS[(n + POSTERS.length) % POSTERS.length].src;
  }
}

function openLightbox(i: number): void {
  showPoster(i, false);
  lightbox.showModal();
  document.body.classList.add("is-locked");
}

for (const card of $$<HTMLButtonElement>(".poster")) {
  card.addEventListener("click", () => openLightbox(Number(card.dataset.index ?? 0)));
}
lightbox.addEventListener("close", () => document.body.classList.remove("is-locked"));
$("[data-close]", lightbox).addEventListener("click", () => lightbox.close());
for (const b of $$<HTMLButtonElement>("[data-step]", lightbox)) {
  b.addEventListener("click", () => showPoster(lbIndex + Number(b.dataset.step)));
}
lightbox.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (t === lightbox || t.classList.contains("lightbox__inner") || t.tagName === "FIGURE") lightbox.close();
});
lightbox.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") showPoster(lbIndex + 1);
  if (e.key === "ArrowLeft") showPoster(lbIndex - 1);
});

let swipeX = 0;
let swipeY = 0;
lbImg.addEventListener("pointerdown", (e) => {
  swipeX = e.clientX;
  swipeY = e.clientY;
});
lbImg.addEventListener("pointerup", (e) => {
  const dx = e.clientX - swipeX;
  const dy = e.clientY - swipeY;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) showPoster(lbIndex + (dx < 0 ? 1 : -1));
});

/* ───────────── Countdown ───────────── */

const launchAt = LAUNCH_DATE ? new Date(LAUNCH_DATE) : null;
if (launchAt && !Number.isNaN(launchAt.getTime()) && launchAt.getTime() > Date.now()) {
  const box = $("#countdown");
  const units = {
    d: $("[data-unit=d]", box),
    h: $("[data-unit=h]", box),
    m: $("[data-unit=m]", box),
    s: $("[data-unit=s]", box),
  };
  box.hidden = false;
  $("#tags").hidden = true;
  $("#launch-label").textContent = `Launching ${launchAt.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
  const pad = (n: number) => String(n).padStart(2, "0");
  const tick = () => {
    const left = Math.max(0, launchAt.getTime() - Date.now());
    const s = Math.floor(left / 1000);
    units.d.textContent = pad(Math.floor(s / 86400));
    units.h.textContent = pad(Math.floor((s % 86400) / 3600));
    units.m.textContent = pad(Math.floor((s % 3600) / 60));
    units.s.textContent = pad(s % 60);
    if (left === 0) {
      window.clearInterval(timer);
      $("#launch-label").textContent = "We're launching now";
    }
  };
  const timer = window.setInterval(tick, 1000);
  tick();
}

/* ───────────── Notify form ───────────── */

const form = $<HTMLFormElement>("#notify-form");
const status = $("#notify-status");
if (NOTIFY_ENDPOINT) {
  form.hidden = false;
  $("#notify-text").textContent = "Leave your email and we'll let you know the moment the GMC platform goes live.";
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>("input", form);
    const email = input.value.trim();
    status.classList.remove("is-error");
    if (!input.checkValidity() || !email) {
      status.textContent = "Please enter a valid email address.";
      status.classList.add("is-error");
      input.focus();
      return;
    }
    const button = $<HTMLButtonElement>("button", form);
    button.disabled = true;
    status.textContent = "Sending…";
    try {
      const res = await fetch(NOTIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "coming-soon" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.textContent = "You're on the list. We'll be in touch.";
    } catch {
      status.textContent = "Something went wrong. Please try again in a moment.";
      status.classList.add("is-error");
    } finally {
      button.disabled = false;
    }
  });
}

/* ───────────── Share ───────────── */

$("#share-btn").addEventListener("click", async () => {
  const data = {
    title: "GMC – Coming Soon",
    text: "GenXMeta Corporation: wellness, technology and community. Coming soon.",
    url: window.location.origin + window.location.pathname,
  };
  if (navigator.share) {
    try {
      await navigator.share(data);
    } catch {
      /* user closed the share sheet */
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(data.url);
    toast("Link copied to clipboard");
  } catch {
    toast(data.url);
  }
});

$("#year").textContent = String(new Date().getFullYear());

/* ───────────── Loader ───────────── */

// Reveal the page once styles are applied, the brand fonts are in and the
// logo is decoded. Short minimum so the loader never just flickers; capped so
// a slow font server can't hold the page back.
const bootStart = performance.now();
const logo = document.querySelector<HTMLImageElement>(".gate__logo, .brand img");
const fontsReady = document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve();
const logoReady = logo ? logo.decode().catch(() => undefined) : Promise.resolve();
const capped = new Promise<void>((resolve) => window.setTimeout(resolve, 3500));

void Promise.race([Promise.all([fontsReady, logoReady]), capped]).then(() => {
  const wait = Math.max(0, 700 - (performance.now() - bootStart));
  window.setTimeout(async () => {
    // ?skip (handy while developing): no gate, teaser plays muted
    if (params.has("skip")) {
      startSite();
    } else if (await tryAutoplayWithSound()) {
      startSite();
    } else {
      showGate();
    }
    document.documentElement.classList.add("is-ready");
    window.setTimeout(() => document.getElementById("boot")?.remove(), 900);
  }, wait);
});
