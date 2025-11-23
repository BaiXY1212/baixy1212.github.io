// ===== Part 1 (Section 1): Heatwave Map (Canvas) + Dumbbell =====
const GEOJSON_PATH = "data/city_lst_toggle_fixed_clean.json";
const DUMBBELL_PATH = "data/suhi_summary.json";
const BOUNDARY_PATH = "data/B.geojson";

function getSize(sel, w0 = 560, h0 = 520) {
  const n = document.querySelector(sel);
  return { w: Math.max(n?.clientWidth || w0, 360), h: Math.max(n?.clientHeight || h0, 420) };
}
function niceExtent(v, pad = 0.12) {
  const mn = d3.min(v), mx = d3.max(v), span = Math.max(1e-6, mx - mn);
  return [mn - pad * span, mx + pad * span];
}

let currentCity = document.querySelector("#city-select")?.value || "Greater Sydney";
let currentPeriod = "Normal"; // Normal / Extreme

//  MAP (Canvas) — CORRECT COLOR & LEGEND
(async function initMap() {
  const { w, h } = getSize("#vis_1a", 620, 520);
  const LST_DOMAIN = [10, 50];
  const LST_MIN = LST_DOMAIN[0];
  const LST_MAX = LST_DOMAIN[1];

  // Ensure that currentCity has a value on the first load.
  if (!currentCity || currentCity === "") {
    currentCity = document.querySelector("#city-select")?.value || "Greater Sydney";
  }

// === Tooltip for Map ===
let tooltipMap = d3.select(".tooltipMap");
if (tooltipMap.empty()) {
  tooltipMap = d3.select("body")
    .append("div")
    .attr("class", "tooltipMap")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "5px")
    .style("font-size", "12px")
    .style("font-family", "Poppins, Arial, sans-serif")
    .style("pointer-events", "none")
    .style("opacity", 0);
}


  // Inferno reversal: Low temperature yellow → High temperature purple
  const color = d3.scaleSequential()
    .domain([LST_MAX, LST_MIN]) // Reverse domain order
    .interpolator(d3.interpolateInferno);

  const svg = d3.select("#vis_1a").html("")
    .append("svg")
    .attr("width", w)
    .attr("height", h)
    .style("background", "none") // Remove background color
    .style("border-radius", "10px");

  const gCanvas = svg.append("g");
  const gOutline = svg.append("g");

  // ---- Toggle ----
  const controls = d3.select("#vis_1a").append("div").attr("class", "toggle-container");
  controls.append("button").attr("class", "toggle-btn active").attr("id", "btn-normal").text("Normal")
    .on("click", () => setPeriod("Normal"));
  controls.append("button").attr("class", "toggle-btn").attr("id", "btn-extreme").text("Extreme")
    .on("click", () => setPeriod("Extreme"));

  // ---- Load data ----
  const [ptJSON, boundaryJSON] = await Promise.all([
    d3.json(GEOJSON_PATH),
    d3.json(BOUNDARY_PATH)
  ]);
  const cityPts = d3.group(ptJSON, d => d.city, d => d.mode);
  const cityGeomMap = new Map(boundaryJSON.features.map(f => [f.properties["GCCSA_NAME_2021"], f]));

  const projection = d3.geoMercator();
  const pathSVG = d3.geoPath(projection);

  // ---- Canvas ----
  const canvasNode = gCanvas.append("foreignObject")
    .attr("width", w).attr("height", h)
    .append("xhtml:canvas")
    .attr("width", w)
    .attr("height", h)
    .node();
  const ctx = canvasNode.getContext("2d");

  function fitCityByBoundary(city) {
    const feat = cityGeomMap.get(city);
    if (!feat) return;
    const pad = 16;
    projection.fitExtent([[pad, pad], [w - pad, h - 70]], feat);
 
    // Force a refresh of the legend after each fitExtent call (to prevent offset after switching cities).
    requestAnimationFrame(() => drawLegend(ctx, color));
   }

  function drawBoundary(city) {
    const feat = cityGeomMap.get(city);
    gOutline.selectAll("*").remove();
    if (feat) {
      gOutline.append("path")
        .datum(feat)
        .attr("d", pathSVG)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.6)
        .attr("pointer-events", "none");
    }
  }

  function drawLegend(ctx, color) {
    const legendW = 22, legendH = 200;
    const marginRight = Math.min(80, w * 0.12); // Automatically adapts to different screen widths
    const x = w - legendW - 25 - marginRight;  
    const y = (h - legendH) / 2;          


    // Gradient direction: from bottom to top
    const grad = ctx.createLinearGradient(0, y + legendH, 0, y);
    const n = 100;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const v = LST_MIN + (LST_MAX - LST_MIN) * t;  // 10 → 50
      grad.addColorStop(t, color(v));               // Consistent with the map
    }

    // Background frame
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    const legendBoxX = x - 10, legendBoxY = y - 30;
    const legendBoxW = legendW + 52, legendBoxH = legendH + 42;

    // Draw a rounded rectangle background
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(legendBoxX + r, legendBoxY);
    ctx.lineTo(legendBoxX + legendBoxW - r, legendBoxY);
    ctx.quadraticCurveTo(legendBoxX + legendBoxW, legendBoxY, legendBoxX + legendBoxW, legendBoxY + r);
    ctx.lineTo(legendBoxX + legendBoxW, legendBoxY + legendBoxH - r);
    ctx.quadraticCurveTo(legendBoxX + legendBoxW, legendBoxY + legendBoxH, legendBoxX + legendBoxW - r, legendBoxY + legendBoxH);
    ctx.lineTo(legendBoxX + r, legendBoxY + legendBoxH);
    ctx.quadraticCurveTo(legendBoxX, legendBoxY + legendBoxH, legendBoxX, legendBoxY + legendBoxH - r);
    ctx.lineTo(legendBoxX, legendBoxY + r);
    ctx.quadraticCurveTo(legendBoxX, legendBoxY, legendBoxX + r, legendBoxY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Gradient strip + border
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, legendW, legendH);
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x, y, legendW, legendH);
    ctx.restore();

    // Gradients: Bottom 10°C → Top 50°C
    const steps = 5;
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#333";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= steps; i++) {
      const v  = LST_MIN + (LST_MAX - LST_MIN) * (i / steps);
      const yy = y + legendH - (legendH * i) / steps;         // Place from bottom to top
      ctx.fillText(`${v.toFixed(0)}°C`, x + legendW + 6, yy);
    }

    // Move the title up to avoid overlapping with 50°C
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("LST (°C)", x + legendW + 28, y - 16);
  }

  function renderCity(city, mode) {
    const group = cityPts.get(city);
    if (!group) return;
    const rec = group.get(mode)?.[0];
    if (!rec) return;

    const pts = rec.values.map(d => ({ lon: +d.lon, lat: +d.lat, lst: +d.lst }));
    ctx.clearRect(0, 0, w, h);

    // Clipping boundaries
    const feat = cityGeomMap.get(city);
    const clipPath = new Path2D(pathSVG(feat));
    ctx.save();
    ctx.clip(clipPath);

    // The city titles on the map are updated synchronously after each rendering.
    d3.select("#vis_1a svg .city-label")
      .text(city);

    // Plotting heat points
    const buffer = document.createElement("canvas");
    buffer.width = w; buffer.height = h;
    const bctx = buffer.getContext("2d");
    bctx.globalAlpha = 0.85;
    const R = 2.2;
    pts.forEach(p => {
      const [x, y] = projection([p.lon, p.lat]);
      bctx.fillStyle = color(p.lst);
      bctx.beginPath();
      bctx.arc(x, y, R, 0, Math.PI * 2);
      bctx.fill();
    });

    // Blur overlay
    ctx.filter = "blur(1.6px)";
    ctx.drawImage(buffer, 0, 0);
    ctx.filter = "none";
    ctx.restore();

    drawBoundary(city);

    setTimeout(() => drawLegend(ctx, color), 80);

    // === Tooltip interaction on canvas ===
    canvasNode.onmousemove = (event) => {
      const rect = canvasNode.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const radius = 3; // Detection radius
      let found = null;

      // Find the nearest point (within a radius of 3 pixels).
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = projection([pts[i].lon, pts[i].lat]);
        const dx = mx - x, dy = my - y;
        if (dx * dx + dy * dy <= radius * radius) {
          found = pts[i];
          break;
        }
      }

      if (found) {
        tooltipMap
          .style("opacity", 1)
          .html(`<b>LST:</b> ${found.lst.toFixed(1)}°C`)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 20) + "px");
      } else {
        tooltipMap.style("opacity", 0);
      }
    };

    canvasNode.onmouseleave = () => tooltipMap.style("opacity", 0);
  }

  // === Image title & city name ===
  const svgTitle = d3.select("#vis_1a svg");
  svgTitle.selectAll(".map-title, .city-label").remove();

  // Image title
  svgTitle.append("text")
    .attr("class", "map-title")
    .attr("x", w / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .text("Surface Heat Distribution during Normal vs Extreme Periods")
    .style("font-family", "Poppins, Arial, sans-serif")
    .style("font-size", "14px")
    .style("fill", "#555")
    .style("opacity", 0)
    .transition()
    .duration(800)
    .style("opacity", 1);

  // city name
  svgTitle.append("text")
    .attr("class", "city-label")
    .attr("x", w / 2)
    .attr("y", 65)
    .attr("text-anchor", "middle")
    .text(currentCity)
    .style("font-family", "Poppins, Arial, sans-serif")
    .style("font-size", "18px")
    .style("font-weight", "600")
    .style("fill", "#111");

  // Move the entire map down (to avoid the title being covered).
  gCanvas.attr("transform", "translate(0,60)");
  gOutline.attr("transform", "translate(0,60)");

  function setPeriod(p) {
    currentPeriod = p;
    renderCity(currentCity, currentPeriod);

    // Force legend to refresh once
    setTimeout(() => {
      drawLegend(ctx, color);
    }, 100);

    // Safe call (no error will be reported even if the variable is not declared).
    if (typeof window.updateDumbbellHighlight === "function") {
      window.updateDumbbellHighlight();
    }

    d3.selectAll("#vis_1a .toggle-btn").classed("active", false);
    d3.select(p === "Normal" ? "#btn-normal" : "#btn-extreme").classed("active", true);
  }

  // b) Make the same change in the change listener for city-select.
  document.querySelector("#city-select")?.addEventListener("change", e => {
    currentCity = e.target.value;
    fitCityByBoundary(currentCity);
    renderCity(currentCity, currentPeriod);

    if (typeof window.updateDumbbellHighlight === "function") {
      window.updateDumbbellHighlight();
    }
  });

  fitCityByBoundary(currentCity);
  renderCity(currentCity, currentPeriod);

  // Delaying the rendering of the first legend frame ensures that the map and projection are fully rendered.
  setTimeout(() => drawLegend(ctx, color), 300);

  // Initialize button state (default highlight: Normal)
  d3.selectAll("#vis_1a .toggle-btn").classed("active", false);
  d3.select("#btn-normal").classed("active", true);

  // Keep global function definitions at the end
  window.__part1_setPeriod = setPeriod;
})();




