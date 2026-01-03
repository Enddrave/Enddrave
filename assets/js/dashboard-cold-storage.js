/* =====================================================
   🔧 DEBUG FLAG
===================================================== */
const DEBUG = false;
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

  // Initial state (can be overridden by SignalR)
  const DOOR_STATE = {
    D1: false,
    D2: true
  };

  function renderDoor(doorId, isOpen) {
    const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
    if (!item) return;

    const img = item.querySelector(".door-img img");
    const stateEl = item.querySelector(".door-state");
    if (!img || !stateEl) return;

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

  Object.entries(DOOR_STATE).forEach(([id, state]) => {
    renderDoor(id, state);
  });

  /* =====================================================
     📈 MINI TELEMETRY CHARTS
  ===================================================== */
  class MiniTelemetryChart {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      if (!this.ctx) return;

      this.maxPoints = 12;
      this.data = { labels: [], temp: [], hum: [] };
      this.isAnomaly = canvas.dataset.tag === "THD_ANOMALY";
      this.startTime = Date.now();

      this.resize();
      window.addEventListener("resize", () => this.resize());
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const width = this.canvas.parentElement?.clientWidth || 240;
      const height = 120;

      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = width + "px";
      this.canvas.style.height = height + "px";

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw();
    }

    pushPoint(temp, hum) {
      const elapsed = Date.now() - this.startTime;
      const m = Math.floor(elapsed / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      const label = `${m}:${s.toString().padStart(2, "0")}`;

      this.data.labels.push(label);
      this.data.temp.push(temp);
      this.data.hum.push(hum);

      if (this.data.labels.length > this.maxPoints) {
        ["labels", "temp", "hum"].forEach(k => this.data[k].shift());
      }
      this.draw();
    }

    draw() {
      const ctx = this.ctx;
      if (!ctx) return;

      const w = this.canvas.width / (window.devicePixelRatio || 1);
      const h = 120;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fbfbf7";
      ctx.fillRect(0, 0, w, h);

      const padding = { top: 15, right: 50, bottom: 25, left: 35 };
      const innerW = w - padding.left - padding.right;
      const innerH = h - padding.top - padding.bottom;

      const tempMax = 30;
      const humMax = 100;
      const anomalyMax = 100;
      const xCount = Math.max(this.data.labels.length, 2);

      const x = i => padding.left + (innerW * i) / (xCount - 1);
      const y = (v, max) => padding.top + innerH - (v / max) * innerH;

      const drawSeries = (arr, color, max) => {
        if (!arr.length) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        arr.forEach((v, i) =>
          i === 0 ? ctx.moveTo(x(i), y(v, max)) : ctx.lineTo(x(i), y(v, max))
        );
        ctx.stroke();
      };

      if (this.isAnomaly) {
        drawSeries(this.data.temp, "#ea580c", anomalyMax);
      } else {
        drawSeries(this.data.temp, "#ea580c", tempMax);
        drawSeries(this.data.hum, "#0f766e", humMax);
      }
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
     🌐 SIGNALR CONNECTION
  ===================================================== */
  async function startSignalR() {
    try {
      const resp = await fetch(
        "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
      );
      if (!resp.ok) return console.error("❌ /negotiate failed");

      const { url, accessToken } = await resp.json();

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      connection.on("telemetry", payload => {
        payload?.dht22?.forEach((s, i) => {
          const chart = telemetryCharts[i];
          if (chart) chart.pushPoint(s.temperature, s.humidity);
        });

        payload?.doors?.forEach(d => {
          updateDoor(`D${d.id + 1}`, d.state === 1);
        });
      });

      await connection.start();
      console.log("🟢 SignalR Connected");
    } catch (err) {
      console.error("❌ SignalR Error:", err);
    }
  }

  startSignalR();

  /* =====================================================
     🔄 DEMO DATA (NOW MATCHES REAL JSON BEHAVIOUR)
  ===================================================== */
  const demoTelemetry = {
    dht22: [
      { id: 0, temperature: 18.0, humidity: 77.4 },
      { id: 1, temperature: 18.1, humidity: 77.6 },
      { id: 2, temperature: 17.7, humidity: 79.8 },
      { id: 3, temperature: 17.7, humidity: 78.9 },
      { id: 4, temperature: 17.6, humidity: 77.9 }
    ],
    doors: [
      { id: 0, state: 1 },
      { id: 1, state: 0 }
    ]
  };

  setInterval(() => {
    demoTelemetry.dht22.forEach((s, i) => {
      const chart = telemetryCharts[i];
      if (chart) chart.pushPoint(s.temperature, s.humidity);
    });

    demoTelemetry.doors.forEach(d => {
      updateDoor(`D${d.id + 1}`, d.state === 1);
    });
  }, 3000);

});
