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
    const data = msg.arguments[0]; // Correct extraction
    console.log("📡 Live Data:", data);

    // Extract fields
    const temperature = data.temperature;
    const humidity = data.humidity;
    const ts = data.ts;
    const status = data.status;
    const location = data.location;
    const firmwareVersion = data.firmwareVersion;
    const deviceId = data.deviceId;
    const anomaly = data.anomalyScore;

    // Update chart
    const now = new Date(ts || new Date());
    chart.data.labels.push(now.toLocaleTimeString());
    chart.data.datasets[0].data.push(temperature);

    // Keep max 20 points
    if(chart.data.labels.length > 20){
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.update();

    // Update UI section
    lastSeen.textContent = now.toLocaleTimeString();
    anomalyScore.textContent = `${anomaly}%`;
    s
