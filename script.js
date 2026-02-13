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
// CONFIG (你已确认 ward layer id)
// =====================
const wardLayerId = "glasgow-wards-rent copy";

// stops layer id：优先自动猜测；如果自动失败你再手动填
let stopsLayerId = null;

// =====================
// UI state
// =====================
const quarters = buildQuarters("2019 Q1", "2023 Q4"); // 20 quarters
let selectedQuarter = quarters[0]; // default 2019 Q1
let selectedBeds = [1, 2, 3]; // default all selected

// ward source info (用于高亮线层)
let wardSourceId = null;
let wardSourceLayer = null;

function $(id) {
  return document.getElementById(id);
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
  // YEARLY_QUARTER + BEDROOMS
  // BEDROOMS 字段可能是 number 或 string，使用 to-number 更稳
  const bedExpr =
    selectedBeds.length === 0
      ? ["==", 1, 0] // always false (show nothing)
      : ["in", ["to-number", ["get", "BEDROOMS"]], ["literal", selectedBeds]];

  return [
    "all",
    ["==", ["to-string", ["get", "YEARLY_QUARTER"]], selectedQuarter],
    bedExpr
  ];
}

function applyWardFilters() {
  if (!map.getLayer(wardLayerId)) return;

  map.setFilter(wardLayerId, wardFilterExpression());

  // 高亮层也要跟随 ward layer 的过滤（否则鼠标 hover 会高亮到被过滤的 ward）
  if (map.getLayer("ward-highlight")) {
    map.setFilter("ward-highlight", ["==", ["get", "WD23CD"], ""]); // reset highlight
  }

  updateLegendMeta();
}

function updateLegendMeta() {
  const meta = $("legendMeta");
  if (!meta) return;

  const bedText =
    selectedBeds.length === 0
      ? "None (no wards shown)"
      : selectedBeds.join("+");

  meta.textContent = `Quarter: ${selectedQuarter}, Bed: ${bedText}`;
}

// =====================
// Stops layer auto-detect + toggle
// =====================
function guessStopsLayerId() {
  // try to find a circle/symbol layer whose id contains stop/bus and is a point layer
  const layers = map.getStyle()?.layers || [];
  const candidates = layers.filter((ly) => {
    const id = (ly.id || "").toLowerCase();
    const type = (ly.type || "").toLowerCase();
    const looksLikeStops =
      id.includes("stop") || id.includes("stops") || id.includes("bus");
    const isPoint = type === "circle" || type === "symbol";
    return looksLikeStops && isPoint;
  });

  if (candidates.length > 0) return candidates[0].id;
  return null;
}

function setStopsVisible(visible) {
  if (!stopsLayerId || !map.getLayer(stopsLayerId)) return;
  map.setLayoutProperty(stopsLayerId, "visibility", visible ? "visible" : "none");
}

function toggleStops() {
  if (!stopsLayerId || !map.getLayer(stopsLayerId)) {
    console.warn(
      "Stops layer not found. Open Mapbox Studio style and confirm the BUS STOPS layer id, then set stopsLayerId manually."
    );
    return;
  }
  const v = map.getLayoutProperty(stopsLayerId, "visibility");
  setStopsVisible(v !== "visible");
}

// =====================
// Hover highlight + click popup
// =====================
function setupWardHoverAndPopup() {
  const wardLayer = map.getLayer(wardLayerId);
  if (!wardLayer) {
    console.error("Ward layer not found:", wardLayerId);
    return;
  }

  wardSourceId = wardLayer.source;
  wardSourceLayer = wardLayer["source-layer"] || null;

  // add highlight line layer ABOVE wards
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
    // put it above the ward polygons if possible
    wardLayerId
  );

  map.on("mousemove", wardLayerId, (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (!e.features || !e.features.length) return;

    // 如果当前 wards 被 filter 掉，高亮不应乱跳：
    // 只对当前可见 features 做高亮（Mapbox 会自动给可见 features）
    const f = e.features[0];
    const code = f.properties?.WD23CD ? String(f.properties.WD23CD) : "";
    map.setFilter("ward-highlight", ["==", ["get", "WD23CD"], code]);
  });

  map.on("mouseleave", wardLayerId, () => {
    map.getCanvas().style.cursor = "";
    map.setFilter("ward-highlight", ["==", ["get", "WD23CD"], ""]);
  });

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
}

// =====================
// UI binding (robust)
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
    qSlider.max = Math.max(0, quarters.length - 1);
    qSlider.step = 1;
    qSlider.value = "0";

    if (qLabel) qLabel.textContent = quarters[0];

    qSlider.addEventListener("input", (e) => {
      const idx = Number(e.target.value);
      selectedQuarter = quarters[idx] ?? quarters[0];
      if (qLabel) qLabel.textContent = selectedQuarter;
      applyWardFilters();
    });
  }

  // Bedrooms: event delegation (works even if HTML wrapper changes)
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

  // Clear = 清空所有选择（地图可能空）
  const clearBtn = $("clearBedsBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      document.querySelectorAll(".bedChk").forEach((c) => (c.checked = false));
      readBedsFromUI(); // selectedBeds becomes []
      applyWardFilters();
    });
  }

  // Toggle bus stops
  const stopsBtn = $("toggleStops");
  if (stopsBtn) {
    stopsBtn.addEventListener("click", () => {
      toggleStops();
    });
  }

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
      const isHidden = el.style.display === "none";
      el.style.display = isHidden ? "block" : "none";
    });
  }

  updateLegendMeta();
}

// =====================
// Map load
// =====================
map.on("load", () => {
  // auto-detect stops layer id once style is loaded
  stopsLayerId = guessStopsLayerId();
  if (!stopsLayerId) {
    console.warn(
      "Could not auto-detect stops layer id. If the toggle doesn't work, set stopsLayerId manually in script.js."
    );
  } else {
    // ensure visible on start (optional)
    setStopsVisible(true);
  }

  setupWardHoverAndPopup();

  // initial filters
  applyWardFilters();

  // bind UI after map is ready
  bindUI();
});
