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
    animation: false,
    scales: {
      x: { title: { display: true, text: "Time" } },
      y: { title: { display: true, text: "Value" }, min: 0, max: 100 },
    },
  },
});

// =====================================================
// 🔧 Helpers
// =====================================================
function getSensor0(data) {
  if (!data?.dht22 || !Array.isArray(data.dht22)) return null;
  return data.dht22.find(s => s.id === 0) || null;
}

function safeText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "--";
}

// =====================================================
// 🟠 Device Offline Logic
// =====================================================
let deviceTimeout;
let lastTelemetryTs = 0;
const OFFLINE_THRESHOLD = 20000;

function markDeviceOffline() {
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
  ].forEach(id => safeText(id, "--"));
}

function resetDeviceTimer() {
  clearTimeout(deviceTimeout);
  deviceTimeout = setTimeout(markDeviceOffline, OFFLINE_THRESHOLD);
}

// =====================================================
// 🌐 SignalR (MOBILE SAFE)
// =====================================================
let connection = null;
let reconnectTimer = null;

async function startSignalR() {
  try {
    if (connection) {
      await connection.stop();
      connection = null;
    }

    const resp = await fetch(
      "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate",
      { cache: "no-store" }
    );

    if (!resp.ok) throw new Error("Negotiate failed");

    const { url, accessToken } = await resp.json();

    connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken,
        transport: signalR.HttpTransportType.LongPolling, // 🔑 mobile safe
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    registerHandlers(connection);
    registerLifecycle(connection);

    await connection.start();
    console.log("🟢 SignalR Connected");
  } catch (err) {
    console.error("❌ SignalR start failed:", err);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startSignalR();
  }, 5000);
}

// =====================================================
// 🔄 Connection Lifecycle
// =====================================================
function registerLifecycle(conn) {
  conn.onreconnecting(() => {
    console.warn("🟠 SignalR reconnecting...");
  });

  conn.onreconnected(() => {
    console.log("🟢 SignalR reconnected");
    resetDeviceTimer();
  });

  conn.onclose(() => {
    console.error("🔴 SignalR closed");
    markDeviceOffline();
    scheduleReconnect();
  });
}

// =====================================================
// 📡 Telemetry Handler
// =====================================================
function registerHandlers(conn) {
  conn.on("newTelemetry", (data) => {
    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload || !payload.ts) return;

    lastTelemetryTs = Date.now();
    resetDeviceTimer();

    updateTelemetryUI(payload);
    updateChart(payload);
    logEvent(payload);
  });
}

// =====================================================
// 🖥️ Device Status
// =====================================================
function updateTelemetryUI(data) {
  const sensor0 = getSensor0(data);
  if (!sensor0) return;

  safeText("deviceId", data.deviceId);
  safeText("location", data.location);
  safeText("firmware", data.firmwareVersion);
  safeText("lastSeen", new Date(data.ts * 1000).toLocaleTimeString());
  safeText("temperature", `${sensor0.temperature.toFixed(1)} °C`);
  safeText("humidity", `${sensor0.humidity.toFixed(1)} %`);
  safeText("anomalyScore", `${sensor0.anomaly}%`);

  const stateDot = document.getElementById("stateDot");
  if (stateDot) {
    stateDot.className = "dot green";
    stateDot.nextSibling.textContent = " Online";
  }
}

// =====================================================
// 📈 Chart Update
// =====================================================
function updateChart(data) {
  const sensor0 = getSensor0(data);
  if (!sensor0) return;

  telemetryChart.data.labels.push(
    new Date(data.ts * 1000).toLocaleTimeString()
  );
  telemetryChart.data.datasets[0].data.push(sensor0.temperature);
  telemetryChart.data.datasets[1].data.push(sensor0.humidity);

  if (telemetryChart.data.labels.length > 20) {
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets.forEach(d => d.data.shift());
  }

  telemetryChart.update("none");
}

// =====================================================
// 📝 Event Log (auto-scroll)
// =====================================================
function logEvent(data) {
  const log = document.getElementById("eventLog");
  const sensor0 = getSensor0(data);
  if (!sensor0 || !log) return;

  const li = document.createElement("li");
  li.innerHTML = `
    <strong>${new Date(data.ts * 1000).toLocaleTimeString()}</strong> —
    Sensor 0 → Temp: ${sensor0.temperature}°C,
    Humidity: ${sensor0.humidity}%,
    Anomaly: ${sensor0.anomaly}%
  `;

  log.prepend(li);
  log.scrollTop = 0;
}

// =====================================================
// 💓 Heartbeat Watchdog (CRITICAL)
// =====================================================
setInterval(() => {
  if (Date.now() - lastTelemetryTs > OFFLINE_THRESHOLD) {
    markDeviceOffline();
  }
}, 5000);

// =====================================================
// 📱 Mobile Visibility Handling
// =====================================================
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    console.log("👁️ Tab active → ensure connection");
    startSignalR();
  }
});

// =====================================================
// 🚀 Init
// =====================================================
markDeviceOffline();
startSignalR();
resetDeviceTimer();
