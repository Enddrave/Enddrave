// --- 1️⃣ Get negotiate URL & start SignalR ---
async function startSignalR() {
  try {
    // Call Azure Function → /api/negotiate
    const resp = await fetch("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate");

    if (!resp.ok) {
      throw new Error("Negotiate HTTP error: " + resp.status);
    }

    const { url, accessToken } = await resp.json();
    console.log("🔐 Negotiation success:", url);

    // Create SignalR connection using returned URL
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken || "",
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: false
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    registerHandlers(connection);

    await connection.start();
    console.log("🟢 SignalR Connected 🚀");
  } catch (err) {
    console.error("❌ Failed to start SignalR:", err);
  }
}

// --- 2️⃣ Register message listener (newTelemetry) ---
function registerHandlers(connection) {
  connection.on("newTelemetry", (msg) => {
    const data = msg?.arguments?.[0];
    if (!data) return console.warn("⚠ No data in message:", msg);

    console.log("📡 Live Telemetry:", data);

    updateTelemetryUI(data);
  });
}

// --- 3️⃣ Update dashboard UI ---
function updateTelemetryUI(data) {
  const {
    temperature,
    humidity,
    ts,
    status,
    deviceId,
    anomalyScore,
    firmwareVersion,
    location
  } = data;

  // Update UI fields
  document.getElementById("deviceId").textContent = deviceId || "--";
  document.getElementById("location").textContent = location || "--";
  document.getElementById("firmware").textContent = firmwareVersion || "--";
  document.getElementById("anomalyScore").textContent = anomalyScore + "%" || "--";

  document.getElementById("stateDot").className =
    `dot ${status === "online" ? "green" : "red"}`;

  document.getElementById("lastSeen").textContent =
    new Date(ts).toLocaleTimeString();
}

// --- 4️⃣ Start connection ---
startSignalR();
