// 🌐 1️⃣ Initialize SignalR connection using negotiated URL & access token
async function startSignalR() {
  try {
    console.log("🚀 Starting SignalR negotiation...");

    const resp = await fetch(
      "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
    );

    if (!resp.ok) {
      console.error("❌ Error calling /api/negotiate:", resp.status);
      console.error(await resp.text());
      return;
    }

    const { url, accessToken } = await resp.json();
    console.log("🔗 Negotiation successful");
    console.log("URL:", url);
    console.log("AccessToken:", accessToken);


    console.log(" WebSocket "+signalR.HttpTransportType.WebSockets);
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

    console.log(" Connection Established  "+connection);
    // Register message handlers (SignalR targets)
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
  console.log("Register Handler");
  connection.on("newTelemetry", (data) => {
    console.log("Data");
    console.log(data);
    if (!data) {
      console.log("⚠ Empty telemetry payload received");
      return;
    }
    console.log("📡 Live Telemetry Received:", data);
    updateTelemetryUI(data);
  });
}

// 🖥️ 3️⃣ Update dashboard UI with real-time data
function updateTelemetryUI(data) {
  const {
    deviceId,
    location,
    firmwareVersion,
    anomalyScore,
    status,
    ts,
    temperature,
    humidity
  } = data;
console.log("DeviceID "+deviceId+"Location "+location+"FriemWare "+firmwareVersion);
  document.getElementById("deviceId").textContent = deviceId || "--";
  document.getElementById("location").textContent = location || "--";
  document.getElementById("firmware").textContent = firmwareVersion || "--";
  document.getElementById("anomalyScore").textContent =
    anomalyScore !== undefined ? `${anomalyScore}%` : "--";

  document.getElementById("stateDot").className =
    `dot ${status === "online" ? "green" : "red"}`;

  document.getElementById("lastSeen").textContent =
    ts ? new Date(ts).toLocaleTimeString() : "--";

  document.getElementById("temperature").textContent =
    temperature !== undefined ? `${temperature} °C` : "--";

  document.getElementById("humidity").textContent =
    humidity !== undefined ? `${humidity}%` : "--";
}

// 🚀 4️⃣ Kick off SignalR connection when page loads
startSignalR();
