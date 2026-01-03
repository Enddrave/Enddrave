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
    stateEl.textContent = isOpen ? "Open" : "Closed";
    stateEl.className = isOpen ? "door-state alert" : "door-state ok";
  }

  /* =====================================================
     🛰️ GATEWAY & CONNECTIVITY (UNCHANGED)
  ===================================================== */
  function updateGatewayInfo(payload) {
    try {
      const card = document.querySelector(".left-column .card");
      if (!card) return;

      const rows = card.querySelectorAll(".status-list li");

      rows.forEach(li => {
        const labelEl = li.querySelector(".status-label");
        if (!labelEl) return;

        const label = labelEl.textContent.trim();
        let valueNode = labelEl.nextSibling;

        if (!valueNode || valueNode.nodeType !== Node.TEXT_NODE) {
          valueNode = document.createTextNode(" NA");
          li.appendChild(valueNode);
        }

        if (label.startsWith("Device ID"))
          valueNode.textContent = " " + (payload.deviceId ?? "NA");

        if (label.startsWith("Location"))
          valueNode.textContent = " " + (payload.location ?? "NA");

        if (label.startsWith("Firmware"))
          valueNode.textContent = " " + (payload.firmwareVersion ?? "NA");

        if (label.startsWith("Last update")) {
          valueNode.textContent = payload.ts
            ? " " + new Date(payload.ts * 1000).toLocaleString()
            : " NA";
        }

        if (label.startsWith("RSSI")) {
          valueNode.textContent =
            payload.rssi !== undefined ? " " + payload.rssi + " dBm" : " NA";
        }
      });

      const badge = card.querySelector(".badge");
      if (badge) {
        badge.innerHTML = `
          <span class="badge-dot"></span>
          ${payload.status === "online"
            ? "Online – MQTT over LTE"
            : "Offline"}
        `;
      }
    } catch (err) {
      console.error("Gateway UI error:", err);
    }
  }

  /* =====================================================
   📈 MINI TELEMETRY CHARTS (FIXED CANVAS + TIME FIX)
===================================================== */
class MiniTelemetryChart {
  constructor(canvas) {

    /* ---------- FIXED RENDER SIZE ---------- */
    const FIXED_WIDTH = 600;
    const FIXED_HEIGHT = 260;

    const wrapper = canvas.parentElement;
    wrapper.style.height = "190px";
    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "center";
    wrapper.style.alignItems = "center";
    wrapper.style.overflow = "hidden";

    canvas.width = FIXED_WIDTH;
    canvas.height = FIXED_HEIGHT;
    canvas.style.width = FIXED_WIDTH + "px";
    canvas.style.height = FIXED_HEIGHT + "px";

    const applyScale = () => {
      const scale = wrapper.clientWidth / FIXED_WIDTH;
      canvas.style.transform = `scale(${scale})`;
      canvas.style.transformOrigin = "top center";
    };

    applyScale();
    window.addEventListener("resize", applyScale);

    /* ---------- CHART ---------- */
    this.chart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature (°C)",
            data: [],
            borderColor: "#f97316",
            borderWidth: 4,
            pointRadius: 4,
            tension: 0.15,
            fill: false
          },
          {
            label: "Humidity (%)",
            data: [],
            borderColor: "#2563eb",
            borderWidth: 4,
            pointRadius: 4,
            tension: 0.15,
            fill: false
          }
        ]
      },
      options: {
        responsive: false,
        animation: false,
        devicePixelRatio: 1,

        layout: {
          padding: { top: 18, bottom: 12, left: 12, right: 12 }
        },

        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              boxWidth: 36,
              boxHeight: 12,
              padding: 18,
              font: {
                size: 14,
                weight: "600"
              }
            }
          }
        },

        scales: {
          x: {
            ticks: {
              autoSkip: false,          // 🔴 FIX
              maxRotation: 45,
              minRotation: 45,
              font: { size: 12 },
              callback: (val, index) => {
                return this.chart.data.labels[index];
              }
            },
            grid: { drawBorder: false }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 30,
              font: { size: 12 }
            },
            grid: { drawBorder: false }
          }
        }
      }
    });
  }

  pushPoint(temp, hum) {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const d = this.chart.data;
    d.labels.push(time);
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
     📊 INIT CHARTS
  ===================================================== */
  const telemetryCharts = [];
  document.querySelectorAll(".telemetry-chart").forEach(canvas => {
    telemetryCharts.push(new MiniTelemetryChart(canvas));
  });

  /* =====================================================
     🧾 EVENT LOG (UNCHANGED)
  ===================================================== */
  function updateEventLogFullJSON(payload) {
    const logBox = document.querySelector(".log-box");
    if (!logBox) return;

    const time = new Date().toLocaleTimeString();

    const entry = document.createElement("pre");
    entry.className = "log-row";
    entry.style.whiteSpace = "pre-wrap";
    entry.style.fontFamily = "monospace";
    entry.style.fontSize = "12px";

    entry.textContent =
      `${time} — FULL TELEMETRY\n` +
      JSON.stringify(payload, null, 2);

    logBox.prepend(entry);

    while (logBox.children.length > 10) {
      logBox.removeChild(logBox.lastChild);
    }
  }

  /* =====================================================
     🌐 SIGNALR CONNECTION (UNCHANGED)
  ===================================================== */
  async function startSignalR() {
    try {
      const resp = await fetch(
        "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
      );
      if (!resp.ok) throw new Error("Negotiate failed");

      const { url, accessToken } = await resp.json();

      const conn = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .build();

      conn.on("newtelemetry", payload => {
        log("LIVE JSON:", payload);

        updateGatewayInfo(payload);
        updateEventLogFullJSON(payload);

        payload?.dht22?.forEach(sensor => {
          const chart = telemetryCharts[sensor.id];
          if (chart) {
            chart.pushPoint(sensor.temperature, sensor.humidity);
          }
        });

        payload?.doors?.forEach(d => {
          renderDoor(`D${d.id + 1}`, d.state === 1);
        });
      });

      await conn.start();
      console.log("🟢 SignalR CONNECTED");
    } catch (e) {
      console.error("SignalR error:", e);
    }
  }

  startSignalR();
});
