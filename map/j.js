// BusGuesser — Map Mode
// Works with your existing final.json (expected at ../final.json).
// Enhancements: randomize, swap, geolocate-nearest, shareable URLs, distance calc, keyboard shortcuts.

const $ = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => [...el.querySelectorAll(q)];

const els = {
  startInput: $("#startInput"),
  endInput: $("#endInput"),
  startLabel: $("#startLabel"),
  endLabel: $("#endLabel"),
  distLabel: $("#distLabel"),
  randomBtn: $("#randomBtn"),
  swapBtn: $("#swapBtn"),
  locateBtn: $("#locateBtn"),
  shareBtn: $("#shareBtn"),
  themeToggle: $("#themeToggle"),
  helpBtn: $("#helpBtn"),
  helpDialog: $("#helpDialog"),
  toast: $("#toast"),
};

const SG_CENTER = [1.3521, 103.8198];

let map, markers = { start: null, end: null }, line = null;
let stops = [];  // unified: {code, name, lat, lng}
let current = { start: null, end: null };

init().catch(console.error);

async function init() {
  // Theme from localStorage
  const savedTheme = localStorage.getItem("busg-theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

  // Map
  await waitForLeaflet();
  map = L.map("map", { zoomControl: true, attributionControl: true })
    .setView(SG_CENTER, 12);
  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 20, attribution: '&copy; OpenStreetMap' }
  ).addTo(map);

  // Data
  stops = await loadStops();

  // Seed from URL if present
  const params = new URLSearchParams(location.search);
  const sParam = params.get("start");
  const eParam = params.get("end");
  if (sParam && eParam) {
    const s = byCode(sParam);
    const e = byCode(eParam);
    if (s && e) {
      setStart(s);
      setEnd(e);
    }
  }
  // Fallback: random pair
  if (!current.start || !current.end) randomPair();

  // Wire UI
  els.randomBtn.addEventListener("click", randomPair);
  els.swapBtn.addEventListener("click", swap);
  els.locateBtn.addEventListener("click", locateNearestStart);
  els.shareBtn.addEventListener("click", shareLink);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.helpBtn.addEventListener("click", () => els.helpDialog.showModal());
  els.startInput.addEventListener("input", () => tryPick("start", els.startInput.value));
  els.endInput.addEventListener("input", () => tryPick("end", els.endInput.value));

  // Shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") randomPair();
    if (e.key === "s" || e.key === "S") swap();
    if (e.key === "l" || e.key === "L") locateNearestStart();
    if (e.key === "/") { e.preventDefault(); els.startInput.focus(); }
  });

  // Persist / restore
  const saved = localStorage.getItem("busg-map");
  if (saved && !sParam && !eParam) {
    const obj = JSON.parse(saved);
    const s = byCode(obj.start);
    const e = byCode(obj.end);
    if (s && e) { setStart(s); setEnd(e); }
  }

  toast("Map Mode loaded 🚀");
}

function waitForLeaflet() {
  return new Promise((res) => {
    const check = () => (window.L ? res() : setTimeout(check, 30));
    check();
  });
}

async function loadStops() {
  // Try your repo's ../final.json first
  try {
    const a = await fetch("../final.json", { cache: "no-store" }).then(r => r.json());
    const u = unifyStops(a);
    if (u.length) return u;
  } catch { /* ignore */ }

  // Fallback minimal dataset if final.json missing
  console.warn("final.json not found; using minimal fallback data");
  return [
    { code: "01012", name: "Hotel Grand Pacific", lat: 1.29697, lng: 103.85211 },
    { code: "02111", name: "Opp Peninsula Plaza", lat: 1.2929, lng: 103.8522 },
    { code: "75009", name: "Woodlands Int", lat: 1.4360, lng: 103.7863 },
    { code: "84009", name: "Pasir Ris Int", lat: 1.3722, lng: 103.9497 },
  ];
}

// Try to unify whatever structure final.json uses.
function unifyStops(raw) {
  // support formats:
  // 1) [{code, name, lat, lng}]
  // 2) [{code, name, latitude, longitude}]
  // 3) [{busStopCode, description, Latitude, Longitude}]
  return raw.map((r, idx) => {
    const code = r.code ?? r.busStopCode ?? r.id ?? String(idx);
    const name = r.name ?? r.description ?? r.road ?? r.stop ?? `Stop ${code}`;
    const lat = r.lat ?? r.latitude ?? r.Latitude ?? r.position?.lat ?? r.coordinates?.[1];
    const lng = r.lng ?? r.longitude ?? r.Longitude ?? r.position?.lng ?? r.coordinates?.[0];
    return (isFinite(lat) && isFinite(lng)) ? { code: String(code), name: String(name), lat: +lat, lng: +lng } : null;
  }).filter(Boolean);
}

