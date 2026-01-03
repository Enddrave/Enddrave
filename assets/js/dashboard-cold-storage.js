/* =====================================================
   📈 MINI TELEMETRY CHARTS (FIXED CANVAS – DEVICE INDEPENDENT)
===================================================== */
class MiniTelemetryChart {
  constructor(canvas) {

    /* ---------- FIXED RENDER SIZE ---------- */
    const FIXED_WIDTH = 600;
    const FIXED_HEIGHT = 260;

    // Parent container controls scaling
    const wrapper = canvas.parentElement;
    wrapper.style.height = "190px";
    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "center";
    wrapper.style.alignItems = "center";
    wrapper.style.overflow = "hidden";

    // Hard-lock canvas resolution
    canvas.width = FIXED_WIDTH;
    canvas.height = FIXED_HEIGHT;
    canvas.style.width = FIXED_WIDTH + "px";
    canvas.style.height = FIXED_HEIGHT + "px";

    // Scale canvas visually to fit container
    const scale = wrapper.clientWidth / FIXED_WIDTH;
    canvas.style.transform = `scale(${scale})`;
    canvas.style.transformOrigin = "top center";

    window.addEventListener("resize", () => {
      const newScale = wrapper.clientWidth / FIXED_WIDTH;
      canvas.style.transform = `scale(${newScale})`;
    });

    /* ---------- CHART ---------- */
    this.chart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature (°C)",
            data: [],
            borderColor: "#f97316",
            borderWidth: 4,
            pointRadius: 4,
            pointHoverRadius: 5,
            tension: 0.15,
            fill: false
          },
          {
            label: "Humidity (%)",
            data: [],
            borderColor: "#2563eb",
            borderWidth: 4,
            pointRadius: 4,
            pointHoverRadius: 5,
            tension: 0.15,
            fill: false
          }
        ]
      },
      options: {
        responsive: false, // 🔴 CRITICAL
        animation: false,
        devicePixelRatio: 1,

        layout: {
          padding: { top: 18, bottom: 10, left: 10, right: 10 }
        },

        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "center",
            labels: {
              boxWidth: 36,
              boxHeight: 12,
              padding: 20,
              font: {
                size: 14,
                weight: "600"
              }
            }
          }
        },

        scales: {
          x: {
            ticks: {
              maxTicksLimit: 6,
              minRotation: 45,
              maxRotation: 45,
              font: { size: 12 }
            },
            grid: { drawBorder: false }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 30,
              font: { size: 12 }
            },
            grid: { drawBorder: false }
          }
        }
      }
    });
  }

  pushPoint(temp, hum) {
    const time = new Date().toLocaleTimeString();

    const d = this.chart.data;
    d.labels.push(time);
    d.datasets[0].data.push(temp);
    d.datasets[1].data.push(hum);

    if (d.labels.length > 12) {
      d.labels.shift();
      d.datasets.forEach(ds => ds.data.shift());
    }

    this.chart.update("none");
  }
}
