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

      cells[1].textContent = "--"; // Temp
      cells[2].textContent = "--"; // Hum
      cells[3].textContent = "--"; // Time
    });
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
    stateEl.textContent = isOpen ? "Open" : "Closed";
    stateEl.className = isOpen ? "door-state alert" : "door-state ok";
  }

  /* =====================================================
     🛰️ GATEWAY & CONNECTIVITY (ONLINE UPDATE)
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

        if (label.startsWith("RSSI"))
          valueNode.textContent =
            payload.rssi !== undefined
              ? " " + payload.rssi + " dBm"
              : " --";
      });

      /* 🟢 ONLINE BADGE */
      const badge = card.querySelector(".badge");
      if (badge) {
        badge.className = "badge online";
        badge.innerHTML =
          `<span class="badge-dot"></span> Online – MQTT over LTE`;
      }

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
              backgroundColor: "#f97316",
              borderWidth: 3,
              tension: 0.25,
              pointRadius: 3,
              fill: false
            },
            {
              label: "Humidity (%)",
              data: [],
              borderColor: "#0f766e",
              backgroundColor: "#0f766e",
              borderWidth: 3,
              tension: 0.25,
              pointRadius: 3,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
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
     📊 INIT CHARTS
  ===================================================== */
  const telemetryCharts = [];
  document.querySelectorAll(".telemetry-chart")
    .forEach(c => telemetryCharts.push(new MiniTelemetryChart(c)));

  /* =====================================================
     📋 LATEST RECORD TABLE (ONLINE UPDATE)
  ===================================================== */
  function updateLatestRecordTable(payload) {
    if (!payload?.dht22) return;

    const rows = document.querySelectorAll("table tbody tr");

    payload.dht22.forEach((sensor, index) => {
      const row = rows[index];
      if (!row) return;

      const cells = row.querySelectorAll("td");
      if (cells.length < 4) return;

      cells[1].textContent =
        sensor.temperature?.toFixed(1) ?? "NA";

      cells[2].textContent =
        sensor.humidity?.toFixed(1) ?? "NA";

      cells[3].textContent =
        new Date().toLocaleTimeString();
    });
  }

  /* =====================================================
     🧾 EVENT LOG (FULL JSON)
  ===================================================== */
  function updateEventLogFullJSON(payload) {
    const logBox = document.querySelector(".log-box");
    if (!logBox) return;

    const pre = document.createElement("pre");
    pre.className = "log-row";
    pre.textContent =
      `${new Date().toLocaleTimeString()} — FULL TELEMETRY\n` +
      JSON.stringify(payload, null, 2);

    logBox.prepend(pre);

    while (logBox.children.length > 20) {
      logBox.removeChild(logBox.lastChild);
    }
  }

  /* =====================================================
     🌐 SIGNALR CONNECTION
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
      log("LIVE JSON:", payload);

      updateGatewayInfo(payload);
      updateLatestRecordTable(payload);
      updateEventLogFullJSON(payload);

      payload?.dht22?.forEach(sensor => {
        const chart = telemetryCharts[sensor.id];
        if (chart) {
          chart.pushPoint(sensor.temperature, sensor.humidity);
        }
      });

      payload?.doors?.forEach(d =>
        renderDoor(`D${d.id + 1}`, d.state === 1)
      );
    });

    await conn.start();
    console.log("🟢 SignalR CONNECTED");
  }

  /* =====================================================
     🚀 STARTUP SEQUENCE
  ===================================================== */
  setGatewayOffline();        // 🔴 badge
  resetGatewayFields();      // -- gateway fields
  resetLatestRecordTable();  // -- latest record table
  startSignalR();            // wait for telemetry
});
