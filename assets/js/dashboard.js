// === 📊 0️⃣ Chart.js Setup ===
const ctx = document.getElementById("telemetryChart").getContext("2d");

const telemetryChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [], // timestamps
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

// === 🟠 Device Offline Logic ===
let deviceTimeout;
const OFFLINE_THRESHOLD = 15000; // 15 sec

function markDeviceOffline() {
  console.warn("⚠ Device marked OFFLINE (no telemetry received)");

  const stateDot = document.getElementById("stateDot");
  if (stateDot) {
    stateDot.className = "dot red";
    stateDot.nextSibling.textContent = " Offline";
  }

  const fields = [
    "deviceId",
    "location",
    "firmware",
    "lastSeen",
    "temperature",
    "humidity",
    "anomalyScore",
  ];

  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "-";
  });
}

// Reset timer when telemetry arrives
function resetDeviceTimer() {
  clearTimeout(deviceTimeout);
  deviceTimeout = setTimeout(markDeviceOffline, OFFLINE_THRESHOLD);
}

// 🌐 SignalR Connection
async function startSignalR() {
  try {
    const resp = await fetch("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate");
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

// 📡 Register incoming telemetry
function registerHandlers(connection) {

  connection.on("newTelemetry", (data) => {
    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload) return;

    resetDeviceTimer(); // received telemetry → online

    updateTelemetryUI(payload);
    logEvent(payload);
    updateChart(payload);
  });
}

// 🖥️ Update UI with telemetry
function updateTelemetryUI(data) {

  console.log(data);
  document.getElementById("deviceId").textContent = data.deviceId || "--";
  document.getElementById("location").textContent = data.location || "--";
  document.getElementById("firmware").textContent = data.firmwareVersion || "--";
  document.getElementById("anomalyScore").textContent =
  data.anomalyScore !== undefined ? `${data.anomalyScore}%` : "--";
  const stateDot = document.getElementById("stateDot");
  if (stateDot) {
    stateDot.className = "dot green";
    stateDot.nextSibling.textContent = " Online";
  }

  document.getElementById("lastSeen").textContent =
    data.ts ? new Date(data.ts).toLocaleTimeString() : "--";

  document.getElementById("temperature").textContent =
    data.temperature !== undefined ? `${data.temperature} °C` : "--";

  document.getElementById("humidity").textContent =
    data.humidity !== undefined ? `${data.humidity}%` : "--";
}

// === 📈 Update Graph with Live Data ===
function updateChart(data) {
  const timestamp = new Date(data.ts).toLocaleTimeString();

  telemetryChart.data.labels.push(timestamp);
  telemetryChart.data.datasets[0].data.push(data.temperature);
  telemetryChart.data.datasets[1].data.push(data.humidity);

  if (telemetryChart.data.labels.length > 15) {
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets[0].data.shift();
    telemetryChart.data.datasets[1].data.shift();
  }

  telemetryChart.update();
}

// === 📝 Append telemetry to Event Log ===
function logEvent(data) {
console.log('event log');
console.log(data);
const log = document.getElementById("eventLog");
const item = document.createElement("li");
data.dht22.forEach(sensor => {
  item.innerHTML = `
   <h3>DHT22 Sensor ${sensor.id}</h3>
   <strong>${new Date(data.ts).toLocaleTimeString()}</strong> —
    Temp: ${sensor.temperature}°C, Humidity: ${sensor.humidity}%, Anomaly: ${sensor.anomaly}%
  `;
  console.log(item);
  container.appendChild(item);
});
}

// === 💡 Command Buttons (Dummy Actions) ===
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

  // 💬 1️⃣ Show in Event Log (existing behavior)
  const log = document.getElementById("eventLog");
  const item = document.createElement("li");
  item.innerHTML = `<strong>${timestamp}</strong> — ${msg}`;
  log.prepend(item);

  // 🪟 2️⃣ Also show in Command Center window (NEW)
  const cmdBox = document.getElementById("commandBox");
  if (cmdBox) {
    const cmdMsg = document.createElement("p");
    cmdMsg.textContent = `${timestamp} — ${msg}`;
    cmdBox.prepend(cmdMsg);
  }
}
// 🚀 On page load — default to offline
markDeviceOffline();
startSignalR();
resetDeviceTimer();
