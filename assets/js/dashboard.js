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

// 🌐 1️⃣ Initialize SignalR connection using negotiated URL & access token
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
    console.log("🔗 Negotiation successful");
    console.log("URL:", url);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken,
        //transport: signalR.HttpTransportType.WebSockets,
        //skipNegotiation: true
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    registerHandlers(connection);
    await connection.start();
    console.log("Connected via:", connection.connection.transport.constructor.name);
alert("Transport used: " + connection.connection.transport.constructor.name);    

console.log("Checking if SignalR is loaded:", window.signalR);

if (!window.signalR) {
  alert("SignalR library is NOT loaded! (Blocked on mobile?)");
}

    
    console.log("🟢 SignalR Connected Successfully 🚀");
  } catch (err) {
    console.error("❌ Failed to establish SignalR connection:", err);
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
    updateChart(payload); // 👈 NEW LINE for real-time graph
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

// === 📈 3.1 NEW: Update Graph with Live Data ===
function updateChart(data) {
  const timestamp = new Date(data.ts).toLocaleTimeString();

  telemetryChart.data.labels.push(timestamp);
  telemetryChart.data.datasets[0].data.push(data.temperature);
  telemetryChart.data.datasets[1].data.push(data.humidity);

  // Limit data points to last 15 readings
  if (telemetryChart.data.labels.length > 15) {
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets[0].data.shift();
    telemetryChart.data.datasets[1].data.shift();
  }

  telemetryChart.update();
}

// 📝 4️⃣ Append data to Event Log
function logEvent(data) {
  const log = document.getElementById("eventLog");
  const item = document.createElement("li");

  item.innerHTML = `
    <strong>${new Date(data.ts).toLocaleTimeString()}</strong> — 
    Temp: ${data.temperature}°C, Humidity: ${data.humidity}%, Anomaly: ${data.anomalyScore}%
  `;

  log.prepend(item);
}

// 🚀 5️⃣ Kick off SignalR connection when page loads
startSignalR();
