// Global connection so other code can see it if needed
let connection;

// --- 1️⃣ Get SignalR URL from Azure Function and start connection ---
async function startSignalR() {
  try {
    // Call your Azure Function negotiate endpoint
    const resp = await fetch(
      "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
    );

    if (!resp.ok) {
      throw new Error("Negotiate HTTP error: " + resp.status);
    }

    const { url, accessToken } = await resp.json();
    console.log("🔐 Negotiate response:", url, accessToken);

    // Build SignalR connection to the REAL SignalR service URL
    connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        // you can keep this, even if accessToken is empty
        accessTokenFactory: () => accessToken || "",
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: false,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    registerHandlers();

    await connection.start();
    console.log("🟢 SignalR Connected 🚀");
  } catch (err) {
    console.error("❌ Failed to start SignalR:", err);
  }
}

// --- 2️⃣ DOM elements ---
const lastSeen = document.getElementById("lastSeen");
const anomalyScore = document.getElementById("anomalyScore");
const eventLog = document.getElementById("eventLog");
const stateDot = document.getElementById("stateDot");
const deviceIdField = document.getElementById("deviceId");
const locationField = document.getElementById("location");
const firmwareField = document.getElementById("firmware");

// --- 3️⃣ Chart.js setup ---
const ctx = document.getElementById("telemetryChart").getContext("2d");
const chartData = {
  labels: [],
  datasets: [
    {
      label: "Temperature (°C)",
      data: [],
      borderWidth: 2,
    },
  ],
};
const chart = new Chart(ctx, {
  type: "line",
  data: chartData,
  options: { animation: false },
});

// --- 4️⃣ Register SignalR handlers ---
function registerHandlers() {
  // This name MUST match "target": "newTelemetry" from your Function
  connection.on("newTelemetry", (msg) => {
    const data = msg?.arguments?.[0];
    if (!data) {
      console.warn("⚠ Invalid telemetry message:", msg);
      return;
    }

    console.log("📡 Live Telemetry:", data);

    const {
      temperature,
      humidity,
      ts,
      status,
      location,
      firmwareVersion,
      deviceId,
      anomalyScore: anomaly,
    } = data;

    // Update chart
    const now = new Date(ts || new Date());
    chart.data.labels.push(now.toLocaleTimeString());
    chart.data.datasets[0].data.push(temperature);

    if (chart.data.labels.length > 20) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.update();

    // Update UI
    lastSeen.textContent = now.toLocaleTimeString();
    anomalyScore.textContent = anomaly !== undefined ? `${anomaly}%` : "--";
    stateDot.className = `dot ${status === "online" ? "green" : "red"}`;
    deviceIdField.textContent = deviceId || "--";
    locationField.textContent = location || "--";
    firmwareField.textContent = firmwareVersion || "--";

    // Event log
    const li = document.createElement("li");
    li.textContent = `${now.toLocaleTimeString()} | Device: ${deviceId} | Temp: ${temperature}°C | Humidity: ${humidity}% | Status: ${status}`;
    eventLog.prepend(li);
  });
}

// --- 5️⃣ Kick everything off ---
startSignalR();
