/* Mapbox GL JS v3.6.0 */
mapboxgl.accessToken =
  "pk.eyJ1IjoiODc0MDEzMDUzIiwiYSI6ImNtbGtoeGMyZzA2aWQzZHF1M2J6bWVwMmwifQ.IbunfJx4bhtaedoCqw972w";

const homeCenter = [-4.2518, 55.8642];
const homeZoom = 11;

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/874013053/cmlkv97ap004d01s9cf019870",
  center: homeCenter,
  zoom: homeZoom
});

map.addControl(new mapboxgl.NavigationControl());

// ===== STYLE layer ids =====
const wardLayerId = "glasgow-wards-rent copy"; // wards fill layer (STYLE layer id)
const stopsSourceLayerName = "glasgow_stops";  // stops tileset source-layer name

// ===== quarters: 2019Q1–2023Q4 =====
const quarters = (() => {
  const out = [];
  for (let y = 2019; y <= 2023; y++) {
    for (let q = 1; q <= 4; q++) out.push(`${y} Q${q}`);
  }
  return out;
})();

// ===== state =====
let selectedQuarter = quarters[0];    // "2019 Q1"
let selectedBeds = [1, 2, 3];         // multi-select beds

let wardSourceId = null;
let wardSourceLayer = null;

// ===== helpers =====
function getEl(id) {
  return document.getElementById(id);
}

function fmt(n) {
  if (n === null || n === undefined) return "N/A";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString();
}

function findStopsLayerId() {
  
  if (map.getLayer("glasgow_stops")) return "glasgow_stops";

  
  const layers = (map.getStyle() && map.getStyle().layers) ? map.getStyle().layers : [];
  const hit = layers.find(
    (l) =>
      (l.type === "circle" || l.type === "symbol") &&
      l["source-layer"] === stopsSourceLayerName
  );
  return hit ? hit.id : null;
}

function readBedsFromUI() {
  const checks = Array.from(document.querySelectorAll("#bedFilters .bedChk"));
  const selected = checks.filter((c) => c.checked).map((c) => Number(c.value));

  
  if (selected.length === 0) {
    checks.forEach((c) => (c.checked = true));
    selectedBeds = checks.map((c) => Number(c.value));
    return;
  }
  selectedBeds = selected;
}

// ===== filters=====
function wardFilters() {
  // YEARLY_QUARTER is like "2019 Q1"
  const fQuarter = ["==", ["get", "YEARLY_QUARTER"], selectedQuarter];

  // BEDROOMS is like "1 bed" / "2 bed" / "3 bed"
  const bedStrings = selectedBeds.map((b) => `${b} bed`);
  const fBed = ["in", ["get", "BEDROOMS"], ["literal", bedStrings]];

  return ["all", fQuarter, fBed];
}

function updateLegendMeta() {
  const el = getEl("legendMeta");
  if (!el) return;
  const bedText = selectedBeds.length ? selectedBeds.join("+") : "None";
  el.textContent = `Quarter: ${selectedQuarter}, Bed: ${bedText}`;
}

function applyWardFilters() {
  if (map.getLayer(wardLayerId)) {
    map.setFilter(wardLayerId, wardFilters());
  }
  if (map.getLayer("ward-highlight")) {
    map.setFilter("ward-highlight", ["all", ["==", ["get", "WD23CD"], ""], wardFilters()]);
  }
  updateLegendMeta();
}

