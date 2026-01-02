/* =====================================================
   📊 MINI TELEMETRY CHARTS
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

    const pad = { top: 15, right: 50, bottom: 25, left: 35 };
    const iw = w - pad.left - pad.right;
    const ih = h - pad.top - pad.bottom;

    const tempMax = 30;
    const humMax = 100;
    const anomalyMax = 100;

    const xCount = Math.max(this.data.labels.length, 3);

    const x = i => pad.left + (iw * i) / (xCount - 1);
    const y = (v, max) => pad.top + ih - (v / max) * ih;

    ctx.strokeStyle = "rgba(229,229,222,.5)";
    ctx.setLineDash([2, 2]);

    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(pad.left + (iw * i) / 4, pad.top);
      ctx.lineTo(pad.left + (iw * i) / 4, pad.top + ih);
      ctx.stroke();
    }

    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top + (ih * i) / 4);
      ctx.lineTo(pad.left + iw, pad.top + (ih * i) / 4);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    const drawSeries = (arr, color, max) => {
      if (!arr.length) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      arr.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v, max)) : ctx.moveTo(x(i), y(v, max))));
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

const telemetryCharts = [];
document.querySelectorAll(".telemetry-chart").forEach(c => telemetryCharts.push(new MiniTelemetryChart(c)));

/* =====================================================
   🚪 DOOR STATUS MODULE
===================================================== */

const DOOR_IMAGES = {
  open: "assets/images/door-open.png",
  closed: "assets/images/door-closed.png",
};

const DOOR_STATE = {
  D1: false,
  D2: false,
};

function renderDoor(doorId) {
  const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
  if (!item) return;

  const img = item.querySelector("img");
  const text = item.querySelector(".door-state");
  const open = DOOR_STATE[doorId];

  img.src = open ? DOOR_IMAGES.open : DOOR_IMAGES.closed;
  img.alt = `Door ${doorId} ${open ? "Open" : "Closed"}`;
  text.textContent = open ? "Open" : "Closed";
  text.className = `door-state ${open ? "alert" : "ok"}`;
}

function updateDoor(doorId, open) {
  if (!(doorId in DOOR_STATE)) return;
  DOOR_STATE[doorId] = Boolean(open);
  renderDoor(doorId);
}

document.addEventListener("DOMContentLoaded", () => {
  Object.keys(DOOR_STATE).forEach(renderDoor);
});

/* =====================================================
   🌐 AZURE SIGNALR (NEGOTIATE)
===================================================== */

let deviceTimeout;
const OFFLINE_THRESHOLD = 15000;

function resetDeviceTimer() {
  clearTimeout(deviceTimeout);
  deviceTimeout = setTimeout(() => {
    console.warn("⚠ Device OFFLINE");
  }, OFFLINE_THRESHOLD);
}

async function startSignalR() {
  try {
    const res = await fetch("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate");
    if (!res.ok) throw new Error("Negotiate failed");

    const { url, accessToken } = await res.json();

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .build();

    connection.on("newTelemetry", handleTelemetry);

    await connection.start();
    console.log("🟢 SignalR Connected");
  } catch (e) {
    console.error("❌ SignalR error", e);
  }
}

/* =====================================================
   📡 TELEMETRY HANDLER
===================================================== */

function handleTelemetry(data) {
  const payload = Array.isArray(data) ? data[0] : data;
  if (!payload) return;

  resetDeviceTimer();

  if (Array.isArray(payload.doors)) {
    payload.doors.forEach(d => updateDoor(d.id, d.state === 1));
  }

  if ("door1" in payload) updateDoor("D1", payload.door1 === 1);
  if ("door2" in payload) updateDoor("D2", payload.door2 === 1);

  telemetryCharts.forEach(c => {
    if (c.isAnomaly) {
      c.pushPoint(payload.anomaly || 0, 0);
    } else if (payload.dht22?.length) {
      c.pushPoint(payload.dht22[0].temperature, payload.dht22[0].humidity);
    }
  });
}

/* =====================================================
   🚀 INIT
===================================================== */

startSignalR();
resetDeviceTimer();
