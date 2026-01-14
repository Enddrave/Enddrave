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
  function resetDoorStatus() {
    document.querySelectorAll(".door-item").forEach(item => {
      const img = item.querySelector(".door-img img");
      const stateEl = item.querySelector(".door-state");

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
    img.style.opacity = "1";

    stateEl.textContent = isOpen ? "Open" : "Closed";
    stateEl.className = isOpen ? "door-state alert" : "door-state ok";
  }

  /* =====================================================
     📈 MINI TELEMETRY CHARTS
     🔲 ONLY CHANGE: LEGEND SQUARE BOX
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

          /* 🔲 LEGEND FLAG FIX (RECTANGLE → SQUARE) */
          plugins: {
            legend: {
              labels: {
                boxWidth: 10,
                boxHeight: 10
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
     📊 INIT CHARTS
  ===================================================== */
  const telemetryCharts = [];
  document.querySelectorAll(".telemetry-chart")
    .forEach(c => telemetryCharts.push(new MiniTelemetryChart(c)));

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
      payload?.dht22?.forEach(sensor => {
        const chart = telemetryCharts[sensor.id];
        if (chart) chart.pushPoint(sensor.temperature, sensor.humidity);
      });
    });

    await conn.start();
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
