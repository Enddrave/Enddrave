import random
import time
import json
import uuid
from datetime import datetime
from azure.iot.device import IoTHubDeviceClient, Message

# Azure IoT Hub Device Connection String
CONNECTION_STRING = "HostName=Enddrave-IoT-hub.azure-devices.net;DeviceId=enddrave-iot-device-01;SharedAccessKey=SE/QUav4E4msg3UpN1ngfqsu1vYjF+Itck+YvhckMSM="

client = IoTHubDeviceClient.create_from_connection_string(CONNECTION_STRING)

def generate_machine_data():
    temperature = round(random.uniform(18.5, 30.0), 2)
    humidity = round(random.uniform(40, 90), 2)
    anomaly_score = round(abs(temperature - 25) * 5, 2)  # Simple anomaly logic

    data = {
        "id": str(uuid.uuid4()),                         # Required for Cosmos DB
        "deviceId": "ENV-NODE-01",                       # Device name for UI & SignalR
        "temperature": temperature,                      # Live temperature
        "humidity": humidity,                            # Live humidity
        "firmwareVersion": "v1.0.3",                     # For dashboard UI
        "status": "online",                              # Device connectivity
        "ts": datetime.utcnow().isoformat(),             # Timestamp for chart/last seen
        "anomalyScore": anomaly_score,                   # AI Insight
        "location": "Factory Lab",                       # Optional metadata
        "ledState": "off",                               # Command Center feedback
        "otaStatus": "idle",                             # OTA status simulation
        "lastCommand": None                              # Placeholder if commands are used
    }
    return data


def send_to_azure(data):
    message = Message(json.dumps(data))
    message.content_encoding = "utf-8"
    message.content_type = "application/json"
    client.send_message(message)
    print("📡 Data sent to Azure:", data)

# Main Loop
if __name__ == "__main__":
    print("🚀 Sending device telemetry every 3 seconds...\n")
    
    while True:
        telemetry = generate_machine_data()
        send_to_azure(telemetry)
        time.sleep(2)