function byCode(code) { return stops.find(s => s.code === String(code)); }

function setStart(s) {
  current.start = s;
  els.startLabel.textContent = `${s.name} (${s.code})`;
  els.startInput.value = `${s.name}`;
  updateMap();
  persist();
}
function setEnd(e) {
  current.end = e;
  els.endLabel.textContent = `${e.name} (${e.code})`;
  els.endInput.value = `${e.name}`;
  updateMap();
  persist();
}

function updateMap() {
  if (!map) return;
  if (markers.start) map.removeLayer(markers.start);
  if (markers.end) map.removeLayer(markers.end);
  if (line) map.removeLayer(line);

  const s = current.start, e = current.end;
  if (!s || !e) return;

  markers.start = L.marker([s.lat, s.lng], { title: `Start: ${s.name}` }).addTo(map);
  markers.end = L.marker([e.lat, e.lng], { title: `End: ${e.name}` }).addTo(map);
  line = L.polyline([[s.lat, s.lng], [e.lat, e.lng]], { weight: 4, opacity: 0.6 }).addTo(map);

  const bounds = L.latLngBounds([[s.lat, s.lng], [e.lat, e.lng]]);
  map.fitBounds(bounds.pad(0.2));

  const d = haversine(s.lat, s.lng, e.lat, e.lng);
  els.distLabel.textContent = `${d.toFixed(2)} km`;
}

function tryPick(which, query) {
  query = (query ?? "").trim().toLowerCase();
  if (!query) return;
  // super-light fuzzy: prefix or substring match
  const cand = stops
    .map(s => ({ s, score: score(s, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.s;
  if (!cand) return;
  if (which === "start") setStart(cand); else setEnd(cand);
}
function score(s, q) {
  const n = s.name.toLowerCase(), c = s.code.toLowerCase();
  if (n.startsWith(q) || c.startsWith(q)) return 3;
  if (n.includes(q) || c.includes(q)) return 2;
  return 0;
}

function randomPair() {
  if (!stops.length) return;
  const a = stops[Math.floor(Math.random() * stops.length)];
  let b = stops[Math.floor(Math.random() * stops.length)];
  // ensure different + not too close
  let tries = 0;
  while ((b.code === a.code || haversine(a.lat, a.lng, b.lat, b.lng) < 1.0) && tries++ < 100) {
    b = stops[Math.floor(Math.random() * stops.length)];
  }
  setStart(a); setEnd(b);
  toast("🎲 New random challenge!");
}

function swap() {
  const { start, end } = current;
  if (!start || !end) return;
  setStart(end); setEnd(start);
  toast("⇆ Swapped");
}

async function locateNearestStart() {
  if (!navigator.geolocation) { toast("Geolocation not supported"); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const near = nearestStop(latitude, longitude);
    if (near) { setStart(near); toast(`📍 Start set to nearest: ${near.name}`); }
  }, err => {
    console.warn(err);
    toast("Couldn’t get location");
  }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 });
}

function nearestStop(lat, lng) {
  let best = null, bestD = 1e9;
  for (const s of stops) {
    const d = haversine(lat, lng, s.lat, s.lng);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function shareLink() {
  if (!current.start || !current.end) return;
  const url = new URL(location.href);
  url.searchParams.set("start", current.start.code);
  url.searchParams.set("end", current.end.code);
  navigator.clipboard?.writeText(url.toString());
  history.replaceState(null, "", url); // keep in bar
  toast("🔗 Link copied!");
}

function toggleTheme() {
  const html = document.documentElement;
  const now = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", now);
  localStorage.setItem("busg-theme", now);
}

// Persist last pair
function persist() {
  if (!current.start || !current.end) return;
  localStorage.setItem("busg-map", JSON.stringify({ start: current.start.code, end: current.end.code }));
}

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toast(msg) {
  els.toast.innerHTML = `<div class="bubble">${escapeHtml(msg)}</div>`;
  const node = els.toast.firstElementChild;
  node.style.opacity = '0';
  node.style.transform = 'translateY(8px)';
  requestAnimationFrame(() => {
    node.style.transition = '300ms';
    node.style.opacity = '1';
    node.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(8px)';
  }, 1800);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
