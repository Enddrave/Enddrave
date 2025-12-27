// =====================================================
// 📊 Chart.js Setup
// =====================================================
const ctx = document.getElementById("telemetryChart").getContext("2d");

const telemetryChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Temperature (°C)",
        data: [],
        borderWidth: 2,
        borderColor: "#ff5733",
        fill: false,
        tension: 0.3,
      },
      {
        label: "Humidity (%)",
        data: [],
        borderWidth: 2,
        borderColor: "#007bff",
        fill: false,
        tension: 0.3,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: "Time" } },
      y: { title: { display: true, text: "Value" }, min: 0, max: 100 },
    },
  },
});

// =====================================================
// 🔧 Helper: Always pick Sensor 0
// =====================================================
function getSensor0(data) {
  if (!data?.dht22 || data.dht22.length === 0) return null;
  return data.dht22.find(s => s.id === 0) || null;
}

// =====================================================
// 🟠 Device Offline Logic
// =====================================================
let deviceTimeout;
const OFFLINE_THRESHOLD = 15000;

function markDeviceOffline() {
  console.warn("⚠ Device marked OFFLINE");

  const stateDot = document.getElementById("stateDot");
  if (stateDot) {
    stateDot.className = "dot red";
    stateDot.nextSibling.textContent = " Offline";
  }

  [
    "deviceId",
    "location",
    "firmware",
    "lastSeen",
    "temperature",
    "humidity",
    "anomalyScore",
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "--";
  });
}

function resetDeviceTimer() {
  clearTimeout(deviceTimeout);
  deviceTimeout = setTimeout(markDeviceOffline, OFFLINE_THRESHOLD);
}

// =====================================================
// 🌐 SignalR Connection
// =====================================================
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

    registerHandlers(connection);
    await connection.start();
    console.log("🟢 SignalR Connected");
  } catch (err) {
    console.error("❌ SignalR Error:", err);
  }
}

// =====================================================
// 📡 Register Incoming Telemetry
// =====================================================
function registerHandlers(connection) {
  connection.on("newTelemetry", (data) => {
    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload) return;

    resetDeviceTimer();

    updateTelemetryUI(payload);
    updateChart(payload);
    logEvent(payload);
  });
}

// =====================================================
// 🖥️ Device Status (Sensor 0)
// =====================================================
function updateTelemetryUI(data) {
  const sensor0 = getSensor0(data);
  if (!sensor0) return;

  document.getElementById("deviceId").textContent = data.deviceId || "--";
  document.getElementById("location").textContent = data.location || "--";
  document.getElementById("firmware").textContent =
    data.firmwareVersion || "--";

  document.getElementById("anomalyScore").textContent =
    sensor0.anomaly !== undefined ? `${sensor0.anomaly}%` : "--";

  const stateDot = document.getElementById("stateDot");
  stateDot.className = "dot green";
  stateDot.nextSibling.textContent = " Online";

  document.getElementById("lastSeen").textContent =
    data.ts ? new Date(data.ts * 1000).toLocaleTimeString() : "--";

  document.getElementById("temperature").textContent =
    `${sensor0.temperature.toFixed(1)} °C`;

  document.getElementById("humidity").textContent =
    `${sensor0.humidity.toFixed(1)} %`;
}

// =====================================================
// 📈 Telemetry Chart (Sensor 0)
// =====================================================
function updateChart(data) {
  const sensor0 = getSensor0(data);
  if (!sensor0) return;

  const timestamp = new Date(data.ts * 1000).toLocaleTimeString();

  telemetryChart.data.labels.push(timestamp);
  telemetryChart.data.datasets[0].data.push(sensor0.temperature);
  telemetryChart.data.datasets[1].data.push(sensor0.humidity);

  if (telemetryChart.data.labels.length > 15) {
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets[0].data.shift();
    telemetryChart.data.datasets[1].data.shift();
  }

  telemetryChart.update();
}

// =====================================================
// 📝 Event Log (ONLY Sensor 0)
// =====================================================
function logEvent(data) {
  const log = document.getElementById("eventLog");
  const sensor0 = getSensor0(data);
  if (!sensor0) return;

  const item = document.createElement("li");
  item.innerHTML = `
    <strong>${new Date(data.ts * 1000).toLocaleTimeString()}</strong> —
    Sensor 0 →
    Temp: ${sensor0.temperature}°C,
    Humidity: ${sensor0.humidity}%,
    Anomaly: ${sensor0.anomaly}%
  `;

  log.prepend(item);
}

// =====================================================
// 💡 Command Buttons (UI only)
// =====================================================
document.getElementById("ledOn").addEventListener("click", () => {
  logCommand("LED turned ON");
});

document.getElementById("ledOff").addEventListener("click", () => {
  logCommand("LED turned OFF");
});

document.getElementById("simulateOta").addEventListener("click", () => {
  logCommand("Simulated OTA update started...");
});

function logCommand(msg) {
  const timestamp = new Date().toLocaleTimeString();

  const log = document.getElementById("eventLog");
  const item = document.createElement("li");
  item.innerHTML = `<strong>${timestamp}</strong> — ${msg}`;
  log.prepend(item);

  const cmdBox = document.getElementById("commandBox");
  if (cmdBox) {
    const cmdMsg = document.createElement("p");
    cmdMsg.textContent = `${timestamp} — ${msg}`;
    cmdBox.prepend(cmdMsg);
  }
}

// =====================================================
// 🚀 Init
// =====================================================
markDeviceOffline();
startSignalR();
resetDeviceTimer();