// DUMBBELL PLOT (Part 1)
(function initDumbbell() {
  const wrap = d3.select("#vis_1b");
  const width = 520;
  const height = 460;
  const margin = { top: 70, right: 25, bottom: 55, left: 170 };

  const svg = wrap.html("")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // === Main title + city name ===
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 35)
    .attr("text-anchor", "middle")
    .text("Urban Heat Difference between Normal and Heatwave Periods")
    .style("font-family", "Poppins, Arial, sans-serif")
    .style("font-size", "14px")
    .style("fill", "#555");

  const cityLabel = svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 10)
    .attr("text-anchor", "middle")
    .text(currentCity)
    .style("font-family", "Poppins, Arial, sans-serif")
    .style("font-size", "18px")
    .style("font-weight", "600")
    .style("letter-spacing", "0.4px")
    .style("fill", "#111");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // --- load data ---
  d3.json(DUMBBELL_PATH).then(rows => {
    rows.forEach(d => {
      d.city_name = d.city || d.city_name || "Unknown";
      d.Normal = +d.Normal;
      d.Extreme = +d.Extreme;
    });

    const x = d3.scaleLinear()
      .domain(d3.extent(rows.flatMap(d => [d.Normal, d.Extreme])))
      .nice()
      .range([0, width - margin.left - margin.right]);

    const y = d3.scaleBand()
      .domain(rows.map(d => d.city_name))
      .range([0, height - margin.top - margin.bottom])
      .padding(0.45);

    // axis
    g.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6))
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("font-size", "12px");
    g.append("g")
      .call(d3.axisLeft(y))
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("font-size", "12px");

    // Connection
    const lines = g.selectAll(".db-line")
      .data(rows)
      .join("line")
      .attr("x1", d => x(d.Normal))
      .attr("x2", d => x(d.Extreme))
      .attr("y1", d => y(d.city_name) + y.bandwidth() / 2)
      .attr("y2", d => y(d.city_name) + y.bandwidth() / 2)
      .attr("stroke", "#e9cfa6")
      .attr("stroke-width", 6)
      .attr("stroke-linecap", "round")
      .attr("opacity", 0.9);

    // Two endpoints
    const nDot = g.selectAll(".dot-n")
      .data(rows)
      .join("circle")
      .attr("cx", d => x(d.Normal))
      .attr("cy", d => y(d.city_name) + y.bandwidth() / 2)
      .attr("r", 5)
      .attr("fill", "#dec27a");

    const eDot = g.selectAll(".dot-e")
      .data(rows)
      .join("circle")
      .attr("cx", d => x(d.Extreme))
      .attr("cy", d => y(d.city_name) + y.bandwidth() / 2)
      .attr("r", 6)
      .attr("fill", "#e45c32");

    // === Legend ===
    const legend = svg.append("g")
      .attr("transform", `translate(${width -45}, ${margin.top - 20})`);

    // === X-axis labels ===
    svg.append("text")
      .attr("x", margin.left + (width - margin.left - margin.right) / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .text("Mean SUHI (°C) under Normal and Heatwave Conditions")
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("font-size", "13px")
      .style("fill", "#444");


    legend.append("rect")
      .attr("x", -60)
      .attr("y", -10)
      .attr("width", 90)
      .attr("height", 40)
      .attr("rx", 8)
      .attr("fill", "rgba(255,255,255,0.85)")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1);

    const legendItems = [
      { name: "Heatwave", color: "#e45c32", cy: 0 },
      { name: "Normal", color: "#dec27a", cy: 20 }
    ];
    legendItems.forEach(s => {
      legend.append("circle")
        .attr("cx", -50)
        .attr("cy", s.cy)
        .attr("r", 5)
        .attr("fill", s.color);
      legend.append("text")
        .attr("x", -40)
        .attr("y", s.cy + 4)
        .text(s.name)
        .style("font-family", "Poppins, Arial, sans-serif")
        .style("font-size", "12px")
        .style("fill", "#333");
    });


    // === Highlighting logic (simultaneous highlighting of lines and dots) ===
    function highlight(cityName) {
    // Reset all states 
    lines.attr("stroke", "#e9cfa6").attr("stroke-width", 6).attr("opacity", 0.6)
        .attr("filter", "none");
    nDot
      .attr("fill", "#dec27a")
      .attr("r", 5)
      .attr("stroke", "none");
    eDot
      .attr("fill", "#e45c32")
      .attr("r", 6)
      .attr("stroke", "none");
    g.selectAll(".tick text").style("font-weight", "400");

    // --- Highlight target city ---
    // 1. Thicken lines + black border + shadow
    lines.filter(d => d.city_name === cityName)
      .attr("stroke", "#111")
      .attr("stroke-width", 9)
      .attr("opacity", 1)
      .attr("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.5))");

    // 2. Simultaneous highlighting of both ends: darken the fill color + black stroke
    nDot.filter(d => d.city_name === cityName)
      .attr("fill", "#b89830")
      .attr("r", 6)
      .attr("stroke", "#111")
      .attr("stroke-width", 1.6);

    eDot.filter(d => d.city_name === cityName)
      .attr("fill", "#b33316")
      .attr("r", 7)
      .attr("stroke", "#111")
      .attr("stroke-width", 1.6);

    // 3. Bold text on the Y-axis
    g.selectAll(".tick text")
      .filter(t => t === cityName)
      .style("font-weight", "700");
  }

    // === Tooltip ===
    let tooltipD = d3.select(".tooltip-dumbbell");
    if (tooltipD.empty()) {
      tooltipD = d3.select("body").append("div")
        .attr("class", "tooltip-dumbbell")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.9)")
        .style("padding", "8px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("font-family", "Poppins, Arial, sans-serif")
        .style("pointer-events", "none")
        .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)")
        .style("opacity", 0);
    }

    // === Mouse interaction: Point & line respond together ===
    const cityGroups = g.selectAll(".city-group")
      .data(rows)
      .join("g")
      .attr("class", "city-group")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        highlight(d.city_name);

        const diff = (d.Extreme - d.Normal).toFixed(2);
        tooltipD.transition().duration(120).style("opacity", 1);
        tooltipD.html(`
          <b>${d.city_name}</b><br>
          Normal: ${d.Normal.toFixed(2)}°C<br>
          Heatwave: ${d.Extreme.toFixed(2)}°C<br>
          <b>ΔSUHI:</b> ${diff}°C
        `)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 40) + "px");
      })
      .on("mousemove", (event) => {
        tooltipD
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 40) + "px");
      })
      .on("mouseout", () => {
        tooltipD.transition().duration(150).style("opacity", 0);
      })
      .on("click", (event, d) => {
        const city = d.city_name;
        console.log("User selected:", city);
        const select = document.querySelector("#city-select");
        if (select) {
          select.value = city;
          select.dispatchEvent(new Event("change"));
        }
      });

    // === Draw lines and dots within each group ===
    cityGroups.each(function(d) {
      const gCity = d3.select(this);
      const cy = y(d.city_name) + y.bandwidth() / 2;
      gCity.append("line")
        .attr("x1", x(d.Normal))
        .attr("x2", x(d.Extreme))
        .attr("y1", cy)
        .attr("y2", cy)
        .attr("stroke", "#e9cfa6")
        .attr("stroke-width", 6)
        .attr("stroke-linecap", "round")
        .attr("opacity", 0.9);
      gCity.append("circle")
        .attr("cx", x(d.Normal))
        .attr("cy", cy)
        .attr("r", 5)
        .attr("fill", "#dec27a");
      gCity.append("circle")
        .attr("cx", x(d.Extreme))
        .attr("cy", cy)
        .attr("r", 6)
        .attr("fill", "#e45c32");
    });

    
    // === Initialization & City Switching Events ===
    const applyHighlight = () => {
      const city = document.querySelector("#city-select")?.value || currentCity || "Greater Sydney";
      cityLabel.text(city);
      highlight(city);
    };

    applyHighlight();
    document.querySelector("#city-select")?.addEventListener("change", applyHighlight);
  });
})();




