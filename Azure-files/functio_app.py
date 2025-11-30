import azure.functions as func
import logging
import json
import os
from azure.cosmos import CosmosClient
from uuid import uuid4

app = func.FunctionApp()

# ---------------------- Cosmos DB Setup ----------------------
COSMOS_DB_CONN = os.environ["COSMOS_DB_CONN"]
client = CosmosClient.from_connection_string(COSMOS_DB_CONN)
db = client.get_database_client("IoTDashboardDB")
container = db.get_container_client("Telemetry")


# 🚀 1️⃣ EVENT HUB TRIGGER — Save to Cosmos DB and Broadcast via SignalR
@app.function_name(name="eventhub_trigger")
@app.event_hub_message_trigger(
    arg_name="azeventhub",
    event_hub_name="iothub-ehub-enddrave-i-56095012-983ee8b344",
    connection="myiothubnamespace_RootManageSharedAccessKey_EVENTHUB"
)
@app.generic_output_binding(
    arg_name="signalRMessages",              # 👈 name of the output binding param
    type="signalR",                          # 👈 binding type for SignalR
    hubName="hub",                           # 👈 MUST match your hub name
    connectionStringSetting="AzureSignalRConnectionString"
)
def eventhub_trigger(
    azeventhub: func.EventHubEvent,
    signalRMessages: func.Out[str]          # 👈 outgoing message as JSON string
):
    try:
        body = azeventhub.get_body().decode("utf-8")
        logging.info(f"📥 Event received from Event Hub: {body}")

        data = json.loads(body)

        # Ensure Cosmos DB has an id field
        if "id" not in data:
            data["id"] = str(uuid4())

        # Store telemetry to Cosmos DB
        container.upsert_item(data)
        logging.info("💾 Telemetry upserted into Cosmos DB")

        # Build SignalR payload (must match what JS expects)
        signalr_payload = json.dumps({
            "target": "newTelemetry",   # 👈 JS listens on this
            "arguments": [data]         # 👈 will arrive as array in JS
        })

        # Send to SignalR via generic output binding
        signalRMessages.set(signalr_payload)
        logging.info("📡 Telemetry broadcasted to SignalR clients via binding")

    except Exception as e:
        logging.error(f"❌ Error in eventhub_trigger: {e}")


# 🚪 2️⃣ NEGOTIATE FUNCTION — Provides URL & access token to frontend
@app.function_name(name="negotiate")
@app.route(route="negotiate", auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_input_binding(
    arg_name="connectionInfo",
    type="signalRConnectionInfo",
    hubName="hub",  # 👈 MUST match the hubName above
    connectionStringSetting="AzureSignalRConnectionString"
)
def negotiate(req: func.HttpRequest, connectionInfo: str) -> func.HttpResponse:
    """
    connectionInfo comes from the SignalRConnectionInfo input binding and is a JSON string like:
    { "url": "...", "accessToken": "..." }
    We reshape it slightly for the frontend JS.
    """
    info = json.loads(connectionInfo)

    return func.HttpResponse(
        json.dumps({
            "url": info["url"],
            "accessToken": info["accessToken"]
        }),
        mimetype="application/json"
    )
