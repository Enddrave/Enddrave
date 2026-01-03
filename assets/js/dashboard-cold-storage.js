/* =====================================================
   🔧 DEBUG FLAG
===================================================== */
const DEBUG = true;
const log = (...args) => DEBUG && console.log(...args);

/* =====================================================
   🚀 DOM READY
===================================================== */
document.addEventListener("DOMContentLoaded", () => {

  let signalRActive = false; // ⛔ stop demo once live data arrives

  /* =====================================================
     🚪 DOOR CONFIG
  ===================================================== */
  const IMG_OPEN = "assets/images/door-open.png";
  const IMG_CLOSED = "assets/images/door-closed.png";

  const DOOR_STATE = { D1: false, D2: true };

  function renderDoor(doorId, isOpen) {
    const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
    if (!item) return;

    const img = item.querySelector(".door-img img");
    const stateEl = item.querySelector(".door-state");

    if (isOpen) {
      img.src = IMG_OPEN;
      stateEl.textContent = "Open";
      stateEl.className = "door-state alert";
    } else {
      img.src = IMG_CLOSED;
      stateEl.textContent = "Closed";
      stateEl.className = "door-state ok";
    }
  }

  function updateDoor(doorId, isOpen) {
    DOOR_STATE[doorId] = isOpen;
    renderDoor(doorId, isOpen);
  }

  Object.entries(DOOR_STATE).forEach(([id, s]) => renderDoor(id, s));

  /* =====================================================
     🛰️ GATEWAY & CONNECTIVITY (HTML-AWARE FIX)
  ===================================================== */
  function updateGatewayInfo(payload) {
    if (!payload) return;

    const gatewayCard = document.querySelector(
      '.card .card-title:textEquals("Gateway & Connectivity")'
    ) || document.querySelector(".left-column .card");

    if (!gatewayCard) return;

    const rows = gatewayCard.querySelectorAll(".status-list li");

    rows.forEach(li => {
      const label = li.querySelector(".status-label")?.textContent || "";

      if (label.includes("Device ID"))
        li.lastChild.textContent = " " + payload.deviceId;

      if (label.includes("Location"))
        li.lastChild.textContent = " " + payload.location;

      if (label.includes("Firmware"))
        li.lastChild.textContent = " " + payload.firmwareVersion;

      if (label.includes("Last update") && payload.ts) {
        const t = new Date(payload.ts * 1000).toLocaleString();
        li.lastChild.textContent = " " + t;
      }

      if (label.includes("RSSI") && payload.rssi !== undefined)
        li.lastChild.textContent = " " + payload.rssi + " dBm";
    });

    const badge = gatewayCard.querySelector(".badge");
    if (badge) {
      badge.innerHTML = `
        <span class="badge-dot"></span>
        ${payload.status === "online" ? "Online – MQTT over LTE" : "Offline"}
      `;
    }
  }

  /* =====================================================
     📈 MINI TELEMETRY CHARTS
  ===================================================== */
  class MiniTelemetryChart {
    constructor(canvas) {
      this.ctx = canvas.getContext("2d");
      this.labels = [];
      this.temp = [];
      this.hum = [];
      this.max = 12;
    }

    pushPoint(t, h) {
      const now = new Date();
      const label = now.toLocaleTimeString();

      this.labels.push(label);
      this.temp.push(t);
      this.hum.push(h);

      if (this.labels.length > this.max) {
        this.labels.shift();
        this.temp.shift();
        this.hum.shift();
      }

      this.draw();
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, 300, 120);

      ctx.strokeStyle = "#ea580c";
      ctx.beginPath();
      this.temp.forEach((v, i) =>
        i === 0 ? ctx.moveTo(i * 20, 120 - v) : ctx.lineTo(i * 20, 120 - v)
      );
      ctx.stroke();

      ctx.strokeStyle = "#0f766e";
      ctx.beginPath();
      this.hum.forEach((v, i) =>
        i === 0 ? ctx.moveTo(i * 20, 120 - v) : ctx.lineTo(i * 20, 120 - v)
      );
      ctx.stroke();
    }
  }

  const telemetryCharts = [];
  document.querySelectorAll(".telemetry-chart").forEach(c => {
    telemetryCharts.push(new MiniTelemetryChart(c));
  });

  /* =====================================================
     🌐 SIGNALR CONNECTION (LIVE DATA)
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

      conn.on("telemetry", payload => {
        signalRActive = true;
        log("LIVE PAYLOAD:", payload);

        updateGatewayInfo(payload);

        payload.dht22?.forEach((s, i) => {
          telemetryCharts[i]?.pushPoint(s.temperature, s.humidity);
        });

        payload.doors?.forEach(d => {
          updateDoor(`D${d.id + 1}`, d.state === 1);
        });
      });

      await conn.start();
      console.log("🟢 SignalR LIVE");
    } catch (e) {
      console.error("SignalR error", e);
    }
  }

  startSignalR();

  /* =====================================================
     🔄 DEMO (AUTO-DISABLED WHEN LIVE)
  ===================================================== */
  setInterval(() => {
    if (signalRActive) return;

    telemetryCharts.forEach(c =>
      c.pushPoint(18 + Math.random(), 75 + Math.random())
    );

    updateDoor("D1", Math.random() > 0.5);
    updateDoor("D2", Math.random() > 0.5);
  }, 3000);

});
