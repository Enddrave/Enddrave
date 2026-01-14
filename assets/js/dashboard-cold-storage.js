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
     🔴 DEFAULT OFFLINE BADGE
  ===================================================== */
  function setGatewayOffline() {
    const badge = document.querySelector(".badge");
    if (!badge) return;

    badge.className = "badge offline";
    badge.innerHTML = `<span class="badge-dot"></span> Offline`;
  }

  /* =====================================================
     🔴 RESET GATEWAY FIELDS
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
     🔴 RESET LATEST RECORD TABLE
  ===================================================== */
  function resetLatestRecordTable() {
    document.querySelectorAll("table tbody tr").forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 4) return;

      cells[1].textContent = "--";
      cells[2].textContent = "--";
      cells[3].textContent = "--";
    });
  }

  /* =====================================================
     🔴 RESET DOOR STATUS
  ===================================================== */
  function resetDoorStatus() {
    document.querySelectorAll(".door-item").forEach(item => {
      const img = item.querySelector(".door-img img");
      const state = item.querySelector(".door-state");

      if (img) {
        img.src = "assets/images/door-closed.png";
        img.style.opacity = "0.45";
      }

      if (state) {
        state.textContent = "--";
        state.className = "door-state";
        state.style.color = "#9ca3af";
      }
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
    const state = item.querySelector(".door-state");
    if (!img || !state) return;

    img.src = isOpen ? IMG_OPEN : IMG_CLOSED;
    img.style.opacity = "1";

    state.textContent = isOpen ? "Open" : "Closed";
    state.className = isOpen ? "door-state alert" : "door-state ok";
  }

  /* =====================================================
     🛰️ GATEWAY UPDATE (ONLINE)
  ===================================================== */
  function updateGatewayInfo(payload) {
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

    const badge = card.querySelector(".badge");
    if (badge) {
      badge.className = "badge online";
      badge.innerHTML =
        `<span class="badge-dot"></span> Online – MQTT over LTE`;
    }
  }

  /* =====================================================
     📈 MINI TELEMETRY CHARTS (UNCHANGED)
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
              borderWidth: 3,
              tension: 0.25,
              pointRadius: 3,
              fill: false
            },
            {
              label: "Humidity (%)",
              data: [],
              borderColor: "#0f766e",
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

    pushPoint(t, h) {
      const time = new Date().toLocaleTimeString();
      const d = this.chart.data;

      d.labels.push(time);
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
  document.querySelectorAll(".telemetry-chart")
    .forEach(c => telemetryCharts.push(new MiniTelemetryChart(c)));

  /* =====================================================
     📋 LATEST RECORD TABLE (ONLINE)
  ===================================================== */
  function updateLatestRecordTable(payload) {
    if (!payload?.dht22) return;

    const rows = document.querySelectorAll("table tbody tr");

    payload.dht22.forEach((s, i) => {
      const row = rows[i];
      if (!row) return;

      const cells = row.querySelectorAll("td");
      if (cells.length < 4) return;

      cells[1].textContent = s.temperature?.toFixed(1) ?? "NA";
      cells[2].textContent = s.humidity?.toFixed(1) ?? "NA";
      cells[3].textContent = new Date().toLocaleTimeString();
    });
  }

  /* =====================================================
     🧾 EVENT LOG (FULL JSON)
  ===================================================== */
  function updateEventLogFullJSON(payload) {
    const box = document.querySelector(".log-box");
    if (!box) return;

    const pre = document.createElement("pre");
    pre.className = "log-row";
    pre.textContent =
      `${new Date().toLocaleTimeString()} — FULL TELEMETRY\n` +
      JSON.stringify(payload, null, 2);

    box.prepend(pre);
    while (box.children.length > 20) {
      box.removeChild(box.lastChild);
    }
  }

  /* =====================================================
     🌐 SIGNALR
  ===================================================== */
  async function startSignalR() {
    const r = await fetch(
      "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
    );
    const { url, accessToken } = await r.json();

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .build();

    conn.on("newtelemetry", payload => {
      log("LIVE:", payload);

      updateGatewayInfo(payload);
      updateLatestRecordTable(payload);
      updateEventLogFullJSON(payload);

      payload?.dht22?.forEach(s => {
        const chart = telemetryCharts[s.id];
        if (chart) chart.pushPoint(s.temperature, s.humidity);
      });

      payload?.doors?.forEach(d =>
        renderDoor(`D${d.id + 1}`, d.state === 1)
      );
    });

    await conn.start();
    console.log("🟢 SignalR connected");
  }

  /* =====================================================
     🚀 STARTUP
  ===================================================== */
  setGatewayOffline();
  resetGatewayFields();
  resetLatestRecordTable();
  resetDoorStatus();
  startSignalR();
});
