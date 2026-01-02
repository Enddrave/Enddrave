

// -------- DOOR ICON DYNAMIC IMAGES --------
const IMG_OPEN = "assets/images/door-open.png";
const IMG_CLOSED = "assets/images/door-closed.png";

const doorStates = { D1: "open", D2: "closed" };

document.querySelectorAll(".door-item").forEach(item => {
const id = item.dataset.door;
const state = doorStates[id] || "closed";
const imgEl = item.querySelector(".door-img");
const stateEl = item.querySelector(".door-state");

if(state === "open"){
  console.log('open------');
imgEl.src = IMG_OPEN;
stateEl.textContent = "Open";
stateEl.style.color = "#ea580c";
}else{
imgEl.src = IMG_CLOSED;
stateEl.textContent = "Closed";
stateEl.style.color = "#16a34a";
}
});

function updateDoor(doorId, isOpen){
  console.log('updayteDoor');
const item = document.querySelector(`.door-item[data-door="${doorId}"]`);
if(!item) return;
const imgEl = item.querySelector(".door-img");
const stateEl = item.querySelector(".door-state");
if(isOpen){
imgEl.src = IMG_OPEN;
stateEl.textContent = "Open";
stateEl.style.color = "#ea580c";
}else{
imgEl.src = IMG_CLOSED;
stateEl.textContent = "Closed";
stateEl.style.color = "#16a34a";
}
}

// -------- CLEAN MINI TELEMETRY CHARTS - FIXED LEGEND POSITIONING --------
class MiniTelemetryChart {
constructor(canvas) {
this.canvas = canvas;
this.ctx = canvas.getContext('2d');
this.maxPoints = 12;
this.data = { labels: [], temp: [], hum: [] };
this.isAnomaly = canvas.dataset.tag === 'THD_ANOMALY';
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
  console.log('push point');
  const elapsed = Date.now() - this.startTime;
const minutes = Math.floor(elapsed / 60000);
const seconds = Math.floor((elapsed % 60000) / 1000);
const label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
this.data.labels.push(label);
this.data.temp.push(temp);
this.data.hum.push(hum);

if (this.data.labels.length > this.maxPoints) {
['labels','temp','hum'].forEach(k => this.data[k].shift());
}
this.draw();
}

draw() {
const ctx = this.ctx;
const w = this.canvas.clientWidth;
const h = 120;
ctx.clearRect(0,0,w,h);

// Background
ctx.fillStyle = '#fbfbf7';
ctx.fillRect(0,0,w,h);

// Clean padding - more chart space (increased right padding for legend)
const padding = {top:15, right:50, bottom:25, left:35};
const innerW = w - padding.left - padding.right;
const innerH = h - padding.top - padding.bottom;

// Scales
const tempYMax = 30;
const humYMax = 100;
const anomalyYMax = 100;

const xCount = Math.max(this.data.labels.length, 3);

// Value to Y position
const valueToY = (value, yMax) => {
return padding.top + innerH - (value / yMax) * innerH;
};

// Index to X position
const indexToX = (index) => {
return padding.left + (innerW * index / (xCount - 1));
};

// Light grid lines only (no labels)
ctx.strokeStyle = 'rgba(229, 229, 222, 0.5)';
ctx.lineWidth = 1;
ctx.setLineDash([2,2]);

// Vertical grid lines
for (let i = 0; i <= 4; i++) {
const x = padding.left + (innerW * i / 4);
ctx.beginPath();
ctx.moveTo(x, padding.top);
ctx.lineTo(x, padding.top + innerH);
ctx.stroke();
}

// Horizontal grid lines
for (let i = 0; i <= 4; i++) {
const y = padding.top + (innerH * i / 4);
ctx.beginPath();
ctx.moveTo(padding.left, y);
ctx.lineTo(padding.left + innerW, y);
ctx.stroke();
}
ctx.setLineDash([]);

// X-axis line only (no labels)
ctx.strokeStyle = '#e5e5de';
ctx.lineWidth = 1;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(padding.left, padding.top + innerH);
ctx.lineTo(padding.left + innerW, padding.top + innerH);
ctx.stroke();

// Draw data lines and points FIRST (before legend)
const drawSeries = (dataArray, color, yMax) => {
if (dataArray.length === 0) return;

ctx.strokeStyle = color;
ctx.lineWidth = 2.5;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.shadowBlur = 6;
ctx.shadowColor = color + '30';
ctx.beginPath();

dataArray.forEach((value, i) => {
const x = indexToX(i);
const y = valueToY(value, yMax);
if (i === 0) ctx.moveTo(x, y);
else ctx.lineTo(x, y);
});
ctx.shadowBlur = 0;
ctx.stroke();

// Data points
ctx.fillStyle = color;
ctx.shadowBlur = 8;
ctx.shadowColor = color + '50';
dataArray.forEach((value, i) => {
const x = indexToX(i);
const y = valueToY(value, yMax);
ctx.beginPath();
ctx.arc(x, y, 4, 0, Math.PI * 2);
ctx.fill();
});
ctx.shadowBlur = 0;
};

if (this.isAnomaly) {
drawSeries(this.data.temp, '#ea580c', anomalyYMax);
} else {
drawSeries(this.data.temp, '#ea580c', tempYMax);
drawSeries(this.data.hum, '#0f766e', humYMax);
}

// Color flags/legend (top right corner - CLEAN & VISIBLE with dedicated space)
const legendX = w - 35;
const legendY = 8;

// Legend background (white with subtle shadow for visibility)
ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
ctx.shadowColor = 'rgba(0,0,0,0.1)';
ctx.shadowBlur = 8;
ctx.shadowOffsetY = 2;
ctx.beginPath();
ctx.roundRect(legendX - 5, legendY - 2, 70, 32, 8);
ctx.fill();
ctx.shadowBlur = 0;

// Temperature flag (orange)
ctx.strokeStyle = '#ea580c';
ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(legendX, legendY + 4);
ctx.lineTo(legendX + 12, legendY + 4);
ctx.stroke();

ctx.fillStyle = '#ea580c';
ctx.shadowBlur = 4;
ctx.shadowColor = '#ea580c40';
ctx.beginPath();
ctx.arc(legendX - 2, legendY + 4, 3.5, 0, Math.PI * 2);
ctx.fill();
ctx.shadowBlur = 0;

ctx.fillStyle = '#111827';
ctx.font = 'bold 9px system-ui, sans-serif';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillText('Temp', legendX + 16, legendY + 4);

// Humidity flag (blue) - only for non-anomaly
if (!this.isAnomaly) {
ctx.strokeStyle = '#0f766e';
ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(legendX, legendY + 18);
ctx.lineTo(legendX + 12, legendY + 18);
ctx.stroke();

ctx.fillStyle = '#0f766e';
ctx.shadowBlur = 4;
ctx.shadowColor = '#0f766e40';
ctx.beginPath();
ctx.arc(legendX - 2, legendY + 18, 3.5, 0, Math.PI * 2);
ctx.fill();
ctx.shadowBlur = 0;

ctx.fillStyle = '#111827';
ctx.font = 'bold 9px system-ui, sans-serif';
ctx.fillText('Hum %', legendX + 16, legendY + 18);
}
}
}

