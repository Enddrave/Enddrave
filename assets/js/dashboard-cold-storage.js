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
     ⏱ OFFLINE CONFIG
  ===================================================== */
  const OFFLINE_TIMEOUT = 20000; // 20 seconds
  let lastTelemetryTs = 0;

  /* =====================================================
     🚪 DOOR CONFIG
  ===================================================== */
  const IMG_OPEN = "assets/images/door-open.png";
  const IMG_CLOSED = "assets/images/door-closed.png";

  /* =====================================================
     🚪 DOOR NA RENDER
  ===================================================== */
  function renderDoorNA(doorId) {
    const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
    if (!item) return;

    const img = item.querySelector(".door-img img");
    const stateEl = item.querySelector(".door-state");

    if (img) img.src = IMG_CLOSED;
    if (stateEl) {
      stateEl.textContent = "NA";
      stateEl.className = "door-state na";
    }
  }

  function renderDoor(doorId, isOpen) {
    if (isOpen === undefined || isOpen === null) {
      renderDoorNA(doorId);
      return;
    }

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
     🚪 INITIAL STATE (PAGE LOAD)
  ===================================================== */
  ["D1", "D2"].forEach(renderDoorNA);

  /* =====================================================
     🛰️ GATEWAY UI
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
          ${payload.status === "online" ? "Online – MQTT over LTE" : "Offline"}
        `;
      }
    } catch (err) {
      console.error("Gateway UI error:", err);
    }
  }

  /* =====================================================
     ❌ SET UI OFFLINE + NA
  ===================================================== */
  function setUIOffline() {
    updateGatewayInfo({ status: "offline" });
    ["D1", "D2"].forEach(renderDoorNA);
  }

  /* =====================================================
     ⏱ OFFLINE WATCHDOG
  ===================================================== */
  setInterval(() => {
    if (!lastTelemetryTs) return;

    if (Date.now() - lastTelemetryTs > OFFLINE_TIMEOUT) {
      log("⚠ No telemetry for 20s → OFFLINE");
      setUIOffline();
      lastTelemetryTs = 0;
    }
  }, 1000);

  /* =====================================================
     📈 MINI TELEMETRY CHARTS (UNCHANGED)
  ===================================================== */
  class MiniTelemetryChart {
    constructor(canvas) {
      canvas.parentElement.style.height = "185px";
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
        options: { responsive: true, animation: false }
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

  const telemetryCharts = [];
  document.querySelectorAll(".telemetry-chart").forEach(c =>
    telemetryCharts.push(new MiniTelemetryChart(c))
  );

  /* =====================================================
     🌐 SIGNALR
  ===================================================== */
  async function startSignalR() {
    try {
      const resp = await fetch(
        "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
      );
      const { url, accessToken } = await resp.json();

      const conn = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .build();

      conn.on("newtelemetry", payload => {
        lastTelemetryTs = Date.now();

        updateGatewayInfo(payload);

        payload?.dht22?.forEach(s => {
          telemetryCharts[s.id]?.pushPoint(s.temperature, s.humidity);
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
