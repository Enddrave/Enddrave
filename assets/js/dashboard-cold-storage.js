/* ================================
   ⚙️ BASE CONFIG (GLOBAL DEFAULTS)
================================ */
const CONFIG = {
  BASE_TEMP: 20.0,
  BASE_HUM: 70.0,
  SENSOR_LIMIT: 6.0,
  SENSOR_DIFF: 10.0,
  SENSOR_SCORE: 0.125,
  DIFF_SCORE: 0.30,
};


/* ====================================================
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
   /* ================================
   🔄 UPDATE CONFIG FROM SIGNALR
================================ */
function updateConfigFromPayload(payload) {
  if (!payload?.config) return;

  const cfg = payload.config;

  CONFIG.BASE_TEMP    = cfg.baseTemp    ?? CONFIG.BASE_TEMP;
  CONFIG.BASE_HUM     = cfg.baseHum     ?? CONFIG.BASE_HUM;
  CONFIG.SENSOR_LIMIT = cfg.sensorLimit ?? CONFIG.SENSOR_LIMIT;
  CONFIG.SENSOR_DIFF  = cfg.sensorDiff  ?? CONFIG.SENSOR_DIFF;
  CONFIG.SENSOR_SCORE = cfg.sensorScore ?? CONFIG.SENSOR_SCORE;
  CONFIG.DIFF_SCORE   = cfg.diffScore   ?? CONFIG.DIFF_SCORE;

  log("🔧 CONFIG UPDATED FROM SIGNALR:", CONFIG);
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
  function resetDoorStatus() {
    document.querySelectorAll(".door-item").forEach(item => {
      const img = item.querySelector(".door-img img");
      const stateEl = item.querySelector(".door-state");
      const stateTime = item.querySelector(".door-time");

      if (img) {
        img.src = "assets/images/door-closed.png";
        img.style.opacity = "0.4";
      }

      if (stateEl) {
        stateEl.textContent = "--";
        stateEl.className = "door-state";
        stateEl.style.color = "#000000";
        stateEl.style.fontWeight = "250";
      }

      if (stateTime) {
        stateTime.textContent = "--";
      }
    });
  }

  /* =====================================================
     🚪 DOOR CONFIG
  ===================================================== */
  const IMG_OPEN = "assets/images/door-open.png";
  const IMG_CLOSED = "assets/images/door-closed.png";

  function renderDoor(doorId, isOpen, time) {
    const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
    if (!item) return;

    const img = item.querySelector(".door-img img");
    const stateEl = item.querySelector(".door-state");
    const stateTime = item.querySelector(".door-time");

    if (!img || !stateEl || !stateTime) return;

    img.src = isOpen ? IMG_OPEN : IMG_CLOSED;
    img.style.opacity = "1";
    stateEl.textContent = isOpen ? "Open" : "Closed";
    stateEl.className = isOpen ? "door-state alert" : "door-state ok";
    stateTime.textContent = time ? time : "--";
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

class AnomalyScoreChart {
  constructor(canvas) {
    canvas.parentElement.style.height = "230px";

    this.chart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: "#dc2626",
          borderWidth: 3.5,
          tension: 0.32,

          pointRadius: ctx =>
            ctx.dataIndex === ctx.dataset.data.length - 1 ? 9 : 3,

          pointBackgroundColor: ctx =>
            ctx.dataIndex === ctx.dataset.data.length - 1
              ? "#dc2626"
              : "#ffffff",

          pointBorderColor: "#dc2626",
          pointBorderWidth: 2
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 450 },
        plugins: { legend: { display: false } },

        scales: {
          y: {
            min: 0,
            max: 1,
            ticks: {
              stepSize: 0.2,
              font: { size: 12, weight: "600" },
              color: "#374151"
            },
            grid: { color: "rgba(0,0,0,0.06)" }
          },
          x: {
            ticks: { color: "#6b7280", font: { size: 11 } },
            grid: { display: false }
          }
        }
      },

      plugins: [

        /* ===============================
           🟢🟡🔴 INDUSTRIAL RISK ZONES
        =============================== */
        {
          id: "riskBands",
          beforeDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea) return;
            const y = scales.y;

            const bands = [
              { from: 0.0, to: 0.4, c: "rgba(22,163,74,0.18)" },
              { from: 0.4, to: 0.7, c: "rgba(234,179,8,0.28)" },
              { from: 0.7, to: 1.0, c: "rgba(220,38,38,0.30)" }
            ];

            bands.forEach(b => {
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

        /* ===============================
           🚨 CURRENT SCORE LASER LINE
        =============================== */
        {
          id: "currentScoreLine",
          afterDatasetsDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            const data = chart.data.datasets[0].data;
            if (!data.length) return;

            const value = data[data.length - 1];
            const y = scales.y.getPixelForValue(value);

            ctx.save();
            ctx.strokeStyle = "rgba(220,38,38,0.9)";
            ctx.lineWidth = 2.2;
            ctx.setLineDash([8, 6]);

            ctx.beginPath();
            ctx.moveTo(chartArea.left, y);
            ctx.lineTo(chartArea.right, y);
            ctx.stroke();
            ctx.restore();
          }
        },

        /* ===============================
           🧠 INDUSTRIAL STATUS PANEL
        =============================== */
        {
          id: "statusPanel",
          afterDraw(chart) {
            const { ctx, chartArea } = chart;
            const data = chart.data.datasets[0].data;
            if (!data.length) return;

            const value = data[data.length - 1];

            let label = "NORMAL";
            let color = "#16a34a";

            if (value >= 0.8) { label = "CRITICAL"; color = "#dc2626"; }
            else if (value >= 0.6) { label = "RISK"; color = "#ea580c"; }
            else if (value >= 0.4) { label = "WARNING"; color = "#ca8a04"; }
            else if (value >= 0.2) { label = "OBSERVE"; color = "#2563eb"; }

            const x = chartArea.right - 140;
            const y = chartArea.top + 14;
            const w = 124;
            const h = 76;

            ctx.save();

            ctx.shadowColor = "rgba(0,0,0,0.25)";
            ctx.shadowBlur = 14;

            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 10);
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.textAlign = "center";

            ctx.fillStyle = "#374151";
            ctx.font = "700 11px Inter, system-ui";
            ctx.fillText("ANOMALY SCORE", x + w / 2, y + 18);

            ctx.font = "800 22px Inter, system-ui";
            ctx.fillStyle = color;
            ctx.fillText(value.toFixed(2), x + w / 2, y + 44);

            ctx.font = "700 12px Inter, system-ui";
            ctx.fillText(label, x + w / 2, y + 64);

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


   //-------additional chart code-----//
function renderAnomalyAlert(payload) {
  const panel = document.getElementById("anomalyAlertPanel");
  if (!panel) return;

  const score = payload?.abnormality?.score;
  if (score === undefined) {
    panel.innerHTML = "";
    return;
  }

  let level = "NORMAL";
  let color = "#16a34a";
  let bg = "rgba(22,163,74,0.08)";
  let icon = "✔️";

  if (score >= 0.8) {
    level = "CRITICAL";
    color = "#dc2626";
    bg = "rgba(220,38,38,0.12)";
    icon = "⚠️";
  } else if (score >= 0.6) {
    level = "RISK";
    color = "#ea580c";
    bg = "rgba(234,88,12,0.12)";
    icon = "⚠️";
  } else if (score >= 0.4) {
    level = "WARNING";
    color = "#ca8a04";
    bg = "rgba(202,138,4,0.12)";
    icon = "⚠️";
  } else if (score >= 0.2) {
    level = "OBSERVE";
    color = "#2563eb";
    bg = "rgba(37, 99, 235, 1)";
    icon = "⚠️";
  }










/* ================================
   🔍 INTELLIGENT REASONS
================================ */
const reasons = [];
let anomalyScore = 0;

/* ================================
   🌡️ DHT22 LOGIC
   - SENSOR_LIMIT (±)
   - SENSOR_DIFF (±)
   - Combined temp + hum
================================ */
payload?.dht22?.forEach((s, i) => {
  const sensorId = `TH${i + 1}`;

  const temp = s.temperature;
  const hum  = s.humidity;

  const tempDelta = Math.abs(temp - CONFIG.BASE_TEMP);
  const humDelta  = Math.abs(hum - CONFIG.BASE_HUM);

  /* ---------- SENSOR_LIMIT checks (±6) ---------- */

  if (tempDelta >= CONFIG.SENSOR_LIMIT) {
    reasons.push(
      `${sensorId}: temperature out of range (${temp}°C)`
    );
    anomalyScore += CONFIG.SENSOR_SCORE;
  }

  if (humDelta >= CONFIG.SENSOR_LIMIT) {
    reasons.push(
      `${sensorId}: humidity out of range (${hum}%)`
    );
    anomalyScore += CONFIG.SENSOR_SCORE;
  }

  /* ---------- Combined temp + humidity ---------- */

  if (
    tempDelta >= CONFIG.SENSOR_LIMIT &&
    humDelta >= CONFIG.SENSOR_LIMIT
  ) {
    reasons.push(
      `${sensorId}: temperature & humidity deviated together`
    );
    anomalyScore += CONFIG.DIFF_SCORE;
  }

  /* ---------- SENSOR_DIFF checks (±10) ---------- */

  if (tempDelta >= CONFIG.SENSOR_DIFF) {
    reasons.push(
      `${sensorId}: temperature major drift ${tempDelta.toFixed(1)}°C from baseline`
    );
    anomalyScore += CONFIG.DIFF_SCORE;
  }

  if (humDelta >= CONFIG.SENSOR_DIFF) {
    reasons.push(
      `${sensorId}: humidity major drift ${humDelta.toFixed(1)}% from baseline`
    );
    anomalyScore += CONFIG.DIFF_SCORE;
  }
});

/* ================================
   🚪 DOOR LOGIC (KEPT AS-IS)
   state: 0 = OPEN, 1 = CLOSED
================================ */
let door1Open = true;
let door2Open = true;

payload?.doors?.forEach((d) => {
  if (d.id === 0 && d.state === 0) door1Open = false;
  if (d.id === 1 && d.state === 0) door2Open = false;
});

/* ================================
   🔗 DOOR REASONS
================================ */
if (door1Open && door2Open) {
  reasons.push(`Door 1 & Door 2 are open`);
} else if (door1Open) {
  reasons.push(`Door 1 is open`);
} else if (door2Open) {
  reasons.push(`Door 2 is open`);
}

/* ================================
   📊 SCORE NORMALIZATION
================================ */
anomalyScore = Math.min(anomalyScore, 1);

/* ================================
   ✅ NORMAL FALLBACK
================================ */
if (!reasons.length) {
  reasons.push(`Temperature, humidity, and door states are normal`);
}


   


   
 



   
  panel.innerHTML = `
    <div style="
      border: 2px solid ${color};
      border-radius: 16px;
      padding: 18px 20px;
      background: linear-gradient(135deg, #ffffff, ${bg});
      box-shadow: 0 14px 40px rgba(0,0,0,0.08);
      font-family: Inter, system-ui;
    ">

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:22px">${icon}</span>
        <div style="font-size:18px;font-weight:800;color:${color}">
          ANOMALY ALERT
        </div>
      </div>

      <div style="
        font-size:42px;
        font-weight:900;
        color:${color};
        line-height:1;
      ">
        ${score.toFixed(2)}
        <span style="font-size:20px;font-weight:700;margin-left:8px">
          ${level}
        </span>
      </div>

      <hr style="margin:14px 0;border:none;border-top:1px solid rgba(0,0,0,0.1)" />

      <div style="font-size:14px;font-weight:700;margin-bottom:6px">
        Reason:
      </div>

      <ul style="padding-left:18px;margin:0">
        ${reasons
          .map(
            r =>
              `<li style="margin-bottom:6px;font-size:14px">${r}</li>`
          )
          .join("")}
      </ul>

      <div style="
        margin-top:14px;
        font-size:12px;
        color:#6b7280;
        display:flex;
        justify-content:space-between;
      ">
        <span>Auto-detected</span>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  `;
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
        /* 🔧 SIGNALR → CONFIG UPDATE (ADD HERE) */
      updateConfigFromPayload(payload);
      updateGatewayInfo(payload);
      updateLatestRecordTable(payload);
      updateEventLogFullJSON(payload);

      payload?.dht22?.forEach(sensor => {
        const chart = telemetryCharts[sensor.id];
        if (chart) chart.pushPoint(sensor.temperature, sensor.humidity);
      });

      if (payload?.abnormality?.score !== undefined) {
        anomalyChart.push(payload.abnormality.score);
         renderAnomalyAlert(payload); // 🔥 THIS LINE
      }

      payload?.doors?.forEach(d =>
        renderDoor(`D${d.id + 1}`, d.state === 1, d.changedAt)
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
