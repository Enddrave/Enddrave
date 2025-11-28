// Initialize SignalR connection using base Function URL
const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://fun-enddrave-vscode.azurewebsites.net/api", {  // 👈 correct URL
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

// DOM elements
const lastSeen = document.getElementById("lastSeen");
const anomalyScore = document.getElementById("anomalyScore");
const eventLog = document.getElementById("eventLog");
const stateDot = document.getElementById("stateDot");
const deviceIdField = document.getElementById("deviceId");
const locationField = document.getElementById("location");
const firmwareField = document.getElementById("firmware");

// Chart.js setup
const ctx = document.getElementById("telemetryChart").getContext("2d");
const data = { labels: [], datasets: [{ label: "Temperature (°C)", data: [], borderWidth: 2 }] };
const chart = new Chart(ctx, { type: 'line', data, options: { animation: false } });

// Handle incoming telemetry
connection.on("newTelemetry", (msg) => {
    const data = msg?.arguments?.[0];
    if (!data) return console.warn("⚠ Invalid telemetry message:", msg);

    console.log("📡 Live Telemetry:", data);

    const now = new Date(data.ts || new Date());
    chart.data.labels.push(now.toLocaleTimeString());
    chart.data.datasets[0].data.push(data.temperature);

    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update();

    lastSeen.textContent = now.toLocaleTimeString();
    anomalyScore.textContent = data.anomalyScore !== undefined ? `${data.anomalyScore}%` : "--";
    stateDot.className = `dot ${data.status === "online" ? "green" : "red"}`;
    deviceIdField.textContent = data.deviceId || "--";
    locationField.textContent = data.location || "--";
    firmwareField.textContent = data.firmwareVersion || "--";

    const li = document.createElement("li");
    li.textContent = `${now.toLocaleTimeString()} | Device: ${data.deviceId} | Temp: ${data.temperature}°C | Humidity: ${data.humidity}%`;
    eventLog.prepend(li);
});

// Start SignalR connection
connection.start()
    .then(() => console.log("🟢 SignalR connected successfully 🚀"))
    .catch(err => console.error("❌ SignalR connection failed", err));
