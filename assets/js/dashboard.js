async function startSignalR() {
  try {
    const resp = await fetch("https://fun-enddrave-vscode.azurewebsites.net/api/negotiate");
    if (!resp.ok) {
      console.error("HTTP error:", resp.status);
      return;
    }

    let { url, accessToken } = await resp.json();
    console.log("Negotiated URL:", url);
    console.log("Received Token:", accessToken);

    // 🔹 Convert HTTPS to WSS (WebSocket protocol)
    url = url.replace("https://", "wss://");

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => accessToken,
        transport: signalR.HttpTransportType.WebSockets, // Force WebSockets
        skipNegotiation: true, // 🔥 Prevent negotiate call
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    registerHandlers(connection);

    await connection.start();
    console.log("🟢 SignalR Connected 🚀");
  } catch (err) {
    console.error("❌ Failed to start SignalR:", err);
  }
}

startSignalR();