// ===== UI listeners  =====
(function bindUI() {
  // Quarter slider
  const qSlider = getEl("qSlider");
  const qLabel = getEl("qLabel");
  if (qSlider && qLabel) {
    qSlider.min = 0;
    qSlider.max = quarters.length - 1;
    qSlider.step = 1;
    qSlider.value = 0;
    qLabel.textContent = selectedQuarter;

    qSlider.addEventListener("input", (e) => {
      const idx = Number(e.target.value);
      selectedQuarter = quarters[idx] || quarters[0];
      qLabel.textContent = selectedQuarter;
      if (map.isStyleLoaded()) applyWardFilters();
    });
  }

  // Bedrooms checkboxes
  const bedWrap = getEl("bedFilters");
  if (bedWrap) {
    readBedsFromUI();
    updateLegendMeta();

    bedWrap.addEventListener("change", (e) => {
      if (e.target && e.target.classList.contains("bedChk")) {
        readBedsFromUI();
        if (map.isStyleLoaded()) applyWardFilters();
      }
    });
  }

  // All beds
  const allBtn = getEl("allBedsBtn");
  if (allBtn) {
    allBtn.addEventListener("click", () => {
      document.querySelectorAll("#bedFilters .bedChk").forEach((c) => (c.checked = true));
      readBedsFromUI();
      if (map.isStyleLoaded()) applyWardFilters();
    });
  }

  // Clear beds
  const clearBtn = getEl("clearBedsBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      document.querySelectorAll("#bedFilters .bedChk").forEach((c) => (c.checked = false));
      readBedsFromUI(); // 会自动全选，避免空白
      if (map.isStyleLoaded()) applyWardFilters();
    });
  }

  // Toggle bus stops
  const toggleStopsBtn = getEl("toggleStops");
  if (toggleStopsBtn) {
    toggleStopsBtn.addEventListener("click", () => {
      if (!map.isStyleLoaded()) return;

      const stopsLayerId = findStopsLayerId();
      if (!stopsLayerId || !map.getLayer(stopsLayerId)) {
        console.warn("Stops layer not found. Check style layer id / source-layer.");
        return;
      }

      const v = map.getLayoutProperty(stopsLayerId, "visibility");
      map.setLayoutProperty(stopsLayerId, "visibility", v === "none" ? "visible" : "none");
    });
  }

  // Reset view
  const resetBtn = getEl("resetView");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      map.flyTo({ center: homeCenter, zoom: homeZoom });
    });
  }

  // Legend toggle (fixed)
const legendBtn = getEl("toggleLegend");
if (legendBtn) {
  legendBtn.addEventListener("click", () => {
    const el = getEl("legend");
    if (!el) return;

    
    const isHidden = (el.style.display === "none");
    el.style.display = isHidden ? "block" : "none";
  });
}
})();

// ===== Map interactions =====
map.on("load", () => {
  const wardLayer = map.getLayer(wardLayerId);
  if (!wardLayer) {
    console.error("Ward layer not found:", wardLayerId);
    return;
  }

  wardSourceId = wardLayer.source;
  wardSourceLayer = wardLayer["source-layer"] || null;

  // Feature 1: hover highlight (add outline layer)
  
  if (!map.getLayer("ward-highlight")) {
    map.addLayer({
      id: "ward-highlight",
      type: "line",
      source: wardSourceId,
      ...(wardSourceLayer ? { "source-layer": wardSourceLayer } : {}),
      paint: {
        "line-color": "#111",
        "line-width": 3
      },
      filter: ["all", ["==", ["get", "WD23CD"], ""], wardFilters()]
    });
  }

  // Apply initial filters
  applyWardFilters();

  // Feature 1: hover highlight
  map.on("mousemove", wardLayerId, (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (!e.features || !e.features.length) return;

    const f = e.features[0];
    const code = f.properties && f.properties.WD23CD ? String(f.properties.WD23CD) : "";

    map.setFilter("ward-highlight", ["all", ["==", ["get", "WD23CD"], code], wardFilters()]);
  });

  map.on("mouseleave", wardLayerId, () => {
    map.getCanvas().style.cursor = "";
    map.setFilter("ward-highlight", ["all", ["==", ["get", "WD23CD"], ""], wardFilters()]);
  });

  // Feature 2: click popup
  map.on("click", wardLayerId, (e) => {
    if (!e.features || !e.features.length) return;

    const p = e.features[0].properties || {};
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 13px; line-height: 1.35;">
        <div style="font-weight:700; font-size:14px; margin-bottom:6px;">${p.WD23NM || p.WARD || "Ward"}</div>
        <div><b>Bedrooms</b>: ${p.BEDROOMS ?? "N/A"}</div>
        <div><b>Quarter</b>: ${p.YEARLY_QUARTER ?? "N/A"}</div>
        <hr style="border:none; border-top:1px solid #e6e6e6; margin:8px 0;">
        <div><b>Median rent</b>: ${fmt(p.median)}</div>
        <div><b>Mean rent</b>: ${fmt(p.mean)}</div>
        <div><b>Count</b>: ${fmt(p.count)}</div>
        <div><b>Min–Max</b>: ${fmt(p.min)} – ${fmt(p.max)}</div>
      </div>
    `;

    new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  });
});
