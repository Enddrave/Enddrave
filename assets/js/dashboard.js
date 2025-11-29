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

    // 🧬 Build SignalR connection with negotiated URL
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken,
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register message handlers
    registerHandlers(connection);

    // Start live connection
    await connection.start();
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

    // If data comes as [ { ... } ] unpack it
    const payload = Array.isArray(data) ? data[0] : data;

    if (!payload) {
      console.warn("⚠ Empty telemetry payload received");
      return;
    }

    console.log("📡 Live Telemetry Parsed:", payload);
    updateTelemetryUI(payload);
    logEvent(payload);
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
