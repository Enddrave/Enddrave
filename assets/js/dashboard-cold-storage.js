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
     🛰️ GATEWAY & CONNECTIVITY (SAFE)
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
     📈 MINI TELEMETRY CHARTS (LIVE – TEMP + HUM)
  ===================================================== */
  class MiniTelemetryChart {
    constructor(canvas) {
      this.chart = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Temperature (°C)",
              data: [],
              borderColor: "#f97316",
              backgroundColor: "rgba(249,115,22,0.15)",
              borderWidth: 2,
              tension: 0.35,
              pointRadius: 3
            },
            {
              label: "Humidity (%)",
              data: [],
              borderColor: "#2563eb",
              backgroundColor: "rgba(37,99,235,0.15)",
              borderWidth: 2,
              tension: 0.35,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true }
          },
          scales: {
            x: { title: { display: true, text: "Time" } },
            y: {
              title: { display: true, text: "Value" },
              suggestedMin: 0,
              suggestedMax: 100
            }
          }
        }
      });
    }

    pushPoint(temp, hum) {
      const time = new Date().toLocaleTimeString();
      const data = this.chart.data;

      data.labels.push(time);
      data.datasets[0].data.push(temp);
      data.datasets[1].data.push(hum);

      if (data.labels.length > 12) {
        data.labels.shift();
        data.datasets.forEach(ds => ds.data.shift());
      }

      this.chart.update();
    }
  }

  /* =====================================================
     📊 INIT CHARTS (1 canvas = 1 sensor)
  ===================================================== */
  const telemetryCharts = [];
  document.querySelectorAll(".telemetry-chart").forEach(canvas => {
    telemetryCharts.push(new MiniTelemetryChart(canvas));
  });

  /* =====================================================
     🌐 SIGNALR CONNECTION (LIVE DATA)
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

      // 🔴 BACKEND METHOD NAME
      conn.on("newtelemetry", payload => {
        log("LIVE JSON:", payload);

        updateGatewayInfo(payload);

        // 🔥 FULL LIVE GRAPH DATA
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
      console.log("🟢 SignalR CONNECTED (LIVE)");
    } catch (e) {
      console.error("SignalR error:", e);
    }
  }

  startSignalR();
});
