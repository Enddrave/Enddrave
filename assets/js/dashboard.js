
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

  setInterval(()=>{
    const t = new Date();
    data.labels.push(t.toLocaleTimeString());
    const last = data.datasets[0].data.slice(-1)[0] || 26;
    const next = +(last + (Math.random()*2 - 1)).toFixed(2);
    data.datasets[0].data.push(next);
    if(data.labels.length > 30){ data.labels.shift(); data.datasets[0].data.shift(); }
    chart.update('none');
    lastSeen.textContent = t.toLocaleTimeString();
    const score = Math.max(0, Math.min(100, Math.round(Math.abs(next-26)*12)));
    anomalyScore.textContent = score + '%';
    if(score>70) logEvent('Anomaly detected at ' + next + '°C');
  }, 1500);

  document.getElementById('ledOn')?.addEventListener('click', ()=>{ cmdLog.textContent += 'LED ON sent\n'; logEvent('Command: LED ON'); });
  document.getElementById('ledOff')?.addEventListener('click', ()=>{ cmdLog.textContent += 'LED OFF sent\n'; logEvent('Command: LED OFF'); });
  document.getElementById('simulateOta')?.addEventListener('click', ()=>{ cmdLog.textContent += 'OTA start...\n'; logEvent('OTA Update simulated'); });
}
