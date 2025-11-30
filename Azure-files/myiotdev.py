import random
import time
import json
import uuid
from datetime import datetime, timedelta
from azure.iot.device import IoTHubDeviceClient, Message, exceptions

# Azure IoT Hub Device Connection String
CONNECTION_STRING = "HostName=Enddrave-IoT-hub.azure-devices.net;DeviceId=enddrave-iot-device-01;SharedAccessKey=SE/QUav4E4msg3UpN1ngfqsu1vYjF+Itck+YvhckMSM="

# Create client with keepalive for stability
client = IoTHubDeviceClient.create_from_connection_string(CONNECTION_STRING)
client.connect()

def generate_machine_data():
    temperature = round(random.uniform(22, 32), 2)
    humidity = round(random.uniform(35, 85), 2)
    anomaly_score = round(abs(temperature - 27) * 4.5, 2)

    # Convert current time to IST (UTC + 5:30)
    ist_time = datetime.utcnow() + timedelta(hours=5, minutes=30)

    data = {
        "id": str(uuid.uuid4()),               # Cosmos DB ID
        "deviceId": "ENV-NODE-01",            # Matches frontend and dashboard
        "location": "Factory Lab - Gurugram", # UI field
        "firmwareVersion": "v1.0.3",
        "temperature": temperature,
        "humidity": humidity,
        "status": "online",
        "anomalyScore": anomaly_score,
        "ts": ist_time.isoformat(),           # 👈 Correct IST timestamp
        "ledState": "off",
        "otaStatus": "idle",
        "lastCommand": None
    }
    return data

def send_to_azure(data):
    try:
        message = Message(json.dumps(data))
        message.content_encoding = "utf-8"
        message.content_type = "application/json"
        client.send_message(message)
        print(f"📡 [{data['ts']}] Telemetry sent:", data)

    except exceptions.ConnectionFailedError:
        print("⚠ Connection failed. Reconnecting…")
        reconnect()

    except Exception as e:
        print(f"❌ Error sending message: {e}")

def reconnect():
    try:
        client.disconnect()
    except:
        pass
    time.sleep(2)
    client.connect()
    print("🔄 Reconnected to Azure IoT Hub.")

# 📡 Main Device Telemetry Loop
if __name__ == "__main__":
    print("🚀 Sending telemetry every 10 seconds...\n")
    
    while True:
        telemetry = generate_machine_data()
        send_to_azure(telemetry)
        time.sleep(1)
