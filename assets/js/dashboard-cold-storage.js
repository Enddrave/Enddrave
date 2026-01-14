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

        if (label.startsWith("Last update"))
          valueNode.textContent = payload.ts
            ? " " + new Date(payload.ts * 1000).toLocaleString()
            : " NA";

        if (label.startsWith("RSSI"))
          valueNode.textContent =
            payload.rssi !== undefined ? " " + payload.rssi + " dBm" : " NA";
      });
    } catch (err) {
      console.error("Gateway UI error:", err);
    }
  }

  /* =====================================================
     📈 MINI TELEMETRY CHARTS (UNCHANGED)
  ===================================================== */
  class MiniTelemetryChart {
    constructor(canvas) {
      canvas.parentElement.style.height = "185px";
      this.chart = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: { labels: [], datasets: [{ data: [] }, { data: [] }] },
        options: { animation: false }
      });
    }
    pushPoint(t, h) {
      const d = this.chart.data;
      d.labels.push(new Date().toLocaleTimeString());
      d.datasets[0].data.push(t);
      d.datasets[1].data.push(h);
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
     📋 LATEST RECORD TABLE – CORRECT FIX
  ===================================================== */
  function updateLatestRecordTable(payload) {
    if (!payload?.dht22) return;

    const tbody = document.querySelector("#latestRecordTable tbody");
    if (!tbody) return;

    const time = new Date().toLocaleTimeString();

    payload.dht22.forEach((sensor, index) => {
      const row = tbody.querySelector(`tr[data-index="${index}"]`);
      if (!row) return;

      const cells = row.children;

      // Update ONLY required fields
      cells[1].textContent =
        sensor.temperature !== undefined
          ? sensor.temperature.toFixed(1)
          : "NA";

      cells[2].textContent =
        sensor.humidity !== undefined
          ? sensor.humidity.toFixed(1)
          : "NA";

      cells[3].textContent = time;
    });
  }

  /* =====================================================
     🌐 SIGNALR CONNECTION (UNCHANGED)
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
        log("LIVE JSON:", payload);

        updateGatewayInfo(payload);
        updateLatestRecordTable(payload);

        payload?.dht22?.forEach(sensor => {
          const chart = telemetryCharts[sensor.id];
          if (chart) chart.pushPoint(sensor.temperature, sensor.humidity);
        });

        payload?.doors?.forEach(d =>
          renderDoor(`D${d.id + 1}`, d.state === 1)
        );
      });

      await conn.start();
      console.log("🟢 SignalR CONNECTED");
    } catch (e) {
      console.error("SignalR error:", e);
    }
  }

  startSignalR();
});
