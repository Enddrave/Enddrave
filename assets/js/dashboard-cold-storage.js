/* =====================================================
   🔧 DEBUG FLAG (TURN OFF IN PRODUCTION)
===================================================== */
const DEBUG = false;
const log = (...args) => DEBUG && console.log(...args);

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
    log("Door open:", id);
    imgEl.src = IMG_OPEN;
    stateEl.textContent = "Open";
    stateEl.style.color = "#ea580c";
  } else {
    imgEl.src = IMG_CLOSED;
    stateEl.textContent = "Closed";
    stateEl.style.color = "#16a34a";
  }
});

function updateDoor(doorId, isOpen) {
  log("updateDoor:", doorId, isOpen);

  const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
  if (!item) return;

  const imgEl = item.querySelector(".door-img");
  const stateEl = item.querySelector(".door-state");
  if (!imgEl || !stateEl) return;

  if (isOpen) {
    imgEl.src = IMG_OPEN;
    stateEl.textContent = "Open";
    stateEl.style.color = "#ea580c";
  } else {
    imgEl.src = IMG_CLOSED;
    stateEl.textContent = "Closed";
    stateEl.style.color = "#16a34a";
  }
}

/* =====================================================
   📈 MINI TELEMETRY CHARTS
===================================================== */
class MiniTelemetryChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.maxPoints = 12;
    this.data = { labels: [], temp: [], hum: [] };
    this.isAnomaly = canvas.dataset.tag === "THD_ANOMALY";
    this.startTime = Date.now();
    this.init();
  }

  init() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = 120 * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  pushPoint(temp, hum) {
    log("pushPoint:", temp, hum);

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
    const w = this.canvas.clientWidth;
    const h = 120;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fbfbf7";
    ctx.fillRect(0, 0, w, h);

    const padding = { top: 15, right: 50, bottom: 25, left: 35 };
    const innerW = w - padding.left - padding.right;
    const innerH = h - padding.top - padding.bottom;

    const tempYMax = 30;
    const humYMax = 100;
    const anomalyYMax = 100;
    const xCount = Math.max(this.data.labels.length, 3);

    const valueToY = (v, max) =>
      padding.top + innerH - (v / max) * innerH;

    const indexToX = i =>
      padding.left + (innerW * i) / (xCount - 1);

    ctx.strokeStyle = "rgba(229,229,222,0.5)";
    ctx.setLineDash([2, 2]);

    for (let i = 0; i <= 4; i++) {
      const x = padding.left + (innerW * i) / 4;
      const y = padding.top + (innerH * i) / 4;

      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + innerH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + innerW, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const drawSeries = (arr, color, max) => {
      if (!arr.length) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      arr.forEach((v, i) => {
        const x = indexToX(i);
        const y = valueToY(v, max);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = color;
      arr.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(indexToX(i), valueToY(v, max), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    if (this.isAnomaly) {
      drawSeries(this.data.temp, "#ea580c", anomalyYMax);
    } else {
      drawSeries(this.data.temp, "#ea580c", tempYMax);
      drawSeries(this.data.hum, "#0f766e", humYMax);
    }

    const lx = w - 35;
    const ly = 8;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(lx - 5, ly - 2, 70, 32, 8);
    } else {
      ctx.rect(lx - 5, ly - 2, 70, 32);
    }
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();
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
   🔄 DEMO DATA (REMOVE WHEN SIGNALR ACTIVE)
===================================================== */
setInterval(() => {
  telemetryCharts.forEach(chart => {
    if (chart.isAnomaly) {
      chart.pushPoint(25 + Math.random() * 20, 0);
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
  log("renderDoor:", doorId);

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
