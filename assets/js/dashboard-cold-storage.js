/* =====================================================
   🔧 DEBUG FLAG
===================================================== */
const DEBUG = true;
const log = (...args) => DEBUG && console.log(...args);

/* =====================================================
   🚀 DOM READY
===================================================== */
document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     🔴 DEFAULT OFFLINE STATE (BADGE)
  ===================================================== */
  function setGatewayOffline() {
    const badge = document.querySelector(".badge");
    if (!badge) return;

    badge.className = "badge offline";
    badge.innerHTML = `<span class="badge-dot"></span> Offline`;
  }

  /* =====================================================
     🔴 RESET GATEWAY FIELDS (OFFLINE)
  ===================================================== */
  function resetGatewayFields() {
    const card = document.querySelector(".left-column .card");
    if (!card) return;

    card.querySelectorAll(".status-list li").forEach(li => {
      const labelEl = li.querySelector(".status-label");
      if (!labelEl) return;

      let valueNode = labelEl.nextSibling;
      if (!valueNode || valueNode.nodeType !== Node.TEXT_NODE) {
        valueNode = document.createTextNode(" --");
        li.appendChild(valueNode);
      } else {
        valueNode.textContent = " --";
      }
    });
  }

  /* =====================================================
     🔴 RESET LATEST RECORD TABLE (OFFLINE)
  ===================================================== */
  function resetLatestRecordTable() {
    const rows = document.querySelectorAll("table tbody tr");
    if (!rows.length) return;

    rows.forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 4) return;

      cells[1].textContent = "--";
      cells[2].textContent = "--";
      cells[3].textContent = "--";
    });
  }

  /* =====================================================
     🔴 RESET DOOR STATUS (OFFLINE)
  ===================================================== */
  function renderDoor(doorId, isOpen) {
  const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
  if (!item) return;

  const img     = item.querySelector(".door-img img");
  const stateEl = item.querySelector(".door-state");
  const timeEl  = item.querySelector(".door-time");

  if (!img || !stateEl) return;

  const newState = isOpen ? "OPEN" : "CLOSED";

  /* ✅ ALWAYS update icon + label */
  img.src = isOpen ? IMG_OPEN : IMG_CLOSED;
  img.style.opacity = "1";

  stateEl.textContent = isOpen ? "Open" : "Closed";
  stateEl.className = isOpen ? "door-state alert" : "door-state ok";

  /* 🕒 Update timestamp ONLY on change */
  if (doorLastState[doorId] !== newState) {
    doorLastState[doorId] = newState;

    if (timeEl) {
      timeEl.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
      timeEl.style.fontSize = "11px";
      timeEl.style.color = "#6b7280";
      timeEl.style.marginTop = "4px";
    }
  }
}


  /* =====================================================
     🚪 DOOR CONFIG
  ===================================================== */
  const IMG_OPEN = "assets/images/door-open.png";
  const IMG_CLOSED = "assets/images/door-closed.png";

  function renderDoor(doorId, isOpen) {
    const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
    if (!item) return;

    const img = item.querySelector(".door-img img");
    const stateEl = item.querySelector(".door-state");
    if (!img || !stateEl) return;

    img.src = isOpen ? IMG_OPEN : IMG_CLOSED;
    img.style.opacity = "1";
    stateEl.textContent = isOpen ? "Open" : "Closed";
    stateEl.className = isOpen ? "door-state alert" : "door-state ok";
  }

  /* =====================================================
     🛰️ GATEWAY & CONNECTIVITY
  ===================================================== */
  function updateGatewayInfo(payload) {
    try {
      const card = document.querySelector(".left-column .card");
      if (!card) return;

      card.querySelectorAll(".status-list li").forEach(li => {
        const labelEl = li.querySelector(".status-label");
        if (!labelEl) return;

        const label = labelEl.textContent.trim();
        let valueNode = labelEl.nextSibling;

        if (!valueNode || valueNode.nodeType !== Node.TEXT_NODE) {
          valueNode = document.createTextNode(" --");
          li.appendChild(valueNode);
        }

        if (label.startsWith("Device ID"))
          valueNode.textContent = " " + (payload.deviceId ?? "--");

        if (label.startsWith("Location"))
          valueNode.textContent = " " + (payload.location ?? "--");

        if (label.startsWith("Firmware"))
          valueNode.textContent = " " + (payload.firmwareVersion ?? "--");

        if (label.startsWith("Last update"))
          valueNode.textContent = payload.ts
            ? " " + new Date(payload.ts * 1000).toLocaleString()
            : " --";
      });

      const badge = card.querySelector(".badge");
      if (badge) {
        badge.className = "badge online";
        badge.innerHTML = `<span class="badge-dot"></span> Online – MQTT over LTE`;
      }
    } catch (err) {
      console.error("Gateway UI error:", err);
    }
  }

  /* =====================================================
     📈 MINI TELEMETRY CHARTS (THD)
  ===================================================== */
  class MiniTelemetryChart {
    constructor(canvas) {
      canvas.parentElement.style.height = "200px";
      canvas.style.maxHeight = "100%";

      this.chart = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Temperature (°C)",
              data: [],
              borderColor: "#f97316",
              borderWidth: 3,
              tension: 0.25,
              pointRadius: 3
            },
            {
              label: "Humidity (%)",
              data: [],
              borderColor: "#0f766e",
              borderWidth: 3,
              tension: 0.25,
              pointRadius: 3
            }
          ]
        },

         options: {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
             legend: {
               labels: {
                 usePointStyle: true,
                 pointStyle: "rect",
                 boxWidth: 14,
                 boxHeight: 14,
                 padding: 12,
                 generateLabels(chart) {
                   const labels =
                     Chart.defaults.plugins.legend.labels.generateLabels(chart);
                   labels.forEach(label => {
                     label.fillStyle = label.strokeStyle; // 🔑 makes it SOLID
                   });
                   return labels;
                 }
               }
             }
           }
         }
         
      });
    }

    pushPoint(temp, hum) {
      const t = new Date().toLocaleTimeString();
      const d = this.chart.data;

      d.labels.push(t);
      d.datasets[0].data.push(temp);
      d.datasets[1].data.push(hum);

      if (d.labels.length > 12) {
        d.labels.shift();
        d.datasets.forEach(ds => ds.data.shift());
      }

      this.chart.update("none");
    }
  }

  /* =====================================================
     🚨 ANOMALY SCORE CHART
  ===================================================== */
 /* =====================================================
   🚨 ANOMALY SCORE CHART
===================================================== */
class AnomalyScoreChart {
  constructor(canvas) {
    canvas.parentElement.style.height = "200px";

    this.chart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: "#f97316",
          borderWidth: 3,
          tension: 0.3,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 1, ticks: { stepSize: 0.2 } },
          x: { grid: { display: false } }
        }
      },
      plugins: [
        /* 🔹 RISK BANDS */
        {
          id: "riskBands",
          beforeDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea) return;
            const y = scales.y;

            [
              { from: 0.0, to: 0.4, c: "rgba(34,197,94,0.15)" },
              { from: 0.4, to: 0.7, c: "rgba(234,179,8,0.18)" },
              { from: 0.7, to: 1.0, c: "rgba(239,68,68,0.18)" }
            ].forEach(b => {
              ctx.fillStyle = b.c;
              ctx.fillRect(
                chartArea.left,
                y.getPixelForValue(b.to),
                chartArea.right - chartArea.left,
                y.getPixelForValue(b.from) - y.getPixelForValue(b.to)
              );
            });
          }
        },

        /* 🔹 SCORE + STATE LABELS */
        {
  id: "currentStatusBox",
  afterDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;

    const data = chart.data.datasets[0].data;
    if (!data.length) return;

    const value = data[data.length - 1];

    let state = "NORMAL";
    let color = "#16a34a";

    if (value >= 0.8) {
      state = "CRITICAL";
      color = "#dc2626";
    } else if (value >= 0.6) {
      state = "RISK";
      color = "#ea580c";
    } else if (value >= 0.4) {
      state = "WARNING";
      color = "#ca8a04";
    } else if (value >= 0.2) {
      state = "OBSERVE";
      color = "#2563eb";
    }

    const boxX = chartArea.right - 110;
    const boxY = chartArea.top + 16;
    const boxW = 96;
    const boxH = 64;

    ctx.save();

    /* Background */
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    /* Title */
    ctx.fillStyle = "#374151";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ANOMALY", boxX + boxW / 2, boxY + 16);

    /* Value */
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(value.toFixed(2), boxX + boxW / 2, boxY + 36);

    /* State */
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(state, boxX + boxW / 2, boxY + 54);

    ctx.restore();
  }
}

      ]
    });
  }

  push(score) {
    const d = this.chart.data;
    d.labels.push(new Date().toLocaleTimeString());
    d.datasets[0].data.push(score);

    if (d.labels.length > 12) {
      d.labels.shift();
      d.datasets[0].data.shift();
    }

    this.chart.update("none");
  }
}

  /* =====================================================
     📊 INIT CHARTS
  ===================================================== */
  const canvases = document.querySelectorAll(".telemetry-chart");
  const telemetryCharts = [];

  canvases.forEach((c, i) => {
    if (i < canvases.length - 1) {
      telemetryCharts.push(new MiniTelemetryChart(c));
    }
  });

  const anomalyChart = new AnomalyScoreChart(
    canvases[canvases.length - 1]
  );

  /* =====================================================
     📋 LATEST RECORD TABLE
  ===================================================== */
  function updateLatestRecordTable(payload) {
    if (!payload?.dht22) return;
    const rows = document.querySelectorAll("table tbody tr");

    payload.dht22.forEach((sensor, index) => {
      const row = rows[index];
      if (!row) return;
      const cells = row.querySelectorAll("td");
      cells[1].textContent = sensor.temperature?.toFixed(1) ?? "NA";
      cells[2].textContent = sensor.humidity?.toFixed(1) ?? "NA";
      cells[3].textContent = new Date().toLocaleTimeString();
    });
  }

  /* =====================================================
     🧾 EVENT LOG
  ===================================================== */
  function updateEventLogFullJSON(payload) {
    const logBox = document.querySelector(".log-box");
    if (!logBox) return;
    if (!payload || payload.status !== "online") {
      logBox.innerHTML = "";
      return;
    }

    const pre = document.createElement("pre");
    pre.textContent =
      `${new Date().toLocaleTimeString()} — FULL TELEMETRY\n` +
      JSON.stringify(payload, null, 2);

    logBox.prepend(pre);
    while (logBox.children.length > 20) {
      logBox.removeChild(logBox.lastChild);
    }
  }

  /* =====================================================
     🌐 SIGNALR
  ===================================================== */
  async function startSignalR() {
    const resp = await fetch(
      "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
    );
    const { url, accessToken } = await resp.json();

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .build();

    conn.on("newtelemetry", payload => {
      updateGatewayInfo(payload);
      updateLatestRecordTable(payload);
      updateEventLogFullJSON(payload);

      payload?.dht22?.forEach(sensor => {
        const chart = telemetryCharts[sensor.id];
        if (chart) chart.pushPoint(sensor.temperature, sensor.humidity);
      });

      if (payload?.abnormality?.score !== undefined) {
        anomalyChart.push(payload.abnormality.score);
      }

      payload?.doors?.forEach(d =>
        renderDoor(`D${d.id + 1}`, d.state === 1)
      );
    });

    await conn.start();
  }

  /* =====================================================
     🚀 START
  ===================================================== */
  setGatewayOffline();
  resetGatewayFields();
  resetLatestRecordTable();
  resetDoorStatus();
  startSignalR();
});