const telemetryCharts = [];
document.querySelectorAll('.telemetry-chart').forEach(canvas => {
telemetryCharts.push(new MiniTelemetryChart(canvas));
});

// Demo data generation with proper time progression
setInterval(() => {
telemetryCharts.forEach(chart => {
if (chart.isAnomaly) {
const anomaly = 25 + Math.sin(Date.now() * 0.0001) * 20;
chart.pushPoint(Math.max(0, anomaly), 0);
} else {
const temp = 16 + Math.sin(Date.now() * 0.00005) * 4 + (Math.random() - 0.5) * 2;
const hum = 72 + Math.sin(Date.now() * 0.00007) * 8 + (Math.random() - 0.5) * 4;
chart.pushPoint(Math.max(0, temp), Math.max(0, Math.min(100, hum)));
}
});
}, 3000);

// Initialize charts with starting data
setTimeout(() => {
for (let i = 0; i < 6; i++) {
setTimeout(() => {
telemetryCharts.forEach(chart => {
if (chart.isAnomaly) {
chart.pushPoint(25 + Math.random() * 15, 0);
} else {
chart.pushPoint(16 + Math.random() * 3, 72 + Math.random() * 6);
}
});
}, i * 500);
}
}, 500);

// ===== CALIBRATED DOOR LOGIC =====
const DOOR_MAP = {
  D1: { open: false },
  D2: { open: true }
};

function renderDoor(doorId){
  console.log('render door');
                            
  const item = document.querySelector(`[data-door="${doorId}"]`);
  if(!item) return;

  const img = item.querySelector(".door-img");
  const text = item.querySelector(".door-state");

  if(DOOR_MAP[doorId].open){
    img.src = "door-open.png";
    text.textContent = "Open · Alarm";
    text.className = "door-state alert";
  } else {
    img.src = "door-closed.png";
    text.textContent = "Closed · Normal";
    text.className = "door-state ok";
  }
}

Object.keys(DOOR_MAP).forEach(renderDoor);
