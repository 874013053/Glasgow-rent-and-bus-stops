/* Mapbox GL JS v3.6.0 */
mapboxgl.accessToken =
  "pk.eyJ1IjoiODc0MDEzMDUzIiwiYSI6ImNtbGtoeGMyZzA2aWQzZHF1M2J6bWVwMmwifQ.IbunfJx4bhtaedoCqw972w";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/874013053/cmlkv97ap004d01s9cf019870",
  center: [-4.2518, 55.8642],
  zoom: 11
});

map.addControl(new mapboxgl.NavigationControl());

// =====================
// CONFIG (确认你的 ward layer id)
// =====================
const WARD_LAYER_ID = "glasgow-wards-rent copy";

// 如果自动识别 stops 失败，你在这里填你 style 里“公交站点图层”的 layer id（不是 tileset 名）
const STOPS_LAYER_ID_MANUAL = ""; // e.g. "glasgow_stops"

// =====================
// UI state
// =====================
const quarters = buildQuarters("2019 Q1", "2023 Q4"); // 20 quarters
let selectedQuarter = quarters[0]; // default
let selectedBeds = [1, 2, 3]; // default all

// ward source info (用于高亮线层)
let wardSourceId = null;
let wardSourceLayer = null;

// stops layer id
let stopsLayerId = null;

// =====================
// Helpers
// =====================
function $(id) {
  return document.getElementById(id);
}

function setStatus(msg, isError = true) {
  const el = $("status");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isError ? "#b00020" : "#0b6b0b";
}

function fmt(n) {
  if (n === null || n === undefined) return "N/A";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString();
}

function buildQuarters(start, end) {
  // start/end format: "YYYY Qn"
  const [sy, sq] = start.split(" Q");
  const [ey, eq] = end.split(" Q");
  const startY = Number(sy);
  const startQ = Number(sq);
  const endY = Number(ey);
  const endQ = Number(eq);

  const out = [];
  for (let y = startY; y <= endY; y++) {
    for (let q = 1; q <= 4; q++) {
      if (y === startY && q < startQ) continue;
      if (y === endY && q > endQ) continue;
      out.push(`${y} Q${q}`);
    }
  }
  return out;
}

// =====================
// Filters
// =====================
function wardFilterExpression() {
  // 兼容 YEARLY_QUARTER 里是否有空格：两边都去空格再比较
  const qSelected = selectedQuarter.replace(/\s/g, ""); // "2019Q1"
  const qField = ["replace", ["to-string", ["get", "YEARLY_QUARTER"]], " ", ""]; // remove spaces

  // ✅ 改为 AGG_BEDROOMS
  const bedExpr =
    selectedBeds.length === 0
      ? ["==", 1, 0] // always false => show nothing
      : ["in", ["to-number", ["get", "AGG_BEDROOMS"]], ["literal", selectedBeds]];

  return ["all", ["==", qField, qSelected], bedExpr];
}

function applyWardFilters() {
  if (!map.getLayer(WARD_LAYER_ID)) {
    setStatus(`Ward layer not found: "${WARD_LAYER_ID}" (check style layer id)`);
    return;
  }
  setStatus("");

  map.setFilter(WARD_LAYER_ID, wardFilterExpression());

  // reset highlight (avoid highlighting filtered-out wards)
  if (map.getLayer("ward-highlight")) {
    map.setFilter("ward-highlight", ["==", ["get", "WD23CD"], ""]);
  }

  updateLegendMeta();
}

function updateLegendMeta() {
  const meta = $("legendMeta");
  if (!meta) return;

  const bedText =
    selectedBeds.length === 0 ? "None (no wards shown)" : selectedBeds.join("+");

  meta.textContent = `Quarter: ${selectedQuarter}, Bed: ${bedText}`;
}

// =====================
// Stops
// =====================
function guessStopsLayerId() {
  if (STOPS_LAYER_ID_MANUAL && map.getLayer(STOPS_LAYER_ID_MANUAL)) {
    return STOPS_LAYER_ID_MANUAL;
  }

  const layers = map.getStyle()?.layers || [];
  const candidates = layers.filter((ly) => {
    const id = (ly.id || "").toLowerCase();
    const type = (ly.type || "").toLowerCase();
    const looksLikeStops =
      id.includes("stop") || id.includes("stops") || id.includes("bus");
    const isPoint = type === "circle" || type === "symbol";
    return looksLikeStops && isPoint;
  });

  return candidates.length ? candidates[0].id : null;
}

function toggleStops() {
  if (!stopsLayerId || !map.getLayer(stopsLayerId)) {
    setStatus(
      `Stops layer not found. If toggle doesn't work, set STOPS_LAYER_ID_MANUAL in script.js.`
    );
    return;
  }
  setStatus("");

  const v = map.getLayoutProperty(stopsLayerId, "visibility");
  map.setLayoutProperty(stopsLayerId, "visibility", v === "none" ? "visible" : "none");
}

