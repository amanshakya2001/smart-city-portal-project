/* =========================================================
   Theme (light/dark) — persisted in localStorage
   ========================================================= */
(function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
})();

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
window.toggleTheme = toggleTheme;

/* =========================================================
   Year in footer
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

/* =========================================================
   Traffic lights — auto-cycle red → green → yellow → red
   Each junction gets its own offset so the city looks alive.
   ========================================================= */
function startTrafficSimulation() {
  const housings = document.querySelectorAll('.traffic-housing');
  if (!housings.length) return;

  // Phase ordering: 0=red, 1=green, 2=yellow
  const phases = ['red', 'green', 'yellow'];
  const durations = [5, 4, 2]; // seconds per phase

  housings.forEach((housing, i) => {
    let phase = i % 3; // offset start phase per light
    let secondsLeft = durations[phase];
    const timer = housing.parentElement.querySelector('.traffic-time .seconds');
    const lights = housing.querySelectorAll('.traffic-light');

    const apply = () => {
      lights.forEach(l => l.classList.remove('on'));
      housing.querySelector(`.traffic-light.${phases[phase]}`).classList.add('on', phases[phase]);
      if (timer) timer.textContent = secondsLeft;
    };
    apply();

    setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        phase = (phase + 1) % 3;
        secondsLeft = durations[phase];
      }
      apply();
    }, 1000);
  });
}

/* =========================================================
   Search filter — cameras + traffic lights
   Filters by anything in [data-search]
   ========================================================= */
function setupSearch() {
  const inputs = document.querySelectorAll('[data-search-input]');
  if (!inputs.length) return;

  const apply = (q) => {
    q = q.trim().toLowerCase();
    document.querySelectorAll('[data-searchable]').forEach(group => {
      const items = group.querySelectorAll('[data-search]');
      let visible = 0;
      items.forEach(item => {
        const haystack = item.dataset.search.toLowerCase();
        const match = !q || haystack.includes(q);
        item.classList.toggle('hidden', !match);
        if (match) visible++;
      });
      const empty = group.querySelector('.no-results');
      if (empty) empty.classList.toggle('hidden', visible !== 0);
    });
  };

  inputs.forEach(input => {
    input.addEventListener('input', (e) => {
      apply(e.target.value);
      inputs.forEach(o => { if (o !== input) o.value = e.target.value; });
    });
  });
}

/* =========================================================
   Leaflet map — Ambulance + hospital + police stations
   No API key required (OpenStreetMap tiles)
   ========================================================= */
function initLeafletMap() {
  const el = document.getElementById('map');
  if (!el || typeof L === 'undefined') return;

  const points = {
    ambulances: [
      { lat: 27.1751,  lng: 78.0421, name: 'Ambulance A-12', loc: 'Sector 14 dispatch' },
      { lat: 27.2064,  lng: 78.0471, name: 'Ambulance A-08', loc: 'Civil Lines' },
      { lat: 27.1860,  lng: 78.0340, name: 'Ambulance A-21', loc: 'Industrial Area' },
    ],
    hospitals: [
      { lat: 27.18821, lng: 78.00144, name: 'City General Hospital', loc: 'Open · 24×7 Emergency' },
      { lat: 27.1950,  lng: 78.0500,  name: 'Sunrise Multi-speciality', loc: 'Open · 24×7 Emergency' },
    ],
    stations: [
      { lat: 27.1810, lng: 78.0250, name: 'Police HQ', loc: 'Central command' },
      { lat: 27.2010, lng: 78.0150, name: 'Traffic Police — Hanuman Chawak', loc: 'Open 06:00–22:00' },
    ],
  };

  const map = L.map(el, { zoomControl: true, scrollWheelZoom: false })
    .setView([27.189, 78.030], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const makeIcon = (color, label) => L.divIcon({
    className: 'sc-marker',
    html: `<div style="
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      box-shadow:0 4px 12px rgba(0,0,0,.25);
      display:grid;place-items:center;color:#fff;font-size:14px;
      border:2.5px solid #fff;">
        <span style="transform:rotate(45deg);">${label}</span>
      </div>`,
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32],
  });

  const layers = {
    ambulance: L.layerGroup(),
    hospital: L.layerGroup(),
    station: L.layerGroup(),
  };

  points.ambulances.forEach(p => {
    L.marker([p.lat, p.lng], { icon: makeIcon('#dc2626', '🚑') })
      .bindPopup(`<strong>${p.name}</strong><br><span style="color:#6b7280;font-size:.85rem;">${p.loc}</span>`)
      .addTo(layers.ambulance);
  });
  points.hospitals.forEach(p => {
    L.marker([p.lat, p.lng], { icon: makeIcon('#16a34a', '🏥') })
      .bindPopup(`<strong>${p.name}</strong><br><span style="color:#6b7280;font-size:.85rem;">${p.loc}</span>`)
      .addTo(layers.hospital);
  });
  points.stations.forEach(p => {
    L.marker([p.lat, p.lng], { icon: makeIcon('#2563eb', '🚓') })
      .bindPopup(`<strong>${p.name}</strong><br><span style="color:#6b7280;font-size:.85rem;">${p.loc}</span>`)
      .addTo(layers.station);
  });

  Object.values(layers).forEach(g => g.addTo(map));

  // Re-enable scroll-zoom only after a click on the map (avoid hijacking page scroll)
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());
}

/* =========================================================
   Smooth scroll for anchor links
   ========================================================= */
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 8;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* =========================================================
   Contact form (demo only — no backend)
   ========================================================= */
function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const status = document.getElementById('contactStatus');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (status) {
      status.textContent = 'Thanks — your message has been queued. (Demo only)';
      status.style.color = 'var(--success)';
      setTimeout(() => { status.textContent = ''; }, 4000);
    }
    form.reset();
  });
}

/* =========================================================
   Boot
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  startTrafficSimulation();
  setupSearch();
  setupSmoothScroll();
  setupContactForm();
  initLeafletMap();
});
