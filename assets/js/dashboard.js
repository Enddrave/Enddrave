// === 📊 Chart.js Setup ===
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
        tension: 0.4,
      },
      {
        label: "Humidity (%)",
        data: [],
        borderWidth: 2,
        borderColor: "#007bff",
        fill: false,
        tension: 0.4,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false, // 📱 Better mobile layout
    animation: {
      duration: 300,  // ⚡ Smoother live updates
    },
    scales: {
      x: {
        title: { display: true, text: "Time" },
        ticks: { maxTicksLimit: 10, autoSkip: true },
      },
      y: {
        title: { display: true, text: "Value" },
        min: 0,
        max: 100,
      },
    },
  },
});

// 🌐 1️⃣ Initialize SignalR (MOBILE SAFE 🚀)
async function startSignalR() {
  try {
    console.log("🚀 Starting SignalR negotiation...");

    const resp = await fetch("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate");

    if (!resp.ok) {
      console.error("❌ Error calling /api/negotiate:", resp.status);
      console.error(await resp.text());
      return;
    }

    const { url, accessToken } = await resp.json();
    console.log("🔗 Negotiation successful:", url);

    // 📱 Transport fallback enabled (MOBILE FIX)
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken,
        transport: signalR.HttpTransportType.WebSockets, // Prefers WebSocket
        // 🚫 REMOVED skipNegotiation:true to allow fallback to SSE/LongPolling
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // 🛠 Mobile disconnect & reconnect logs
    connection.onclose((err) => console.warn("⚠ Connection closed:", err));
    connection.onreconnecting((err) => console.log("🔄 Reconnecting...", err));
    connection.onreconnected(() => console.log("🟢 Reconnected successfully"));

    registerHandlers(connection);
    await connection.start();
    console.log("🟢 SignalR Connected Successfully 🚀");
  } catch (err) {
    console.error("❌ Failed to establish SignalR connection:", err);
  }
}

// 📡 2️⃣ Register live listener
function registerHandlers(connection) {
  console.log("🔔 Registering SignalR Handler");

  connection.on("newTelemetry", (data) => {
    console.log("📥 Raw SignalR Packet:", data);

    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload) return console.warn("⚠ Empty telemetry payload received");

    console.log("📡 Live Telemetry Parsed:", payload);

    updateTelemetryUI(payload);
    logEvent(payload);
    updateChart(payload);
  });
}

// 🖥️ 3️⃣ Update Device Status
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

// 📈 4️⃣ Update Chart.js in real time
function updateChart(data) {
  const timestamp = new Date(data.ts).toLocaleTimeString();

  telemetryChart.data.labels.push(timestamp);
  telemetryChart.data.datasets[0].data.push(data.temperature);
  telemetryChart.data.datasets[1].data.push(data.humidity);

  if (telemetryChart.data.labels.length > 20) {  // Show last 20 points
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets[0].data.shift();
    telemetryChart.data.datasets[1].data.shift();
  }

  telemetryChart.update();
}

// 📝 5️⃣ Event Log
function logEvent(data) {
  const log = document.getElementById("eventLog");
  const item = document.createElement("li");
  item.innerHTML = `
    <strong>${new Date(data.ts).toLocaleTimeString()}</strong> — 
    Temp: ${data.temperature}°C, Humidity: ${data.humidity}%, Anomaly: ${data.anomalyScore}%
  `;
  log.prepend(item);
}

startSignalR();
