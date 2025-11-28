// --- 1️⃣ Start SignalR using negotiated URL and JWT from Function App ---
async function startSignalR() {
  try {
    const resp = await fetch(
      "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
    );

    if (!resp.ok) {
      console.error("❌ HTTP error calling /api/negotiate:", resp.status);
      console.error(await resp.text());
      return;
    }

    // Get negotiated URL and JWT token from backend Azure Function
    const { url, accessToken } = await resp.json();
    console.log("Negotiation success. Raw URL:", url);
    console.log("Received accessToken:", accessToken);

    // --- Build SignalR connection using full negotiated URL ---
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken, // JWT passed to SignalR
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true // 🔹 We already negotiated on server
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


// --- 2️⃣ Register handlers for incoming IoT telemetry ---
function registerHandlers(connection) {
  connection.on("newTelemetry", (data) => {
    if (!data) {
      console.warn("⚠ No telemetry payload received");
      return;
    }
    console.log("📡 Live Telemetry Received:", data);
    updateTelemetryUI(data);
  });
}


// --- 3️⃣ Update UI with live telemetry ---
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


// --- 4️⃣ Kick off SignalR connection ---
startSignalR();
