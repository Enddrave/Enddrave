// --- 1️⃣ Start SignalR using the Azure Function negotiate endpoint ---
async function startSignalR() {
  try {
    // Call your Function App negotiate endpoint
    const resp = await fetch(
      "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
    );

    if (!resp.ok) {
      console.error("❌ HTTP error calling /api/negotiate:", resp.status);
      console.error(await resp.text());
      return;
    }

    // Must be: { url: ".../client/?hub=telemetryHub", accessToken: "JWT..." }
    const { url, accessToken } = await resp.json();
    console.log("Negotiation success:", url);
    console.log("AaccessToken:", accessToken);
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        // This token MUST be a valid SignalR JWT generated on the server
        accessTokenFactory: () => accessToken,
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: false, // SignalR JS will call {url}/negotiate
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

// --- 3️⃣ Update UI (same as you already have) ---
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

// --- 4️⃣ Kick off connection ---
startSignalR();
