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

  // Set dot to RED and show "Offline"
  const stateDot = document.getElementById("stateDot");
  if (stateDot) {
    stateDot.className = "dot red";
    stateDot.nextSibling.textContent = " Offline"; // Assumes: <span id="stateDot"></span> Online
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
    if (el) el.textContent = "NOT AVAILABLE";
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
  document.getElementById("deviceId").textContent = data.deviceId || "--";
  document.getElementById("location").textContent = data.location || "--";
  document.getElementById("firmware").textContent = data.firmwareVersion || "--";
  document.getElementById("anomalyScore").textContent =
    data.anomalyScore !== undefined ? `${data.anomalyScore}%` : "--";

  // Set dot to green and change status to Online
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

// === Chart Update, Event Log & Start SignalR ===

// 🚀 On page load — set default state
markDeviceOffline(); // 👈 Default state: red, offline, Not Available

startSignalR();
resetDeviceTimer(); // Start timeout watcher
