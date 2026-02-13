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

// ========= OPTIONAL: if you know the exact stop layer id in STYLE, put here =========
const STOPS_LAYER_ID_MANUAL = ""; // e.g. "glasgow_stops"

// ========= STATE =========
const quarters = buildQuarters("2019 Q1", "2023 Q4"); // 20
let selectedQuarter = quarters[0];
let selectedBeds = [1, 2, 3];

let wardFillLayerId = null;   // ✅ 自动识别真正填色的 ward layer
let wardSourceId = null;
let wardSourceLayer = null;

let stopsLayerId = null;

// ========= HELPERS =========
function $(id) { return document.getElementById(id); }

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
  const [sy, sq] = start.split(" Q");
  const [ey, eq] = end.split(" Q");
  const startY = Number(sy), startQ = Number(sq);
  const endY = Number(ey), endQ = Number(eq);
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

// ========= AUTO-DETECT LAYERS =========
function detectWardFillLayer() {
  const layers = map.getStyle()?.layers || [];

  // 候选：fill 图层 + id里带 ward/rent/glasgow
  const candidates = layers.filter((ly) => {
    const id = (ly.id || "").toLowerCase();
    const type = (ly.type || "").toLowerCase();
    const okName =
      id.includes("ward") || id.includes("wards") || id.includes("rent");
    return type === "fill" && okName;
  });

  if (!candidates.length) return null;

  // 选“当前渲染得最多 feature 的那个”作为填色层（最靠谱）
  let best = null;
  let bestCount = -1;
  for (const c of candidates) {
    try {
      const n = map.queryRenderedFeatures({ layers: [c.id] }).length;
      if (n > bestCount) {
        bestCount = n;
        best = c;
      }
    } catch (_) {}
  }
  return best ? best.id : candidates[0].id;
}

function detectStopsLayer() {
  if (STOPS_LAYER_ID_MANUAL && map.getLayer(STOPS_LAYER_ID_MANUAL)) return STOPS_LAYER_ID_MANUAL;

  const layers = map.getStyle()?.layers || [];
  const candidates = layers.filter((ly) => {
    const id = (ly.id || "").toLowerCase();
    const type = (ly.type || "").toLowerCase();
    const looks = id.includes("stop") || id.includes("stops") || id.includes("bus");
    const isPoint = type === "circle" || type === "symbol";
    return looks && isPoint;
  });

  return candidates.length ? candidates[0].id : null;
}

// ========= FILTER EXPRESSION =========
function wardFilterExpression() {
  // quarter 去空格匹配
  const qSelected = selectedQuarter.replace(/\s/g, "");
  const qField = ["replace", ["to-string", ["get", "YEARLY_QUARTER"]], " ", ""];

  // bedrooms 用 AGG_BEDROOMS
  const bedExpr =
    selectedBeds.length === 0
      ? ["==", 1, 0]
      : ["in", ["to-number", ["get", "AGG_BEDROOMS"]], ["literal", selectedBeds]];

  return ["all", ["==", qField, qSelected], bedExpr];
}

function applyWardFilters() {
  if (!wardFillLayerId || !map.getLayer(wardFillLayerId)) {
    setStatus("Ward fill layer not detected, cannot filter.", true);
    return;
  }
  setStatus("");

  map.setFilter(wardFillLayerId, wardFilterExpression());

  if (map.getLayer("ward-highlight")) {
    map.setFilter("ward-highlight", ["==", ["get", "WD23CD"], ""]);
  }

  updateLegendMeta();
}

function updateLegendMeta() {
  const meta = $("legendMeta");
  if (!meta) return;
  const bedText = selectedBeds.length ? selectedBeds.join("+") : "None (no wards shown)";
  meta.textContent = `Quarter: ${selectedQuarter}, Bed: ${bedText}`;
}

