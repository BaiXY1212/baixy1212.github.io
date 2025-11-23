// Part 3 — Cooling Power of Green

console.log("part3.js loaded");

window.addEventListener("DOMContentLoaded", async () => {
  // Basic parameters
  const width = 520,
        height = 460,
        margin = { top: 70, right: 25, bottom: 55, left: 65 };

  const colorNDVI = "#47a447",
        colorLST = "#e85d04";

  // Load data
  let data;
  try {
    data = await d3.json("data/ndvi_lst_city_clean_augmented.json");
    console.log("Loaded data:", data?.length, data?.[0]);
  } catch (err) {
    console.error("Failed to load JSON:", err);
    return;
  }

  // Dropdown menu control
  const citySelect = d3.select("#city-select");
  let currentCity = citySelect.property("value");

  // Create two SVG canvases
  const svgA = d3.select("#vis_3a").append("svg")
    .attr("width", width)
    .attr("height", height);

  const svgB = d3.select("#vis_3b").append("svg")
    .attr("width", width)
    .attr("height", height);

  // Update function (rendering each city)
  function update(city) {
    console.log("🔄 Rendering city:", city);

    // Clear the old timer before each city switch.
    if (window.activeTimer) {
      window.activeTimer.stop();
      window.activeTimer = null;
      d3.select("#play-btn").text("▶️ Play"); // Reset play button
    }

    // Reset slider and label
    d3.select("#year-slider").property("value", 0);
    d3.select("#year-label").text("");

    // Filtering data
    const cityData = data.filter(d => d.city_name === city);
    if (cityData.length === 0) {
      console.warn("⚠️ No data for city:", city);
      return;
    }

    // Processing data types
    cityData.forEach(d => {
      d.date = new Date(d.date);
      d.ndvi = +d.ndvi;
      d.lst_c = +d.lst_c;
    });

    // A: NDVI vs LST 
    svgA.selectAll("*").remove();
    const xA = d3.scaleLinear()
      .domain([0.3, 0.8])  
      .range([margin.left, width - margin.right]);
    const yA = d3.scaleLinear()
      .domain([5, 45])   
      .range([height - margin.bottom, margin.top]);

    // coordinate axes
    svgA.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xA).ticks(6).tickFormat(d3.format(".2f")));
    svgA.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yA).ticks(6));

    // Scattered data (color mapping: differentiated by season)
    const seasonColor = d3.scaleOrdinal()
      .domain(["Spring", "Summer", "Autumn", "Winter"])
      .range(["#f6a5c0", "#9ad77d", "#ffd27f", "#91c9f7"]);

    svgA.append("g")
      .selectAll("circle")
      .data(cityData)
      .join("circle")
      .attr("cx", d => xA(d.ndvi))
      .attr("cy", d => yA(d.lst_c))
      .attr("r", 4)
      .attr("fill", d => seasonColor(d.season))
      .attr("opacity", 0.8);

    // Comprehensive illustration (season + model)
    const legendAll = svgA.append("g")
      .attr("transform", `translate(${width - 90}, ${margin.top + 5})`);

    // Background frame
    legendAll.append("rect")
      .attr("x", -10)
      .attr("y", -10)
      .attr("width", 80)
      .attr("height", 100)
      .attr("rx", 8)
      .attr("fill", "rgba(255, 255, 255, 0.85)")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1);

    // Four Seasons Colors
    const seasons = [
      { name: "Spring", color: "#f6a5c0" },
      { name: "Summer", color: "#9ad77d" },
      { name: "Autumn", color: "#ffd27f" },
      { name: "Winter", color: "#91c9f7" }
    ];

    seasons.forEach((s, i) => {
      legendAll.append("circle")
        .attr("cx", 0)
        .attr("cy", i * 18)
        .attr("r", 5)
        .attr("fill", s.color);
      legendAll.append("text")
        .attr("x", 12)
        .attr("y", i * 18 + 4)
        .text(s.name)
        .style("font-size", "13px")
        .style("fill", "#333");
    });

    // Separator line
    legendAll.append("line")
      .attr("x1", -5)
      .attr("x2", 66)
      .attr("y1", 66)
      .attr("y2", 66)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1)
      .attr("opacity", 0.8);

    // Model
    legendAll.append("line")
      .attr("x1", -5)
      .attr("x2", 8)
      .attr("y1", 78)
      .attr("y2", 78)
      .attr("stroke", "#222")
      .attr("stroke-width", 2.5);
    legendAll.append("text")
      .attr("x", 15)
      .attr("y", 82)
      .text("OLS (β)")
      .style("font-size", "13px")
      .style("fill", "#333");

    // Using pre-calculated regression results
    const lr = {
      slope: +cityData[0].beta,
      r2: +cityData[0].r2
    };

    // The fitted line is calculated based on the slope and the mean, and the intercept is used to calculate the line.
    const meanNDVI = +cityData[0].mean_ndvi;
    const meanLST  = +cityData[0].mean_lst;
    const intercept = meanLST - lr.slope * meanNDVI;

    // Used for drawing lines
    const xLine = d3.extent(cityData, d => d.ndvi);
    const yLine = xLine.map(x => intercept + lr.slope * x);

    // Figure caption: NDVI–LST relationship）
    svgA.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top - 35)
      .attr("text-anchor", "middle")
      .html("<tspan style='font-style:italic'>NDVI</tspan>–<tspan style='font-style:italic'>LST</tspan> relationship across seasons (2014–2024)")
      .style("font-size", "14px")
      .style("fill", "#555")
      .style("font-family", "Poppins, Arial, sans-serif")
      .style("font-weight", "400")
      .style("letter-spacing", "0.3px")
      .style("opacity", 0)
      .transition()
      .duration(800)
      .style("opacity", 1);

    // City title (including smooth upward-moving animation)
    const title = svgA.append("text")
      .attr("x", width / 2)
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .text(city)
        .style("font-size", "18px")
        .style("font-weight", "600")
        .style("letter-spacing", "0.4px")
        .style("fill", "#111")
        .style("font-family", "Poppins, Arial, sans-serif")
        .style("opacity", 0)
        .attr("transform", "translate(0, 10)") 
        .transition()
        .duration(700)
        .ease(d3.easeCubicOut)
        .attr("transform", "translate(0, 0)") // Slowly move upwards to the target position
        .style("opacity", 1);


    // Tooltip
    let tooltip = d3.select(".tooltipA");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltipA")
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


    // Scattered point interaction (zoom in + tooltip)
    svgA.selectAll("circle")
      .on("mouseover", function(event, d) {
        // Zoom in on the current dot
        d3.select(this)
          .transition().duration(120)
          .attr("r", 6)
          .attr("stroke", "#333")
          .attr("stroke-width", 1.2);


        // Display tooltip
        tooltip.transition().duration(150).style("opacity", 1);
        tooltip.html(`
          <b>${city}</b><br>
          Season: ${d.season}<br>
          Date: ${d3.timeFormat("%b %Y")(d.date)}<br>
          NDVI: ${d.ndvi.toFixed(3)}<br>
          LST: ${d.lst_c.toFixed(1)} °C
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 40) + "px");
      })

      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 40) + "px");
      })

      .on("mouseout", function() {
        // Restore dot size
        d3.select(this)
          .transition().duration(120)
          .attr("r", 4)  
          .attr("stroke", "none");

        // Hide tooltip
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Regression Line Interaction
    const regressionLine = svgA.append("line")
      .attr("x1", xA(xLine[0]))
      .attr("y1", yA(yLine[0]))
      .attr("x2", xA(xLine[1]))
      .attr("y2", yA(yLine[1]))
      .attr("stroke", "#222")
      .attr("stroke-width", 2.8)
      .attr("stroke-linecap", "round")
      .attr("opacity", 1)
      .style("cursor", "pointer")

      .on("mouseover", (event) => {
      tooltip.transition().duration(150).style("opacity", 1);
      tooltip.html(`
        <b>Regression insight:</b><br>
        Higher vegetation (<i>NDVI</i>) is associated with<br>
        lower surface temperature (<i>LST</i>).<br><br>
        <i>β</i> = ${(+cityData[0].beta).toFixed(2)} °C per NDVI unit<br>
        <i>R²</i> = ${(+cityData[0].r2).toFixed(2)}
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 60) + "px");
    })

      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });


    // bottom left corner label
    svgA.append("rect")
      .attr("x", margin.left + 5)
      .attr("y", height - margin.bottom - 40)
      .attr("width", 130)
      .attr("height", 26)
      .attr("fill", "rgba(255, 255, 200, 0.8)")
      .attr("rx", 4)
      .attr("stroke", "#ccc");

    svgA.append("text")
      .attr("x", margin.left + 15)
      .attr("y", height - margin.bottom - 22)
      .text(`β = ${(+cityData[0].beta).toFixed(2)}, R² = ${(+cityData[0].r2).toFixed(2)}`)
      .style("font-size", "12px")
      .style("fill", "#333")
      .style("font-family", "Poppins, Arial, sans-serif");

    // Axis Labels
    // X-axis labels
    svgA.append("text")
      .attr("x", width / 2)
      .attr("y", height - 8)
      .attr("text-anchor", "middle")
      .html('Normalized Difference Vegetation Index (<tspan font-style="italic">NDVI</tspan>; range: [–1, 1])')
      .style("font-size", "13px")
      .style("fill", "#444")
      .style("font-family", "Poppins, Arial, sans-serif");

    // Y-axis labels
    svgA.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .html('Land Surface Temperature (<tspan font-style="italic">LST</tspan>; °C)')
      .style("font-size", "13px")
      .style("fill", "#444")
      .style("font-family", "Poppins, Arial, sans-serif");

    // Elevate the title level
    svgA.selectAll("text").raise();



    // Figure B: Time Series Trend Line (NDVI & LST)
    svgB.selectAll("*").remove();

    // Clear the old year floats and vertical lines each time you switch cities.
  d3.selectAll(".year-floating, .focus-line").remove();

    // coordinate axes
    const xB = d3.scaleTime()
      .domain(d3.extent(cityData, d => d.date))
      .range([margin.left, width - margin.right]);

    const yB = d3.scaleLinear()
      .domain([
        d3.min(cityData, d => Math.min(d.ndvi_z, d.lst_z)) - 0.5,
        d3.max(cityData, d => Math.max(d.ndvi_z, d.lst_z)) + 0.5
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svgB.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xB).ticks(6).tickFormat(d3.timeFormat("%Y")))
      .style("font-size", "12px");

    svgB.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yB).ticks(6))
      .style("font-size", "12px");

    // Plotting curves
    const lineNDVI = d3.line()
      .x(d => xB(d.date))
      .y(d => yB(d.ndvi_z))
      .curve(d3.curveMonotoneX);

    const lineLST = d3.line()
      .x(d => xB(d.date))
      .y(d => yB(d.lst_z))
      .curve(d3.curveMonotoneX);

    const pathNDVI = svgB.append("path")
      .datum(cityData)
      .attr("fill", "none")
      .attr("stroke", colorNDVI)
      .attr("stroke-width", 2.5)
      .attr("d", lineNDVI);

    const pathLST = svgB.append("path")
      .datum(cityData)
      .attr("fill", "none")
      .attr("stroke", colorLST)
      .attr("stroke-width", 2.2)
      .attr("stroke-dasharray", "4,2")
      .attr("d", lineLST);

    // Initial animation
    [pathNDVI, pathLST].forEach(path => {
      const totalLength = path.node().getTotalLength();
      path.attr("stroke-dasharray", totalLength + " " + totalLength)
          .attr("stroke-dashoffset", totalLength)
          .transition().duration(1600).ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
    });

    // Highlighting during abnormal periods (only for specific cities)
    const anomalyStart = new Date("2019-09-01");
    const anomalyEnd   = new Date("2020-03-31");
    const anomalyCities = [
      "Greater Sydney",
      "Greater Brisbane",
      "Greater Adelaide",
      "Greater Darwin",
      "Australian Capital Territory"
    ];

    // Tooltip
    let anomalyTip = d3.select(".anomaly-tooltip");
    if (anomalyTip.empty()) {
      anomalyTip = d3.select("body")
        .append("div")
        .attr("class", "anomaly-tooltip")
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

    // If there are cities with anomalies, then draw a highlight band.
    if (anomalyCities.includes(city)) {
      const anomalyRect = svgB.append("rect")
        .attr("class", "anomaly-band")
        .attr("x", xB(anomalyStart))
        .attr("y", margin.top)
        .attr("width", xB(anomalyEnd) - xB(anomalyStart))
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "#f4c97f")
        .attr("opacity", 0.25)
        .lower();

      // Tooltip Interaction
      anomalyRect
        .on("mouseover", (event) => {
          anomalyTip.transition().duration(150).style("opacity", 1);
          anomalyTip
            .html(`
              <b>2019–20 Bushfire & Heatwave</b><br>
              Period of extreme heat and vegetation loss.<br>
              Significant NDVI decline and record LST anomalies observed.
            `)
            .style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY - 50) + "px");
        })
        .on("mousemove", (event) => {
          anomalyTip
            .style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY - 50) + "px");
        })
        .on("mouseout", () => {
          anomalyTip.transition().duration(250).style("opacity", 0);
        });
    }

    // Image title
    svgB.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top - 35)
      .attr("text-anchor", "middle")
      .html("The City's Breath: A Decade of Green and Heat")
      .style("font-size", "14px")
      .style("fill", "#555")
      .style("font-family", "Poppins, Arial, sans-serif");

    svgB.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top - 10)
      .attr("text-anchor", "middle")
      .text(city)
      .style("font-size", "18px")
      .style("font-weight", "600")
      .style("letter-spacing", "0.4px")
      .style("fill", "#111")
      .style("font-family", "Poppins, Arial, sans-serif");

    // Axis Labels
    svgB.append("text")
      .attr("x", width / 2)
      .attr("y", height - 8)
      .attr("text-anchor", "middle")
      .text("Year")
      .style("font-size", "13px")
      .style("fill", "#444")
      .style("font-family", "Poppins, Arial, sans-serif");

    svgB.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .html("Standardized value (<tspan font-style='italic'>z</tspan>-score)")
      .style("font-size", "13px")
      .style("fill", "#444")
      .style("font-family", "Poppins, Arial, sans-serif");

    // Legend b
    const legendB = svgB.append("g")
      .attr("transform", `translate(${width - 80}, ${margin.top})`);
    legendB.append("rect")
      .attr("x", -10).attr("y", -10).attr("width", 80).attr("height", 40)
      .attr("rx", 8).attr("fill", "rgba(255,255,255,0.85)")
      .attr("stroke", "#ddd").attr("stroke-width", 1);
    [{ name: "NDVI (z)", color: colorNDVI },
    { name: "LST (z)", color: colorLST }].forEach((s, i) => {
      legendB.append("circle").attr("cx", 0).attr("cy", i * 20).attr("r", 5).attr("fill", s.color);
      legendB.append("text").attr("x", 12).attr("y", i * 20 + 4)
        .text(s.name).style("font-size", "13px").style("fill", "#333");
    });

    // Dynamic Highlights and Year Text
    const focusNDVI = svgB.append("circle").attr("r", 6).attr("fill", colorNDVI).attr("opacity", 0.9);
    const focusLST  = svgB.append("circle").attr("r", 6).attr("fill", colorLST).attr("opacity", 0.9);
    const yearText = svgB.append("text")
      .attr("x", width / 2 + 200) 
      .attr("y", margin.top + 50)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", "#333")
      .style("opacity", 0);


    // Dynamic vertical line (time pointer)
    const focusLine = svgB.append("line")
      .attr("class", "focus-line")
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#444")
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.6);


    // Tooltip
    let tooltipB = d3.select(".tooltipB");
    if (tooltipB.empty()) {
      tooltipB = d3.select("body").append("div").attr("class", "tooltipB")
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

    // Playback control logic
    const years = cityData.map(d => d3.timeFormat("%Y")(d.date));
    let currentIndex = 0, playing = false;

    const playBtn = d3.select("#play-btn");
    const slider  = d3.select("#year-slider");
    const label   = d3.select("#year-label");

    slider.attr("max", years.length - 1).attr("value", 0);

    function updateYear(i, smooth = true) {
      const d = cityData[i];
      const xPos = xB(d.date);

      // Smoothly move focus line & circles
      const focusLine = svgB.select(".focus-line");
      focusLine.transition()
        .duration(smooth ? 300 : 0)
        .attr("x1", xPos).attr("x2", xPos);

      focusNDVI.transition().duration(smooth ? 300 : 0)
        .attr("cx", xPos).attr("cy", yB(d.ndvi_z));
      focusLST.transition().duration(smooth ? 300 : 0)
        .attr("cx", xPos).attr("cy", yB(d.lst_z));

      // Update floating year label

      let yearText = svgB.select(".year-floating");
      if (yearText.empty()) {
        yearText = svgB.append("text")
          .attr("class", "year-floating")
          .attr("text-anchor", "middle")
          .attr("font-size", 16)
          .attr("font-weight", 600)
          .attr("fill", "#444")
          .attr("opacity", 0);
      }
      yearText.interrupt()
        .transition().duration(250)
        .attr("x", xPos).attr("y", margin.top + 22)
        .attr("opacity", 1)
        .tween("text", function() {
          const self = d3.select(this);
          const newYear = d3.timeFormat("%Y")(d.date);
          if (self.text() !== newYear) self.text(newYear);
        })
        .transition().delay(800).duration(500).style("opacity", 0.35);

      label.text(d3.timeFormat("%Y")(d.date));
    }

      // Use a global ActiveTimer when binding the play button and clear it when switching cities.
      playBtn.on("click", () => {
        playing = !playing;
        playBtn.text(playing ? "⏸️ Pause" : "▶️ Play");

        if (playing) {
          window.activeTimer = d3.interval(() => {
            currentIndex = (currentIndex + 1) % years.length;
            updateYear(currentIndex);
            slider.property("value", currentIndex);
          }, 300);
        } else if (window.activeTimer) {
          window.activeTimer.stop();
          window.activeTimer = null;
        }
      });

      slider.on("input", e => {
        currentIndex = +e.target.value;
        updateYear(currentIndex);
      });

      updateYear(0);
    }

      // Initialization & City Switching Events
      update(currentCity);
      citySelect.on("change", (event) => {
        currentCity = event.target.value;
        update(currentCity);
      });
    });
