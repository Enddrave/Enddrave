document.addEventListener("DOMContentLoaded", () => {

  // =====================================================
  // 📊 Chart.js Setup
  // =====================================================
  const canvas = document.getElementById("telemetryChart");

  if (!canvas) {
    console.warn("⚠ telemetryChart canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  const telemetryChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Temperature (°C)",
          data: [],
          borderWidth: 2,
          borderColor: "#ff5733",
          fill: false,
          tension: 0.3,
        },
        {
          label: "Humidity (%)",
          data: [],
          borderWidth: 2,
          borderColor: "#007bff",
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: "Time" } },
        y: { title: { display: true, text: "Value" }, min: 0, max: 100 },
      },
    },
  });

  // =====================================================
  // 🔧 Helper: Pick Primary Sensor
  // =====================================================
  function getPrimarySensor(data, preferredId = 0) {
    if (!data?.dht22 || data.dht22.length === 0) return null;
    return data.dht22.find(s => s.id === preferredId) || data.dht22[0];
  }

  // =====================================================
  // 📈 Update Telemetry Chart
  // =====================================================
  function updateChart(data) {
    const sensor = getPrimarySensor(data);
    if (!sensor) return;

    const timestamp = new Date(data.ts * 1000).toLocaleTimeString();

    telemetryChart.data.labels.push(timestamp);
    telemetryChart.data.datasets[0].data.push(sensor.temperature);
    telemetryChart.data.datasets[1].data.push(sensor.humidity);

    if (telemetryChart.data.labels.length > 15) {
      telemetryChart.data.labels.shift();
      telemetryChart.data.datasets[0].data.shift();
      telemetryChart.data.datasets[1].data.shift();
    }

    telemetryChart.update();
  }

  // =====================================================
  // 🌐 SignalR Connection
  // =====================================================
  async function startSignalR() {
    try {
      const resp = await fetch(
        "https://fun-enddrave-vscode.azurewebsites.net/api/negotiate"
      );

      if (!resp.ok) {
        console.error("❌ /negotiate failed");
        return;
      }

      const { url, accessToken } = await resp.json();

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      connection.on("newTelemetry", (data) => {
        const payload = Array.isArray(data) ? data[0] : data;
        if (!payload) return;

        updateChart(payload);
      });

      await connection.start();
      console.log("🟢 SignalR Connected");

    } catch (err) {
      console.error("❌ SignalR Error:", err);
    }
  }

  startSignalR();
});
