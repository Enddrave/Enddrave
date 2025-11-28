// --- 1️⃣ Start SignalR using negotiate endpoint ---
async function startSignalR() {
  try {
    const resp = await fetch("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate");

    if (!resp.ok) {
      console.error("❌ HTTP error calling /api/negotiate:", resp.status);
      console.error(await resp.text());
      return;
    }

    let { url, accessToken } = await resp.json();
    console.log("Negotiation success. Raw URL:", url);
    console.log("Received accessToken:", accessToken);

    // --- 🛠 Fix URL for WebSocket (remove negotiate & change to wss://) ---
    url = url.replace("/negotiate", "").replace("https://", "wss://");
    console.log("Final WebSocket URL:", url);

    // ---  Create the SignalR Connection ---
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken,
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true, // 🚀 IMPORTANT!
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    registerHandlers(connection);

    // --- Start connection ---
    await connection.start();
    console.log("🟢 SignalR Connected via WebSocket 🚀");
  } catch (err) {
    console.error("❌ Failed to start SignalR:", err);
  }
}

// --- 2️⃣ Register handler for telemetry messages ---
function registerHandlers(connection) {
  connection.on("newTelemetry", (msg) => {
    const data = msg?.arguments?.[0];
    if (!data) {
      console.warn("⚠ No data in SignalR message:", msg);
      return;
    }
    console.log("📡 Live Telemetry:", data);
    updateTelemetryUI(data);
  });
}

// --- 3️⃣ Update UI elements ---
function updateTelemetryUI(data) {
  const {
    temperature,
    humidity,
    ts,
    status,
    deviceId,
    anomalyScore,
    firmwareVersion,
    location,
  } = data;

  document.getElementById("deviceId").textContent = deviceId || "--";
  document.getElementById("location").textContent = location || "--";
  document.getElementById("firmware").textContent = firmwareVersion || "--";
  document.getElementById("anomalyScore").textContent =
    anomalyScore !== undefined ? `${anomalyScore}%` : "--";

  document.getElementById("stateDot").className =
    `dot ${status === "online" ? "green" : "red"}`;

  document.getElementById("lastSeen").textContent =
    ts ? new Date(ts).toLocaleTimeString() : "--";
}

// --- 4️⃣ Initialize SignalR connection ---
startSignalR();
