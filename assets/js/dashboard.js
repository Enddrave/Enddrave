
// Simulated Azure IoT telemetry for demo
const ctx = document.getElementById('telemetryChart');
if(ctx){
  const data = { labels: [], datasets: [{ label:'Temp °C', data: []}] };
  const chart = new Chart(ctx, { type:'line', data, options:{responsive:true, animation:false}});
  const eventLog = document.getElementById('eventLog');
  const cmdLog = document.getElementById('cmdLog');
  const lastSeen = document.getElementById('lastSeen');
  const anomalyScore = document.getElementById('anomalyScore');

  function logEvent(msg){
    const li = document.createElement('li'); li.textContent = new Date().toLocaleTimeString()+ ' — ' + msg;
    eventLog.prepend(li);
  }

    // --- Smooth Winter Temperature Simulation (~19°C) ---
  let baseTemp = 19;    // target winter indoor temperature
  let drift = 0;        // slow heater/cooling drift

  setInterval(()=>{
    const t = new Date();
    data.labels.push(t.toLocaleTimeString());

    // tiny natural noise (±0.05°C)
    const microNoise = (Math.random() * 0.1 - 0.05);

    // slow drift (±0.02°C)
    drift += (Math.random() * 0.04 - 0.02);
    drift = Math.max(-0.3, Math.min(0.3, drift));  // drift limit

    // final temperature (smooth variation)
    const next = +(baseTemp + drift + microNoise).toFixed(2);

    data.datasets[0].data.push(next);

    if(data.labels.length > 30){
      data.labels.shift();
      data.datasets[0].data.shift();
    }

    chart.update('none');

    lastSeen.textContent = t.toLocaleTimeString();
    const score = Math.round(Math.abs(next - baseTemp) * 10);
    anomalyScore.textContent = score + '%';
  }, 1500);


  document.getElementById('ledOn')?.addEventListener('click', ()=>{ cmdLog.textContent += 'LED ON sent\n'; logEvent('Command: LED ON'); });
  document.getElementById('ledOff')?.addEventListener('click', ()=>{ cmdLog.textContent += 'LED OFF sent\n'; logEvent('Command: LED OFF'); });
  document.getElementById('simulateOta')?.addEventListener('click', ()=>{ cmdLog.textContent += 'OTA start...\n'; logEvent('OTA Update simulated'); });
}
