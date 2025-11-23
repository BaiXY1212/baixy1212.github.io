// Part 2 — Anatomy of a Hot City
// Box Plot (2a) + Sankey (2b)

console.log("part2.js loaded");

(function initPart2() {

// Send the landuse parameter as an array
function highlightLanduse(luOrList) {
  const list = Array.isArray(luOrList) ? luOrList : [luOrList];
  window.dispatchEvent(new CustomEvent("landuseHover", { detail: list }));
}
function resetHighlight() {
  window.dispatchEvent(new CustomEvent("landuseOut"));
}

  // Paths
  const BOX_JSON   = "data/boxplot_all.json";
  const SANKEY_JSON = "data/sankey_all.json";

  // Shared sizes
  const width = 520,
        height = 460;

  // Palette
  const landuseOrder = ["Water","Parkland","Residential","Industrial","Commercial"];
  const landuseColor = d3.scaleOrdinal()
    .domain(landuseOrder)
    .range(["#90c8ff", "#6dc96d", "#f0a955", "#cf4a3b", "#8a7bd1"]);

  const heatZoneColor = d3.scaleOrdinal()
    .domain(["High Heat Zone", "Medium Heat Zone", "Low Heat Zone", "Urban Heat Island (Total)"])
    .range(["#6b2e9b", "#f1895a", "#f5d289", "#cfd6df"]);

  // State
  let currentCity = document.querySelector("#city-select")?.value || "Greater Sydney";
  let boxJson = null;
  let sankeyAll = null;

  // BOX PLOT
  const svgBox = d3.select("#vis_2a").append("svg")
    .attr("width", width)
    .attr("height", height);

  function drawBox(city) {
    if (!boxJson) return;
    const item = boxJson.cities.find(d => d.city_name === city || d.city_key === city);
    if (!item) {
      console.warn("⚠️ No box data for:", city);
      svgBox.selectAll("*").remove();
      return;
    }

    const stats = item.boxplot.filter(d => landuseOrder.includes(d.landuse));
    svgBox.selectAll("*").remove();

    // Titles
    svgBox.append("text")
      .attr("x", width / 2)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .text("Within-City Differences of LST by Land-Use")
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("font-size", "14px")
      .style("fill", "#555");

    svgBox.append("text")
      .attr("x", width / 2)
      .attr("y", 60)
      .attr("text-anchor", "middle")
      .text(item.city_name)
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("font-size", "18px")
      .style("font-weight", "600")
      .style("fill", "#111");

    const margin = { top: 80, right: 20, bottom: 60, left: 65 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svgBox.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(landuseOrder).range([0, innerW]).paddingInner(0.35);
    const allVals = stats.flatMap(d => [d.min, d.q1, d.median, d.q3, d.max]).filter(Number.isFinite);
    const yDomain = allVals.length ? d3.extent(allVals) : [10, 45];
    const y = d3.scaleLinear().domain([Math.min(5, yDomain[0]), Math.max(45, yDomain[1])]).nice()
      .range([innerH, 0]);

    // Axes
    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y).ticks(6));

    // Labels
    svgBox.append("text")
      .attr("x", margin.left + innerW / 2)
      .attr("y", height - 8)
      .attr("text-anchor", "middle")
      .text("Land-use type")
      .style("font-size", "13px").style("fill", "#444");
    svgBox.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .text("Land Surface Temperature (°C)")
      .style("font-size", "13px").style("fill", "#444");

    // Tooltip
    let tip = d3.select(".tooltip-boxplot");
    if (tip.empty()) {
      tip = d3.select("body").append("div")
        .attr("class", "tooltip-boxplot")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.9)")
        .style("padding", "8px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)")
        .style("opacity", 0);
    }
    // Boxes
    const boxW = x.bandwidth();
    const gBox = g.selectAll(".box")
      .data(stats)
      .join("g")
      .attr("class", "box")
      .attr("transform", d => `translate(${x(d.landuse)},0)`)
      .on("mouseover", function (event, d) {
      highlightLanduse(d.landuse);

      // 1.Prompt box display
      tip.transition().duration(120).style("opacity", 1);
      tip.html(`
        <b>${city}</b> — <i>${d.landuse}</i><br>
        <span style="color:#777">n = ${d.n ?? "—"}</span><br>
        <b>Min:</b> ${d.min?.toFixed(1) ?? "—"}°C<br>
        <b>Q1:</b> ${d.q1?.toFixed(1) ?? "—"}°C<br>
        <b>Median:</b> ${d.median?.toFixed(1) ?? "—"}°C<br>
        <b>Q3:</b> ${d.q3?.toFixed(1) ?? "—"}°C<br>
        <b>Max:</b> ${d.max?.toFixed(1) ?? "—"}°C
      `)
      .style("left", (event.pageX + 12) + "px")
      .style("top", (event.pageY - 60) + "px");

      // 2. Highlight the current box and the center line.
      d3.select(this).select("rect.main")
        .transition().duration(120)
        .attr("stroke", "#000")
        .attr("stroke-width", 2.2)
        .attr("opacity", 1);

      d3.select(this).select("line.median-line")
        .transition().duration(120)
        .attr("stroke", "#000")
        .attr("stroke-width", 3);

      // 3. Reduce the transparency of other enclosures.
      g.selectAll(".box").filter(b => b.landuse !== d.landuse)
        .transition().duration(120)
        .style("opacity", 0.4);
    })
    .on("mousemove", (event) => {
      tip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 60) + "px");
    })
    .on("mouseout", function (event, d) {
      resetHighlight();
      // Restore to original state
      tip.transition().duration(150).style("opacity", 0);
      d3.select(this).select("rect.main")
        .transition().duration(200)
        .attr("stroke", "#555")
        .attr("stroke-width", 1.2)
        .attr("opacity", 0.9);
      d3.select(this).select("line.median-line")
        .transition().duration(200)
        .attr("stroke", "#222")
        .attr("stroke-width", 2);
      g.selectAll(".box")
        .transition().duration(200)
        .style("opacity", 1);
    });

    // Whiskers + Box + Median
    gBox.append("line").attr("x1", boxW/2).attr("x2", boxW/2).attr("y1", d=>y(d.min)).attr("y2", d=>y(d.q1)).attr("stroke","#777");
    gBox.append("line").attr("x1", boxW/2).attr("x2", boxW/2).attr("y1", d=>y(d.q3)).attr("y2", d=>y(d.max)).attr("stroke","#777");
    gBox.append("line").attr("x1", boxW*0.16).attr("x2", boxW*0.84).attr("y1", d=>y(d.min)).attr("y2", d=>y(d.min)).attr("stroke","#777");
    gBox.append("line").attr("x1", boxW*0.16).attr("x2", boxW*0.84).attr("y1", d=>y(d.max)).attr("y2", d=>y(d.max)).attr("stroke","#777");

    gBox.append("rect")
      .attr("x", boxW*0.16)
      .attr("width", boxW*0.68)
      .attr("y", d => Number.isFinite(d.q3)? y(d.q3):y.range()[0])
      .attr("height", d => (Number.isFinite(d.q1)&&Number.isFinite(d.q3)) ? Math.max(1,y(d.q1)-y(d.q3)):0)
      .attr("fill", d=>landuseColor(d.landuse))
      .attr("opacity", 0.9)
      .attr("stroke","#555");
    gBox.append("line")
    .attr("class", "median-line")
    .attr("x1", boxW * 0.16).attr("x2", boxW * 0.84)
    .attr("y1", d => y(d.median)).attr("y2", d => y(d.median))
    .attr("stroke", "#222").attr("stroke-width", 2);

    // Legend (Land-use categories) 
    const legend = svgBox.append("g")
      .attr("transform", `translate(${width - 80}, ${25})`);

    legend.append("rect")
      .attr("x", - 6).attr("y", -8)
      .attr("width", 85).attr("height", 90)
      .attr("rx", 6)
      .attr("fill", "rgba(255,255,255,0.85)")
      .attr("stroke", "#ddd");

    landuseOrder.forEach((lu, i) => {
      legend.append("rect")
        .attr("x", 0)
        .attr("y", i * 16)
        .attr("width", 12)
        .attr("height", 10)
        .attr("fill", landuseColor(lu))
        .attr("stroke", "#555");

      legend.append("text")
        .attr("x", 16)
        .attr("y", i * 16 + 9)
        .text(lu)
        .style("font-size", "9px")
        .style("fill", "#333")
        .style("font-family", "Poppins, Arial, sans-serif");
    });

  // Remove any previous listeners before adding new ones
  window.removeEventListener("landuseHover", window._boxHoverHandler);
  window.removeEventListener("landuseOut", window._boxOutHandler);

  // Define new scoped handlers with access to current g
  window._boxHoverHandler = e => {
    const target = e.detail;
    g.selectAll(".box").each(function(d) {
      const active = d.landuse === target;
      d3.select(this)
        .transition().duration(150)
        .style("opacity", active ? 1 : 0.3)
        .select("rect")
        .attr("stroke", active ? "#000" : "#555")
        .attr("stroke-width", active ? 2 : 1.2);
    });
  };

  window._boxOutHandler = () => {
    g.selectAll(".box").transition().duration(150)
      .style("opacity", 1)
      .select("rect")
      .attr("stroke", "#555")
      .attr("stroke-width", 1.2);
  };

  // Register updated handlers for the current draw
  window.addEventListener("landuseHover", e => {
    const set = new Set(e.detail || []); // detail is now an array
    g.selectAll(".box").each(function(d){
      const active = set.has(d.landuse);
      d3.select(this)
        .transition().duration(150)
        .style("opacity", active ? 1 : 0.3)
        .select("rect")
        .attr("stroke", active ? "#000" : "#555")
        .attr("stroke-width", active ? 2 : 1.2);
    });
  });

  window.addEventListener("landuseOut", () => {
    g.selectAll(".box").transition().duration(150)
      .style("opacity", 1)
      .select("rect")
      .attr("stroke", "#555")
      .attr("stroke-width", 1.2);
  });

    }

    // ---------- SANKEY ----------
    const svgSankey = d3.select("#vis_2b").append("svg")
      .attr("width", width)
      .attr("height", height);

    function drawSankey(city) {
      if (!sankeyAll) return;

    // constant definition
    const UHI_NAME = "Urban Heat Island (Total)";

    const item = sankeyAll.cities.find(d => d.city_name === city || d.city_key === city);
    if (!item) {
      console.warn("No sankey data for:", city);
      svgSankey.selectAll("*").remove();
      return;
    }

    svgSankey.selectAll("*").remove();

    // ---- Title ----
    svgSankey.append("text")
      .attr("x", width / 2)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .text("How Land-use Types Contribute to the City's UHI")
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("font-size", "14px")
      .style("fill", "#555");

    svgSankey.append("text")
      .attr("x", width / 2)
      .attr("y", 60)
      .attr("text-anchor", "middle")
      .text(item.city_name)
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("font-size", "18px")
      .style("font-weight", "600")
      .style("fill", "#111");

    const margin = { top: 80, right: 20, bottom: 10, left: 20 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svgSankey.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Copy data (d3-sankey will modify objects).
    const nodes = item.nodes.map(d => ({ ...d }));
    const links = item.links.map(d => ({ ...d }));

    const sankey = d3.sankey()
      .nodeWidth(16)
      .nodePadding(14)
      .extent([[0, 0], [innerW, innerH]]);
      // .nodeAlign(d3.sankeyJustify);

    const { nodes: n, links: l } = sankey({ nodes, links });

    // Zoom in on the differences in the lines on the right (Heat Zone → UHI), while keeping them centered on UHI

    // The average width of the left half is used as the "base thickness"
    const leftWidths = l.filter(d => d.target.name !== "Urban Heat Island (Total)").map(d => d.width);
    const base = d3.mean(leftWidths) || 6;

    // Three lines on the right
    const rightLinks = l.filter(d => d.target.name === "Urban Heat Island (Total)");
    if (rightLinks.length) {
      // 1. Calculate the difference interval
      const wMin = d3.min(rightLinks, d => d.width);
      const wMax = d3.max(rightLinks, d => d.width);

      // 2. Magnify differences (adjustable parameters)
      const amplify = 0.45;   // Amplification level (2.0–4.0)
      const floorK = 0.8;     // Minimum thickness ratio (0.5–0.8)
      rightLinks.forEach(d => {
        const norm = (d.width - wMin) / (wMax - wMin + 1e-6);
        const boosted = base * floorK + Math.pow(norm, 2) * base * amplify;
        d.width = boosted;
      });

      // 3. At the UHI node, keep the "total thickness" of the three lines centered and aligned with the horizontal bar.
    const uhiNodeLocal = n.find(x => x.name === UHI_NAME);
    if (uhiNodeLocal) {
      const uhiCenterY = (uhiNodeLocal.y0 + uhiNodeLocal.y1) / 2;
      const totalThick = d3.sum(rightLinks, d => d.width);
      let cursor = uhiCenterY - totalThick / 2;

      rightLinks.forEach(link => {
        link.y0 = (link.source.y0 + link.source.y1) / 2; // Source node center
        link.y1 = cursor + link.width / 2;
        cursor += link.width;
      });
    }

  }

  // Adjust the height of the intermediate layer nodes (Heat Zone) to match the enlarged line width
  const heatZones = n.filter(d =>
    ["High Heat Zone", "Medium Heat Zone", "Low Heat Zone"].includes(d.name)
  );

  heatZones.forEach(zone => {
    // Find all streamlines corresponding to this heat zone.
    const incoming = l.filter(link => link.target === zone);
    const outgoing = l.filter(link => link.source === zone);

    // Obtain the new height (a portion of the sum of the maximum streamline widths).
    const totalWidth = d3.sum(incoming.concat(outgoing), d => d.width);
    const expandFactor = 0.7; // Node height scaling ratio

    const newHeight = totalWidth * expandFactor;
    const centerY = (zone.y0 + zone.y1) / 2;

    // Update node upper and lower boundaries
    zone.y0 = centerY - newHeight / 2;
    zone.y1 = centerY + newHeight / 2;
  });

    // The right side of "Urban Heat Island" is elongated.
    const maxX = d3.max(n, d => d.x1);
    const uhiNodes = n.filter(d => d.name.includes("Urban Heat Island"));
    uhiNodes.forEach(d => {
      d.x0 = maxX - 20; 
      d.x1 = maxX; 

    // Adjust height: center remains the same, but height is doubled.
    const h = d.y1 - d.y0;
    const expandFactor = 13;
    const centerY = (d.y0 + d.y1) / 2;
    const newH = h * expandFactor;
    d.y0 = centerY - newH / 2;
    d.y1 = centerY + newH / 2;

    // Ensure it does not exceed the canvas.
    if (d.y0 < 0) d.y0 = 0;
    if (d.y1 > innerH) d.y1 = innerH;
  });

  // Define node colors: consistent with Figure A.
  function nodeFill(d) {
    const name = d.name;
    if (landuseOrder.includes(name)) return landuseColor(name);
    if (heatZoneColor.domain().includes(name)) return heatZoneColor(name);
    return "#cfd6df";
  }

  // Create gradient definitions (one for each link).
  const defs = svgSankey.append("defs");

  l.forEach((d, i) => {
    const gradId = `grad-${city.replace(/\s/g, "")}-${i}`;
    const grad = defs.append("linearGradient")
      .attr("id", gradId)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", d.source.x1)
      .attr("x2", d.target.x0);

    grad.append("stop").attr("offset", "0%").attr("stop-color", nodeFill(d.source));
    grad.append("stop").attr("offset", "100%").attr("stop-color", nodeFill(d.target));
    d.gradId = gradId;
  });

// Before drawing, manually adjust the y-position of the links on the right to center them.
const uhiNode = n.find(d => d.name === "Urban Heat Island (Total)");
if (uhiNode) {
  const uhiCenterY = (uhiNode.y0 + uhiNode.y1) / 2;
  const incoming = l.filter(d => d.target.name === "Urban Heat Island (Total)");

  const gap = 16; // Control the vertical spacing of the three right-side lines
  const startY = uhiCenterY - ((incoming.length - 1) * gap) / 2;

  incoming.forEach((link, i) => {
    const srcCenter = (link.source.y0 + link.source.y1) / 2;
    // Keep the source point in the middle, but fix the endpoint in an equidistant layout (centered).
    link.y0 = srcCenter;
    link.y1 = startY + i * gap;
  });
}

  // Draw connecting lines
  const link = g.append("g")
    .selectAll("path")
    .data(l)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("fill", "none")
    .attr("stroke", d => `url(#${d.gradId})`)
    .attr("stroke-opacity", 0.7)
    .attr("stroke-width", d => d.width)
    .attr("class", "sankey-link");


  // Node
  const node = g.append("g")
    .selectAll("g")
    .data(n)
    .join("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x0},${d.y0})`)
    .style("cursor", "pointer");

  node.append("rect")
    .attr("height", d => Math.max(1, d.y1 - d.y0))
    .attr("width", d => Math.max(1, d.x1 - d.x0))
    .attr("fill", nodeFill)
    .attr("stroke", "#333")
    .attr("rx", 4)
    .attr("opacity", 0.95)
    .attr("class", "sankey-node");

    // Remove the native UHI node rectangle to avoid overlapping with the custom flat horizontal bar.
    node.selectAll("rect")
      .filter(d => d.name === UHI_NAME)
      .remove();

    node.on("mouseover", function (event, d) {
      if (landuseOrder.includes(d.name)) highlightLanduse([d.name]);
    })
    .on("mouseout", function () { resetHighlight(); });



// Refined Final — Balanced UHI Terminal + Legend reposition
const uhiNode2 = n.find(d => d.name === UHI_NAME);
if (uhiNode2) {
  // Dynamic computing hub
  const incomingLinks = l.filter(d => d.target.name === UHI_NAME);
  const totalInflow = d3.sum(incomingLinks, d => d.width);
  const weightedCenter = d3.sum(incomingLinks, d => ((d.source.y0 + d.source.y1) / 2) * d.width) / (totalInflow || 1);
  const centerY = weightedCenter || (uhiNode2.y0 + uhiNode2.y1) / 2;

  // =Adaptive rectangle ratio
  const rectHeight = totalInflow * 1.8;
  const rectWidth = 80;
  const safeX = Math.min(innerW - rectWidth - 10, uhiNode2.x1 - rectWidth + 12);

  const group = g.append("g")
    .attr("class", "uhi-terminal")
    .attr("transform", `translate(${safeX},0)`);

  // Soft gradient background
  const grad = defs.append("linearGradient")
    .attr("id", "grad-uhi-final-smooth")
    .attr("x1", "0%").attr("x2", "100%")
    .attr("y1", "0%").attr("y2", "100%");
  grad.append("stop").attr("offset", "0%").attr("stop-color", "#e6ebf0").attr("stop-opacity", 1);
  grad.append("stop").attr("offset", "100%").attr("stop-color", "#cfd5dc").attr("stop-opacity", 0.9);

  // Main rectangle
  group.append("rect")
    .attr("x", 0)
    .attr("y", centerY - rectHeight / 2)
    .attr("width", rectWidth)
    .attr("height", rectHeight)
    .attr("rx", 14)
    .attr("fill", "url(#grad-uhi-final-smooth)")
    .attr("stroke", "#b8bcc2")
    .attr("stroke-width", 0.6)
 
  // The left edge has a slight gradient (no longer a solid shadow bar).
  const fadeGrad = defs.append("linearGradient")
    .attr("id", "fade-left")
    .attr("x1", "0%").attr("x2", "100%");
  fadeGrad.append("stop").attr("offset", "0%").attr("stop-color", "#fff").attr("stop-opacity", 0.6);
  fadeGrad.append("stop").attr("offset", "100%").attr("stop-color", "#fff").attr("stop-opacity", 0);

  group.append("rect")
    .attr("x", 0)
    .attr("y", centerY - rectHeight / 2)
    .attr("width", 8)
    .attr("height", rectHeight)
    .attr("fill", "url(#fade-left)")
    .attr("opacity", 0.8);

  // Two lines of text
  const tg = group.append("g")
    .attr("transform", `translate(${rectWidth / 2}, ${centerY})`);
  ["Urban Heat", "Island (Total)"].forEach((line, i) => {
    tg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", `${(i - 0.5) * 12}px`)
      .text(line)
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("font-size", "11px")
      .style("font-weight", "500")
      .style("fill", "#222");
  });
}
   
  node.filter(d => d.name !== UHI_NAME)
    .append("text")
    .attr("x", d => d.x0 < innerW / 2 ? (d.x1 - d.x0) + 6 : -6)
    .attr("y", d => (d.y1 - d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < innerW / 2 ? "start" : "end")
    .text(d => d.name)
    .style("font-family", "Poppins, Arial, sans-serif")
    .style("font-size", "12px");

  // Tooltip
  let tip = d3.select(".tooltip-sankey");
  if (tip.empty()) {
    tip = d3.select("body").append("div")
      .attr("class", "tooltip-sankey")
      .style("position", "absolute")
      .style("background", "rgba(255,255,255,0.95)")
      .style("padding", "8px 10px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("pointer-events", "none")
      .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)")
      .style("opacity", 0);
  }

  link.on("mouseover", function (event, d) {
    // Calculate the list of land-use properties that need to be highlighted.
    let luList = [];
    if (d.target && d.target.name === UHI_NAME &&
        ["High Heat Zone","Medium Heat Zone","Low Heat Zone"].includes(d.source.name)) {
      // Hover over HeatZone → UHI
      luList = l
        .filter(x => x.target && x.target.name === d.source.name)            // landuse → current heat zone
        .filter(x => landuseOrder.includes(x.source.name))
        .map(x => x.source.name);
    } else if (landuseOrder.includes(d.source.name)) {
      // Hover over the left-hand line connecting landuse → heat zone
      luList = [d.source.name];
    }

    if (luList.length) highlightLanduse(luList);

    // Highlighting of nodes and connections within the Sankey internal graph
    const set = new Set(luList);

    // Highlight the land-use node + current heat zone + UHI node
    node.selectAll("rect").transition().duration(120)
      .attr("opacity", nd => {
        if (set.size === 0) return 0.95;
        return (set.has(nd.name) || nd.name === d.source.name || nd.name === UHI_NAME) ? 1 : 0.25;
      })
      .attr("stroke", nd => (set.has(nd.name) || nd.name === d.source.name || nd.name === UHI_NAME) ? "#000" : "#333")
      .attr("stroke-width", nd => (set.has(nd.name) || nd.name === d.source.name || nd.name === UHI_NAME) ? 2.2 : 1);

    // Highlight two types of connections: ① The current HeatZone → UHI; ② These land-use connections → This HeatZone
    link.transition().duration(120)
      .attr("stroke-opacity", lk => {
        const isCurr = lk === d;
        const isUp   = set.has(lk.source.name) && lk.target && lk.target.name === d.source.name;
        return (isCurr || isUp) ? 0.9 : 0.12;
      });

    // 3. Calculate the percentage of contribution.
    let pct = null;
    if (d.share || d.percentage) {
      pct = (d.share ?? d.percentage).toFixed(1);
    } else if (d.target && d.target.name === UHI_NAME) {
      // If the target is UHI, then calculate the proportion of the current connection in all →UHI flows.
      const totalUHI = d3.sum(
        l.filter(x => x.target.name === UHI_NAME),
        x => x.value
      );
      pct = totalUHI > 0 ? (d.value / totalUHI * 100).toFixed(1) : null;
    }

    // Tooltip
    const pctLine = pct ? `<br><span style="color:#666">Contribution: ${pct}%</span>` : "";

    d3.select(this).attr("stroke-opacity", 0.9);
    tip.transition().duration(120).style("opacity", 1);
    tip.html(`
      <b>${n[d.source.index].name}</b> → <b>${n[d.target.index].name}</b><br>
      <span style="color:#666">Value: ${d.value.toFixed(2)} °C</span>
      ${pctLine}
    `)
    .style("left", (event.pageX + 12) + "px")
    .style("top", (event.pageY - 40) + "px");
})
.on("mousemove", (event) => {
    tip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 40) + "px");
})
.on("mouseout", function (event, d) {
    resetHighlight(); // Simultaneously restore Box
    d3.select(this).attr("stroke-opacity", 0.55);
    tip.transition().duration(150).style("opacity", 0);

    // Restore Sankey's default style
    node.selectAll("rect").transition().duration(150)
      .attr("opacity", 0.95)
      .attr("stroke", "#333")
      .attr("stroke-width", 1);
    link.transition().duration(150)
      .attr("stroke-opacity", 0.7);
});


//Cross-highlight listener (from Box hover)
window.addEventListener("landuseHover", e => {
  const target = e.detail;
  
  // Highlight nodes
  node.selectAll("rect")
    .transition().duration(150)
    .attr("stroke", d => d.name === target ? "#000" : "#333")
    .attr("stroke-width", d => d.name === target ? 2.2 : 1)
    .attr("opacity", d => d.name === target ? 1 : 0.4);
  
  // Highlight related links
  link.transition().duration(150)
    .attr("stroke-opacity", d => d.source.name === target ? 0.9 : 0.15);
});

window.addEventListener("landuseOut", () => {
  node.selectAll("rect")
    .transition().duration(150)
    .attr("stroke", "#333")
    .attr("stroke-width", 1)
    .attr("opacity", 0.95);
  
  link.transition().duration(150)
    .attr("stroke-opacity", 0.7);
});


// Box → Sankey Reverse Linkage
window.removeEventListener("landuseHover", window._sankeyHoverHandler);
window.removeEventListener("landuseOut", window._sankeyOutHandler);

window._sankeyHoverHandler = e => {
  const set = new Set(e.detail || []); // e.detail might be an array

  // 1. Highlight the land-use node
  node.selectAll("rect")
    .transition().duration(150)
    .attr("stroke", d => set.has(d.name) ? "#000" : "#333")
    .attr("stroke-width", d => set.has(d.name) ? 2.2 : 1)
    .attr("opacity", d => set.has(d.name) ? 1 : 0.3);

  // 2. Highlight the corresponding land-use → heat zone connection.
  link.transition().duration(150)
    .attr("stroke-opacity", d => set.has(d.source.name) ? 0.9 : 0.12);
};

window._sankeyOutHandler = () => {
  node.selectAll("rect")
    .transition().duration(150)
    .attr("stroke", "#333")
    .attr("stroke-width", 1)
    .attr("opacity", 0.95);

  link.transition().duration(150)
    .attr("stroke-opacity", 0.7);
};

window.addEventListener("landuseHover", window._sankeyHoverHandler);
window.addEventListener("landuseOut", window._sankeyOutHandler);
}

  // Load both
  Promise.all([
    d3.json(BOX_JSON),
    d3.json(SANKEY_JSON)
  ]).then(([boxJ, sankeyJ]) => {
    boxJson = boxJ;
    sankeyAll = sankeyJ;
    drawBox(currentCity);
    drawSankey(currentCity);
    document.querySelector("#city-select")?.addEventListener("change", e => {
      currentCity = e.target.value;
      drawBox(currentCity);
      drawSankey(currentCity);
    });
  }).catch(err => console.error("Failed to load Part2 data:", err));
})();