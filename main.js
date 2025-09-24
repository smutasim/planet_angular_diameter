// =========================
// Planetary Angular Diameter & Illumination
// =========================

let manifest;
let angleChart;

// Mean radii of major bodies (km)
const PLANET_RADII_KM = {
  mercury: 2439.7,
  venus:   6051.8,
  earth:   6371.0,
  mars:    3389.5,
  jupiter: 69911.0,
  saturn:  58232.0,
  uranus:  25362.0,
  neptune: 24622.0,
  pluto:   1188.0
};

async function init() {
  manifest = await fetch(`data/manifest.json?ts=${Date.now()}`).then(r => r.json());
  
  const bodyNames = manifest.bodies.map(b => b.body);

  const obsSel = document.getElementById("observer");
  const tarSel = document.getElementById("target");
  obsSel.innerHTML = "";
  tarSel.innerHTML = "";

  bodyNames.forEach(b => {
    const label = b.charAt(0).toUpperCase() + b.slice(1);
    obsSel.add(new Option(label, b));
    tarSel.add(new Option(label, b));
  });

  obsSel.value = "earth";
  tarSel.value = "mars";

  document.getElementById("compute").addEventListener("click", compute);
}

async function loadBody(name) {
  return fetch(`data/${name}.json?ts=${Date.now()}`).then(r => r.json());
}

function magnitude(v) {
  return Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
}

function subtract(a,b) {
  return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
}

// Angular diameter (arcseconds) given radius (km) and distance (km)
function angularSize(radius_km, dist_km) {
  return (2 * Math.atan(radius_km / dist_km)) * (180 / Math.PI) * 3600;
}

async function compute() {
  const obs = document.getElementById("observer").value;
  const tar = document.getElementById("target").value;
  if (obs === tar) return alert("Observer and target cannot be the same");

  const obsData = await loadBody(obs);
  const tarData = await loadBody(tar);

  const times  = [];
  const angles = [];

  const n = Math.min(obsData.samples_weekly.length,
                     tarData.samples_weekly.length);
  const radius_km = PLANET_RADII_KM[tar];

  for (let i = 0; i < n; i++) {
    const t  = obsData.samples_weekly[i].time_iso;
    const o  = obsData.samples_weekly[i].position_km;
    const tg = tarData.samples_weekly[i].position_km;

    const rel  = subtract(tg, o);    // observer->target
    const dist = magnitude(rel);     // km

    times.push(t);
    angles.push(angularSize(radius_km, dist));
  }

  let closestDist, farthestDist;
  const observingOutward = tarData.periapsis_km > obsData.periapsis_km;

  if (observingOutward) {
    closestDist  = Math.abs(tarData.periapsis_km - obsData.apoapsis_km);
    farthestDist = Math.abs(tarData.apoapsis_km + obsData.apoapsis_km);
  } else {
    closestDist  = Math.abs(obsData.periapsis_km - tarData.apoapsis_km);
    farthestDist = Math.abs(obsData.apoapsis_km + tarData.apoapsis_km);
  }

  const maxAngle = angularSize(radius_km, closestDist).toFixed(2);
  const minAngle = angularSize(radius_km, farthestDist).toFixed(2);

  document.getElementById("minAngle").textContent = `${minAngle} arcsec`;
  document.getElementById("maxAngle").textContent = `${maxAngle} arcsec`;

  const years = parseInt(document.getElementById("yearRange").value);
  const startDate = new Date(times[0]);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + years);

  // Build filtered arrays
  const filteredTimes = [];
  const filteredAngles = [];
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    if (t <= endDate) {
      filteredTimes.push(times[i]);
      filteredAngles.push(angles[i]);
    }
  }

  plotCharts(filteredTimes, filteredAngles);
}

function plotCharts(times, angles) {
  const labels = times.map(t => new Date(t).toISOString().split("T")[0]);

  if (angleChart) angleChart.destroy();
  const canvas = document.getElementById('angleChart');
  const ctx = canvas.getContext('2d');

  // Handle Retina scaling
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  angleChart = new Chart(document.getElementById('angleChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Angular Diameter (arcsec)',
        data: angles,
        borderColor: 'blue',
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { text: "Date", display: true } },
        y: { title: { text: "Arcseconds", display: true } }
      }
    }
  });
}

init();