// =====================
// Hover highlight + click popup
// =====================
function setupWardHoverAndPopup() {
  const wardLayer = map.getLayer(WARD_LAYER_ID);
  if (!wardLayer) {
    setStatus(`Ward layer not found: "${WARD_LAYER_ID}" (hover/popup disabled)`);
    return;
  }

  wardSourceId = wardLayer.source;
  wardSourceLayer = wardLayer["source-layer"] || null;

  // highlight layer
  if (!map.getLayer("ward-highlight")) {
    map.addLayer(
      {
        id: "ward-highlight",
        type: "line",
        source: wardSourceId,
        ...(wardSourceLayer ? { "source-layer": wardSourceLayer } : {}),
        paint: {
          "line-color": "#111",
          "line-width": 3
        },
        filter: ["==", ["get", "WD23CD"], ""]
      },
      WARD_LAYER_ID
    );
  }

  map.on("mousemove", WARD_LAYER_ID, (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (!e.features || !e.features.length) return;

    const f = e.features[0];
    const code = f.properties?.WD23CD ? String(f.properties.WD23CD) : "";
    if (map.getLayer("ward-highlight")) {
      map.setFilter("ward-highlight", ["==", ["get", "WD23CD"], code]);
    }
  });

  map.on("mouseleave", WARD_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
    if (map.getLayer("ward-highlight")) {
      map.setFilter("ward-highlight", ["==", ["get", "WD23CD"], ""]);
    }
  });

  map.on("click", WARD_LAYER_ID, (e) => {
    if (!e.features || !e.features.length) return;

    const p = e.features[0].properties || {};
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 13px; line-height: 1.35;">
        <div style="font-weight:700; font-size:14px; margin-bottom:6px;">${p.WD23NM || p.WARD || "Ward"}</div>
        <div><b>Bedrooms</b>: ${p.AGG_BEDROOMS ?? "N/A"}</div>
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
}

// =====================
// UI binding
// =====================
function readBedsFromUI() {
  const checks = Array.from(document.querySelectorAll(".bedChk"));
  selectedBeds = checks.filter((c) => c.checked).map((c) => Number(c.value));
}

function bindUI() {
  // Quarter slider
  const qSlider = $("qSlider");
  const qLabel = $("qLabel");

  if (qSlider) {
    qSlider.min = 0;
    qSlider.max = String(Math.max(0, quarters.length - 1));
    qSlider.step = "1";
    qSlider.value = "0";
    if (qLabel) qLabel.textContent = quarters[0];

    qSlider.addEventListener("input", (e) => {
      const idx = Number(e.target.value);
      selectedQuarter = quarters[idx] ?? quarters[0];
      if (qLabel) qLabel.textContent = selectedQuarter;
      applyWardFilters();
    });
  }

  // Bedrooms: event delegation (robust)
  document.addEventListener("change", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("bedChk")) {
      readBedsFromUI();
      applyWardFilters();
    }
  });

  // All beds
  const allBtn = $("allBedsBtn");
  if (allBtn) {
    allBtn.addEventListener("click", () => {
      document.querySelectorAll(".bedChk").forEach((c) => (c.checked = true));
      readBedsFromUI();
      applyWardFilters();
    });
  }

  // Clear = clear all beds (map may become empty)
  const clearBtn = $("clearBedsBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      document.querySelectorAll(".bedChk").forEach((c) => (c.checked = false));
      readBedsFromUI(); // []
      applyWardFilters();
    });
  }

  // Toggle bus stops
  const stopsBtn = $("toggleStops");
  if (stopsBtn) stopsBtn.addEventListener("click", toggleStops);

  // Reset view
  const resetBtn = $("resetView");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      map.flyTo({ center: [-4.2518, 55.8642], zoom: 11, essential: true });
    });
  }

  // Legend toggle
  const legendBtn = $("toggleLegend");
  if (legendBtn) {
    legendBtn.addEventListener("click", () => {
      const el = $("legend");
      if (!el) return;
      const hidden = el.style.display === "none";
      el.style.display = hidden ? "block" : "none";
    });
  }

  updateLegendMeta();
}

// =====================
// Map load
// =====================
map.on("load", () => {
  // detect stops layer
  stopsLayerId = guessStopsLayerId();
  if (!stopsLayerId) {
    setStatus(
      "Stops layer not auto-detected. Toggle may not work until you set STOPS_LAYER_ID_MANUAL.",
      false
    );
  } else {
    setStatus("", false);
  }

  setupWardHoverAndPopup();
  bindUI();

  // initial filters
  applyWardFilters();
});
