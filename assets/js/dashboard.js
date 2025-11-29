// === 📊 0️⃣ Chart.js Setup ===
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
        tension: 0.4,
        pointRadius: 3,
      },
      {
        label: "Humidity (%)",
        data: [],
        borderWidth: 2,
        borderColor: "#007bff",
        fill: false,
        tension: 0.4,
        pointRadius: 3,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 }, // smooth movement
    scales: {
      x: {
        title: { display: true, text: "Time" },
        ticks: { maxRotation: 45, minRotation: 45 },
      },
      y: {
        title: { display: true, text: "Value" },
        min: 10, // Prevents stretching
        max: 100,
        beginAtZero: false,
        ticks: { stepSize: 10 },
        grid: { drawBorder: true },
      },
    },
    plugins: {
      legend: { position: "top" },
      tooltip: { enabled: true },
    },
    elements: { point: { radius: 0 } },
  },
});

const connStatusEl = document.getElementById("connectionStatus");

// 🌐 1️⃣ Initialize SignalR connection using negotiated URL & access token
async function startSignalR() {
  try {
    console.log("🚀 Starting SignalR negotiation...");
    if (connStatusEl) connStatusEl.textContent = "Negotiating connection…";

    const resp = await fetch("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate");

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("❌ Error calling /api/negotiate:", resp.status, txt);
      if (connStatusEl) connStatusEl.textContent = "Negotiate failed: " + resp.status;
      return;
    }

    const { url, accessToken } = await resp.json();
    console.log("🔗 Negotiation successful");

    if (!window.signalR || !signalR.HubConnectionBuilder) {
      console.error("❌ SignalR JS not loaded (CDN blocked?)");
      if (connStatusEl) connStatusEl.textContent = "SignalR script not loaded";
      return;
    }

    // ⚠️ MOBILE-SAFE: No skipNegotiation, allow fallback to SSE/LongPolling
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.onclose(() => connStatusEl && (connStatusEl.textContent = "Disconnected"));
    connection.onreconnecting(() => connStatusEl && (connStatusEl.textContent = "Reconnecting…"));
    connection.onreconnected(() => connStatusEl && (connStatusEl.textContent = "Connected"));

    registerHandlers(connection);
    await connection.start();
    console.log("🟢 SignalR Connected Successfully 🚀");
    if (connStatusEl) connStatusEl.textContent = "Connected";
  } catch (err) {
    console.error("❌ Failed to establish SignalR connection:", err);
    if (connStatusEl) connStatusEl.textContent = "Connection error";
  }
}

// 📡 2️⃣ Register incoming telemetry handler
function registerHandlers(connection) {
  console.log("🔔 Registering SignalR Handler");

  connection.on("newTelemetry", (data) => {
    console.log("📥 Raw SignalR Packet:", data);

    const payload = Array.isArray(data) ? data[0] : data;

    if (!payload) {
      console.warn("⚠ Empty telemetry payload received");
      return;
    }

    console.log("📡 Live Telemetry Parsed:", payload);

    updateTelemetryUI(payload);
    logEvent(payload);
    updateChart(payload); // Add to graph
  });
}

// 🖥️ 3️⃣ Update dashboard UI with real-time data
function updateTelemetryUI(data) {
  document.getElementById("deviceId").textContent = data.deviceId || "--";
  document.getElementById("location").textContent = data.location || "--";
  document.getElementById("firmware").textContent = data.firmwareVersion || "--";
  document.getElementById("anomalyScore").textContent =
    data.anomalyScore !== undefined ? `${data.anomalyScore}%` : "--";

  document.getElementById("stateDot").className =
    `dot ${data.status === "online" ? "green" : "red"}`;

  document.getElementById("lastSeen").textContent =
    data.ts ? new Date(data.ts).toLocaleTimeString() : "--";

  document.getElementById("temperature").textContent =
    data.temperature !== undefined ? `${data.temperature} °C` : "--";

  document.getElementById("humidity").textContent =
    data.humidity !== undefined ? `${data.humidity}%` : "--";
}

// === 📈 3.1 Update Graph with Live Data ===
function updateChart(data) {
  const timestamp = new Date(data.ts).toLocaleTimeString();

  telemetryChart.data.labels.push(timestamp);
  telemetryChart.data.datasets[0].data.push(data.temperature);
  telemetryChart.data.datasets[1].data.push(data.humidity);

  if (telemetryChart.data.labels.length > 20) {
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets[0].data.shift();
    telemetryChart.data.datasets[1].data.shift();
  }

  telemetryChart.update("none"); // Prevents bouncing/jitter
}

// 📝 4️⃣ Append data to Event Log
function logEvent(data) {
  const log = document.getElementById("eventLog");
  if (!log) return;

  const item = document.createElement("li");
  item.innerHTML = `
    <strong>${new Date(data.ts).toLocaleTimeString()}</strong> — 
    Temp: ${data.temperature}°C, Humidity: ${data.humidity}%, Anomaly: ${data.anomalyScore}%
  `;
  log.prepend(item);
}

// 🚀 5️⃣ Kick off SignalR connection when page loads
startSignalR();
