// =====================================================
// 📊 Chart.js Setup
// =====================================================
let telemetryChart = null;

function initializeChart() {
  const canvas = document.getElementById("telemetryChart");
  if (!canvas) {
    console.error("❌ Canvas element 'telemetryChart' not found");
    return;
  }
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("❌ Failed to get 2d context from canvas");
    return;
  }

  telemetryChart = new Chart(ctx, {
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
  
  console.log("✅ Telemetry chart initialized");
}

// =====================================================
// 🔧 Helper: Pick Primary Sensor (ID 0 default)
// =====================================================
function getPrimarySensor(data, preferredId = 0) {
  if (!data?.dht22 || data.dht22.length === 0) return null;
  return data.dht22.find(s => s.id === preferredId) || data.dht22[0];
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
// 🖥️ Update Device Status UI
// =====================================================
function updateTelemetryUI(data) {
  const sensor = getPrimarySensor(data);
  if (!sensor) return;

  document.getElementById("deviceId").textContent = data.deviceId || "--";
  document.getElementById("location").textContent = data.location || "--";
  document.getElementById("firmware").textContent =
    data.firmwareVersion || "--";

  document.getElementById("anomalyScore").textContent =
    sensor.anomaly !== undefined ? `${sensor.anomaly}%` : "--";

  const stateDot = document.getElementById("stateDot");
  stateDot.className = "dot green";
  stateDot.nextSibling.textContent = " Online";

  document.getElementById("lastSeen").textContent =
    data.ts ? new Date(data.ts * 1000).toLocaleTimeString() : "--";

  document.getElementById("temperature").textContent =
    `${sensor.temperature.toFixed(1)} °C`;

  document.getElementById("humidity").textContent =
    `${sensor.humidity.toFixed(1)} %`;
}

// =====================================================
// 📈 Update Telemetry Chart
// =====================================================
function updateChart(data) {
  if (!telemetryChart) {
    console.warn("⚠ Chart not initialized yet, skipping update");
    return;
  }
  
  const sensor = getPrimarySensor(data);
  if (!sensor) return;

  const timestamp = new Date(data.ts * 1000).toLocaleTimeString();

  telemetryChart.data.labels.push(timestamp);
  telemetryChart.data.datasets[0].data.push(sensor.temperature);
  telemetryChart.data.datasets[1].data.push(sensor.humidity);

  if (telemetryChart.data.labels.length > 15) {
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets[0].data.shift();
    telemetryChart.data.datasets[1].data.shift();
  }

  telemetryChart.update();
}

// =====================================================
// 📝 Event Log (AUTO-SCROLL ADDED – PREPEND SAFE)
// =====================================================
// =====================================================
// 📝 Event Log (FORCE AUTO-SCROLL TO TOP)
// =====================================================
function logEvent(data) {
  const log = document.getElementById("eventLog");
  if (!log) return;

  data.dht22.forEach(sensor => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${new Date(data.ts * 1000).toLocaleTimeString()}</strong> —
      Sensor ${sensor.id} →
      Temp: ${sensor.temperature}°C,
      Humidity: ${sensor.humidity}%,
      Anomaly: ${sensor.anomaly}%
    `;
    log.prepend(item);
  });

  // ✅ FORCE scroll to top on every new event
  log.scrollTop = 0;
}

// =====================================================
// 💡 Command Buttons (UI-only)
// =====================================================
function initializeCommandButtons() {
  const ledOnBtn = document.getElementById("ledOn");
  const ledOffBtn = document.getElementById("ledOff");
  const simulateOtaBtn = document.getElementById("simulateOta");

  if (ledOnBtn) {
    ledOnBtn.addEventListener("click", () => {
      logCommand("LED turned ON");
    });
  }

  if (ledOffBtn) {
    ledOffBtn.addEventListener("click", () => {
      logCommand("LED turned OFF");
    });
  }

  if (simulateOtaBtn) {
    simulateOtaBtn.addEventListener("click", () => {
      logCommand("Simulated OTA update started...");
    });
  }
  
  console.log("✅ Command buttons initialized");
}

function logCommand(msg) {
  const timestamp = new Date().toLocaleTimeString();

  // Command Center box
  const cmdBox = document.getElementById("commandBox");
  if (!cmdBox) return;

  const cmdMsg = document.createElement("p");
  cmdMsg.textContent = `${timestamp} — ${msg}`;

  // Latest command at top
  cmdBox.prepend(cmdMsg);

  // ✅ FORCE auto-scroll to top
  cmdBox.scrollTop = 0;
}

// =====================================================
// 🚀 Init
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
  console.log("📱 Dashboard initializing...");
  initializeChart();
  initializeCommandButtons();
  markDeviceOffline();
  startSignalR();
  resetDeviceTimer();
});

// Fallback initialization if DOMContentLoaded already fired
if (document.readyState === 'loading') {
  // Do nothing, DOMContentLoaded will handle it
} else {
  // DOM already loaded
  console.log("📱 Dashboard initializing (DOM already ready)...");
  initializeChart();
  initializeCommandButtons();
  markDeviceOffline();
  startSignalR();
  resetDeviceTimer();
}
