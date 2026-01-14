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
            payload.rssi !== undefined
              ? " " + payload.rssi + " dBm"
              : " NA";
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
          animation: false,
          layout: {
            padding: { top: 2, bottom: 16 }
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
              align: "start"
            }
          },
          scales: {
            x: { ticks: { maxTicksLimit: 6 } },
            y: { min: 0, max: 100 }
          }
        }
      });
    }

    pushPoint(temp, hum) {
      const t = new Date().toLocaleTimeString();
      const data = this.chart.data;

      data.labels.push(t);
      data.datasets[0].data.push(temp);
      data.datasets[1].data.push(hum);

      if (data.labels.length > 12) {
        data.labels.shift();
        data.datasets.forEach(ds => ds.data.shift());
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
     📋 LATEST RECORD TABLE (✅ FINAL FIX)
  ===================================================== */
  function updateLatestRecordTable(payload) {
    const tbody = document.querySelector("#latestRecordTable tbody");
    if (!tbody || !payload?.dht22) return;

    payload.dht22.forEach(sensor => {
      const rowId = `th-row-${sensor.id}`;
      let row = document.getElementById(rowId);

      if (!row) {
        row = document.createElement("tr");
        row.id = rowId;
        row.innerHTML = `
          <td>TH${sensor.id + 1}</td>
          <td class="temp">NA</td>
          <td class="hum">NA</td>
          <td class="time">NA</td>
        `;
        tbody.appendChild(row);
      }

      row.querySelector(".temp").textContent =
        sensor.temperature !== undefined
          ? sensor.temperature.toFixed(1)
          : "NA";

      row.querySelector(".hum").textContent =
        sensor.humidity !== undefined
          ? sensor.humidity.toFixed(1)
          : "NA";

      // 👇 THIS is the real dynamic update
      row.querySelector(".time").textContent =
        new Date().toLocaleTimeString();
    });
  }

  /* =====================================================
     🧾 EVENT LOG (UNCHANGED)
  ===================================================== */
  function updateEventLogFullJSON(payload) {
    const logBox = document.querySelector(".log-box");
    if (!logBox) return;

    const entry = document.createElement("pre");
    entry.className = "log-row";
    entry.textContent =
      `${new Date().toLocaleTimeString()} — FULL TELEMETRY\n` +
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
      updateEventLogFullJSON(payload);
      updateLatestRecordTable(payload);

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
  }

  startSignalR();
});
