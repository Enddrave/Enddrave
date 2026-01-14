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
     📈 MINI TELEMETRY CHARTS
  ===================================================== */
  class MiniTelemetryChart {
    constructor(canvas) {
      canvas.parentElement.style.height = "185px";

      this.chart = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [
            { label: "Temperature (°C)", data: [], borderColor: "#f97316", borderWidth: 3 },
            { label: "Humidity (%)", data: [], borderColor: "#0f766e", borderWidth: 3 }
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

  /* =====================================================
     📊 INIT CHARTS
  ===================================================== */
  const telemetryCharts = [];
  document.querySelectorAll(".telemetry-chart").forEach(c =>
    telemetryCharts.push(new MiniTelemetryChart(c))
  );

  /* =====================================================
     📋 LATEST RECORD TABLE – INIT NA
  ===================================================== */
  function initLatestRecordTable() {
    const tbody = document.querySelector("#latestRecordTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    for (let i = 0; i < 5; i++) {
      const tr = document.createElement("tr");
      tr.setAttribute("data-index", i);
      tr.innerHTML = `
        <td>TH${i + 1}</td>
        <td>NA</td>
        <td>NA</td>
        <td>NA</td>
      `;
      tbody.appendChild(tr);
    }
  }

  /* =====================================================
     📋 UPDATE ONLY LATEST VALUES
  ===================================================== */
  function updateLatestRecordTable(payload) {
    if (!payload?.dht22) return;

    const tbody = document.querySelector("#latestRecordTable tbody");
    if (!tbody) return;

    const time = new Date().toLocaleTimeString();

    payload.dht22.forEach((sensor, index) => {
      const row = tbody.querySelector(`tr[data-index="${index}"]`);
      if (!row) return;

      const cells = row.querySelectorAll("td");
      cells[1].textContent =
        sensor.temperature !== undefined ? sensor.temperature.toFixed(1) : "NA";
      cells[2].textContent =
        sensor.humidity !== undefined ? sensor.humidity.toFixed(1) : "NA";
      cells[3].textContent = time;
    });
  }

  /* =====================================================
     🧾 EVENT LOG (UNCHANGED)
  ===================================================== */
  function updateEventLogFullJSON(payload) {
    const logBox = document.querySelector(".log-box");
    if (!logBox) return;

    const entry = document.createElement("pre");
    entry.textContent = JSON.stringify(payload, null, 2);
    logBox.prepend(entry);

    while (logBox.children.length > 10)
      logBox.removeChild(logBox.lastChild);
  }

  /* =====================================================
     🌐 SIGNALR CONNECTION (UNCHANGED)
  ===================================================== */
  async function startSignalR() {
    try {
      const resp = await fetch("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate");
      const { url, accessToken } = await resp.json();

      const conn = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .build();

      conn.on("newtelemetry", payload => {
        log("LIVE JSON:", payload);

        updateGatewayInfo(payload);
        updateEventLogFullJSON(payload);
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

  /* =====================================================
     🚀 STARTUP SEQUENCE
  ===================================================== */
  initLatestRecordTable();   // ✅ NA default
  startSignalR();            // ✅ live update
});
