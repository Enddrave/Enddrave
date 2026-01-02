/* =====================================================
   🔧 DEBUG FLAG (TURN OFF IN PRODUCTION)
===================================================== */
const DEBUG = false;
const log = (...args) => DEBUG && console.log(...args);

document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     🚪 DOOR ICON DYNAMIC IMAGES
  ===================================================== */
  const IMG_OPEN = "assets/images/door-open.png";
  const IMG_CLOSED = "assets/images/door-closed.png";

  const doorStates = { D1: "open", D2: "closed" };

  document.querySelectorAll(".door-item").forEach(item => {
    const id = item.dataset.door;
    const state = doorStates[id] || "closed";

    const imgEl = item.querySelector(".door-img");
    const stateEl = item.querySelector(".door-state");
    if (!imgEl || !stateEl) return;

    if (state === "open") {
       console.log('open');
      imgEl.src = IMG_OPEN;
      stateEl.textContent = "Open";
      stateEl.style.color = "#ea580c";
    } else {
         console.log('close');
      imgEl.src = IMG_CLOSED;
      stateEl.textContent = "Closed";
      stateEl.style.color = "#16a34a";
    }
  });

  function updateDoor(doorId, isOpen) {
    const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
    if (!item) return;

    const imgEl = item.querySelector(".door-img");
    const stateEl = item.querySelector(".door-state");
    if (!imgEl || !stateEl) return;

    imgEl.src = isOpen ? IMG_OPEN : IMG_CLOSED;
    stateEl.textContent = isOpen ? "Open" : "Closed";
    stateEl.style.color = isOpen ? "#ea580c" : "#16a34a";
  }

  /* =====================================================
     📈 MINI TELEMETRY CHARTS (FIXED)
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

      const width =
        this.canvas.parentElement?.clientWidth || 240; // 🔑 fallback
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
      const y = (v, max) =>
        padding.top + innerH - (v / max) * innerH;

      ctx.strokeStyle = "rgba(229,229,222,0.5)";
      ctx.setLineDash([2, 2]);

      for (let i = 0; i <= 4; i++) {
        const gx = padding.left + (innerW * i) / 4;
        const gy = padding.top + (innerH * i) / 4;

        ctx.beginPath();
        ctx.moveTo(gx, padding.top);
        ctx.lineTo(gx, padding.top + innerH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padding.left, gy);
        ctx.lineTo(padding.left + innerW, gy);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const drawSeries = (arr, color, max) => {
        if (!arr.length) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        arr.forEach((v, i) => {
          i === 0 ? ctx.moveTo(x(i), y(v, max)) : ctx.lineTo(x(i), y(v, max));
        });
        ctx.stroke();

        ctx.fillStyle = color;
        arr.forEach((v, i) => {
          ctx.beginPath();
          ctx.arc(x(i), y(v, max), 4, 0, Math.PI * 2);
          ctx.fill();
        });
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
     🔄 DEMO DATA (REMOVE WHEN SIGNALR ACTIVE)
  ===================================================== */
  setInterval(() => {
    telemetryCharts.forEach(chart => {
      if (chart.isAnomaly) {
        chart.pushPoint(20 + Math.random() * 20, 0);
      } else {
        chart.pushPoint(
          16 + Math.random() * 4,
          70 + Math.random() * 10
        );
      }
    });
  }, 3000);

  /* =====================================================
     🚪 CALIBRATED DOOR LOGIC
  ===================================================== */
  const DOOR_MAP = {
    D1: { open: false },
    D2: { open: true }
  };

  function renderDoor(doorId) {
    const item = document.querySelector(`[data-door="${doorId}"]`);
    if (!item) return;

    const img = item.querySelector(".door-img");
    const text = item.querySelector(".door-state");
    if (!img || !text) return;

    if (DOOR_MAP[doorId].open) {
      img.src = IMG_OPEN;
      text.textContent = "Open · Alarm";
      text.className = "door-state alert";
    } else {
      img.src = IMG_CLOSED;
      text.textContent = "Closed · Normal";
      text.className = "door-state ok";
    }
  }

  Object.keys(DOOR_MAP).forEach(renderDoor);
});
