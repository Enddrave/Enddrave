import azure.functions as func
import logging
import json
import os
from azure.cosmos import CosmosClient

app = func.FunctionApp()

# Get Cosmos DB Connection from Application Settings
COSMOS_DB_CONN = os.environ["COSMOS_DB_CONN"]
client = CosmosClient.from_connection_string(COSMOS_DB_CONN)

db = client.get_database_client("IoTDashboardDB")
container = db.get_container_client("Telemetry")


@app.event_hub_message_trigger(
    arg_name="azeventhub",
    event_hub_name="iothub-ehub-enddrave-i-56095012-983ee8b344",
    connection="myiothubnamespace_RootManageSharedAccessKey_EVENTHUB"  
)
def eventhub_trigger(azeventhub: func.EventHubEvent):
    try:
        body = azeventhub.get_body().decode("utf-8")
        logging.info(f"Event received: {body}")

        # Parse incoming data
        data = json.loads(body)

        # If no 'id' exists, generate one to avoid conflicts
        if "id" not in data:
            from uuid import uuid4
            data["id"] = str(uuid4())

        # Insert/Update data in Cosmos DB
        container.upsert_item(data)
        logging.info("Data inserted into Cosmos DB successfully!")

    except Exception as e:
        logging.error(f"Error processing event: {e}")

