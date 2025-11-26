// Initialize SignalR connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate") // 👈 MUST point to /negotiate
    .withAutomaticReconnect()
    .build();

// DOM elements
const lastSeen = document.getElementById("lastSeen");
const anomalyScore = document.getElementById("anomalyScore");
const eventLog = document.getElementById("eventLog");
const stateDot = document.getElementById("stateDot");

// Chart.js setup
const ctx = document.getElementById("telemetryChart").getContext("2d");
const data = {
  labels: [],
  datasets: [{
      label: "Temperature (℃)",
      data: [],
      borderWidth: 2
  }]
};

const chart = new Chart(ctx, {
  type: 'line',
  data,
  options: { animation: false }
});

// Receive SignalR live telemetry
connection.on("newTelemetry", (msg) => {
    console.log("Live Data:", msg);

    // Extract required fields
    const temperature = msg.temperature;
    const humidity = msg.humidity;
    const ts = msg.ts;
    const status = msg.status;
    const location = msg.location;
    const firmwareVersion = msg.firmwareVersion;
    const deviceId = msg.deviceId;
    const anomaly = msg.anomalyScore;

    // Update chart
    const now = new Date(ts || new Date());
    data.labels.push(now.toLocaleTimeString());
    data.datasets[0].data.push(temperature);

    if(data.labels.length > 20){
      data.labels.shift();
      data.datasets[0].data.shift();
    }
    chart.update();

    // Update Device Status section
    lastSeen.textContent = now.toLocaleTimeString();
    anomalyScore.textContent = `${anomaly}%`;
    stateDot.className = `dot ${status === "online" ? "green" : "red"}`;

    // Event Log
    const li = document.createElement("li");
    li.textContent = `${now.toLocaleTimeString()} - Temp: ${temperature}°C, Humidity: ${humidity}%`;
    eventLog.prepend(li);
});

// Start SignalR connection
connection.start()
  .then(() => console.log("SignalR Connected"))
  .catch(err => console.error("SignalR Connection Failed:", err));
