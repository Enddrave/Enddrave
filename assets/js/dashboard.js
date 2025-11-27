// Initialize SignalR connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate") // MUST be /negotiate
    .withAutomaticReconnect()
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
const data = {
  labels: [],
  datasets: [{
      label: "Temperature (°C)",
      data: [],
      borderWidth: 2
  }]
};

const chart = new Chart(ctx, {
  type: 'line',
  data,
  options: { animation: false }
});

// Receive realtime telemetry
connection.on("newTelemetry", (msg) => {
    const data = msg.arguments && msg.arguments[0] ? msg.arguments[0] : null;
    if (!data) return console.warn("⚠ Invalid SignalR message received:", msg);

    console.log("📡 Live Data:", data);

    // Extract fields safely
    const {
        temperature,
        humidity,
        ts,
        status,
        location,
        firmwareVersion,
        deviceId,
        anomalyScore: anomaly
    } = data;

    // Update chart
    const now = new Date(ts || new Date());
    chart.data.labels.push(now.toLocaleTimeString());
    chart.data.datasets[0].data.push(temperature);

    if(chart.data.labels.length > 20){
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.update();

    // Update UI elements
    lastSeen.textContent = now.toLocaleTimeString();
    anomalyScore.textContent = anomaly !== undefined ? `${anomaly}%` : "--";
    stateDot.className = `dot ${status === "online" ? "green" : "red"}`;
    deviceIdField.textContent = deviceId || "--";
    locationField.textContent = location || "--";
    firmwareField.textContent = firmwareVersion || "--";

    // Event Log entry
    const li = document.createElement("li");
    li.textContent = `${now.toLocaleTimeString()} | Device: ${deviceId} | Temp: ${temperature}°C | Humidity: ${humidity}% | Status: ${status}`;
    eventLog.prepend(li);
});

// Start SignalR connection
connection.start()
  .then(() => console.log("SignalR Connected 🚀"))
  .catch(err => console.error("SignalR Connection Failed ❌", err));
