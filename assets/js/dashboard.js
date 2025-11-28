// --- 1️⃣ Start SignalR using the Azure Function negotiate endpoint ---
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

    // Correctly receive URL & accessToken from backend
    let { url, accessToken } = await resp.json();
    console.log("Negotiation success. URL:", url);
    console.log("Received accessToken:", accessToken);

    // --- Create SignalR connection ---
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken, // 🔹 Now correctly using real JWT
        transport: signalR.HttpTransportType.WebSockets,
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

// --- 3️⃣ Update UI ---
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
