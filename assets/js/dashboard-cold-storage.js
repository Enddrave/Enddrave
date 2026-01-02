
/* =====================================================
 🚪 DOOR CONFIG (LIVE FROM SIGNALR)
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

  const img = item.querySelector(".door-img");
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
 📊 MINI TELEMETRY CHARTS (LIVE DATA)
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
    const t = new Date().toLocaleTimeString();
    this.data.labels.push(t);
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

    const x = i => pad.left + (iw * i) / (this.data.labels.length - 1 || 1);
    const y = (v, max) => pad.top + ih - (v / max) * ih;

    const drawSeries = (arr, color, max) => {
      if (!arr.length) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      arr.forEach((v, i) => i ? ctx.lineTo(x(i), y(v, max)) : ctx.moveTo(x(i), y(v, max)));
      ctx.stroke();
    };

    drawSeries(this.data.temp, "#ea580c", tempMax);
    drawSeries(this.data.hum, "#0f766e", humMax);
  }
}

const telemetryCharts = [];
document.querySelectorAll(".telemetry-chart").forEach(c => {
  telemetryCharts.push(new MiniTelemetryChart(c));
});

/* =====================================================
 🌐 SIGNALR (NEGOTIATE + LIVE DATA)
===================================================== */
async function startSignalR() {
  try {
    const res = await fetch(
      "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
    );
    if (!res.ok) throw new Error("Negotiate failed");

    const { url, accessToken } = await res.json();

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .build();

    connection.on("newTelemetry", handleTelemetry);
    await connection.start();

    console.log("🟢 SignalR Connected");
  } catch (err) {
    console.error("❌ SignalR error:", err);
  }
}

/* =====================================================
 📡 TELEMETRY HANDLER (DOORS + CHARTS)
===================================================== */
function handleTelemetry(data) {
  const payload = Array.isArray(data) ? data[0] : data;
  if (!payload) return;

  // ----- Doors -----
  if (Array.isArray(payload.doors)) {
    payload.doors.forEach(d => updateDoor(d.id, d.state === 1));
  }
  if ("door1" in payload) updateDoor("D1", payload.door1 === 1);
  if ("door2" in payload) updateDoor("D2", payload.door2 === 1);

  // ----- Temperature / Humidity -----
  if (payload.dht22 && payload.dht22.length) {
    const s = payload.dht22[0];
    telemetryCharts.forEach(chart => {
      chart.pushPoint(s.temperature, s.humidity);
    });
  }
}

/* =====================================================
 🚀 INIT
===================================================== */
startSignalR();

