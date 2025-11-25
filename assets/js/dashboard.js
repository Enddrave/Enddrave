// Initialize SignalR connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://<your-functionapp>.azurewebsites.net/api")
    .withAutomaticReconnect()
    .build();

connection.on("newTelemetry", (msg) => {
  console.log("Live Data:", msg);

  const t = new Date();
  const next = msg.id;     // <-- temperature from Azure IoT via SignalR

  data.labels.push(t.toLocaleTimeString());
  data.datasets[0].data.push(next);

  if(data.labels.length > 30){
    data.labels.shift();
    data.datasets[0].data.shift();
  }

  chart.update('none');

  lastSeen.textContent = t.toLocaleTimeString();

  const score = Math.round(Math.abs(next - baseTemp) * 10);
  anomalyScore.textContent = score + '%';

  logEvent(`Live Update: ${next}°C`);
});

// Start connection
connection.start().then(() => {
    console.log("SignalR Connected");
}).catch(err => console.error(err));