// ========= STOPS TOGGLE =========
function toggleStops() {
  if (!stopsLayerId || !map.getLayer(stopsLayerId)) {
    setStatus("Stops layer not found (set STOPS_LAYER_ID_MANUAL if needed).", true);
    return;
  }
  setStatus("");

  const v = map.getLayoutProperty(stopsLayerId, "visibility");
  map.setLayoutProperty(stopsLayerId, "visibility", v === "none" ? "visible" : "none");
}

// ========= HOVER + POPUP =========
function setupWardHoverAndPopup() {
  if (!wardFillLayerId || !map.getLayer(wardFillLayerId)) return;

  const wardLayer = map.getLayer(wardFillLayerId);
  wardSourceId = wardLayer.source;
  wardSourceLayer = wardLayer["source-layer"] || null;

  if (!map.getLayer("ward-highlight")) {
    map.addLayer(
      {
        id: "ward-highlight",
        type: "line",
        source: wardSourceId,
        ...(wardSourceLayer ? { "source-layer": wardSourceLayer } : {}),
        paint: { "line-color": "#111", "line-width": 3 },
        filter: ["==", ["get", "WD23CD"], ""]
      },
      wardFillLayerId
    );
  }

  map.on("mousemove", wardFillLayerId, (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (!e.features || !e.features.length) return;
    const code = String(e.features[0].properties?.WD23CD ?? "");
    map.setFilter("ward-highlight", ["==", ["get", "WD23CD"], code]);
  });

  map.on("mouseleave", wardFillLayerId, () => {
    map.getCanvas().style.cursor = "";
    map.setFilter("ward-highlight", ["==", ["get", "WD23CD"], ""]);
  });

  map.on("click", wardFillLayerId, (e) => {
    if (!e.features || !e.features.length) return;
    const p = e.features[0].properties || {};

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:13px;line-height:1.35;">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${p.WD23NM || p.WARD || "Ward"}</div>
        <div><b>Bedrooms</b>: ${p.AGG_BEDROOMS ?? "N/A"}</div>
        <div><b>Quarter</b>: ${p.YEARLY_QUARTER ?? "N/A"}</div>
        <hr style="border:none;border-top:1px solid #e6e6e6;margin:8px 0;">
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

// ========= UI =========
function readBedsFromUI() {
  selectedBeds = Array.from(document.querySelectorAll(".bedChk"))
    .filter((c) => c.checked)
    .map((c) => Number(c.value));
}

function bindUI() {
  const qSlider = $("qSlider");
  const qLabel = $("qLabel");

  if (qSlider) {
    qSlider.min = 0;
    qSlider.max = String(quarters.length - 1);
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

  document.addEventListener("change", (e) => {
    if (e.target?.classList?.contains("bedChk")) {
      readBedsFromUI();
      applyWardFilters();
    }
  });

  $("allBedsBtn")?.addEventListener("click", () => {
    document.querySelectorAll(".bedChk").forEach((c) => (c.checked = true));
    readBedsFromUI();
    applyWardFilters();
  });

  $("clearBedsBtn")?.addEventListener("click", () => {
    document.querySelectorAll(".bedChk").forEach((c) => (c.checked = false));
    readBedsFromUI();
    applyWardFilters();
  });

  $("toggleStops")?.addEventListener("click", toggleStops);

  $("resetView")?.addEventListener("click", () => {
    map.flyTo({ center: [-4.2518, 55.8642], zoom: 11, essential: true });
  });

  $("toggleLegend")?.addEventListener("click", () => {
    const el = $("legend");
    if (!el) return;
    el.style.display = el.style.display === "none" ? "block" : "none";
  });

  updateLegendMeta();
}

// ========= START =========
map.on("load", () => {
  // 1) detect layers
  wardFillLayerId = detectWardFillLayer();
  stopsLayerId = detectStopsLayer();

  if (!wardFillLayerId) {
    setStatus("Could not detect ward fill layer. Check your style layers naming.", true);
  } else {
    setStatus(`Detected ward fill layer: ${wardFillLayerId}`, false);
  }

  // 2) bind UI
  bindUI();

  // 3) setup hover/popup on detected layer
  setupWardHoverAndPopup();

  // 4) apply initial filter
  applyWardFilters();
});
