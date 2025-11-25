import random
import time
import json
from azure.iot.device import IoTHubDeviceClient, Message

# Azure IoT Hub Device Connection String
CONNECTION_STRING = "HostName=Enddrave-IoT-hub.azure-devices.net;DeviceId=enddrave-iot-device-01;SharedAccessKey=SE/QUav4E4msg3UpN1ngfqsu1vYjF+Itck+YvhckMSM="

# Initialize the client
client = IoTHubDeviceClient.create_from_connection_string(CONNECTION_STRING)

import uuid

def generate_machine_data():
    data = {
        "id": str(uuid.uuid4()),  # Always string
        "deviceId": "enddrave-iot-device-02"  # String, matches partition key

    }
    return data

# Function to send data to Azure    
def send_to_azure(data):
    message = Message(json.dumps(data))
    message.content_encoding = "utf-8"
    message.content_type = "application/json"
    client.send_message(message)
    print("Data sent to Azure:", data)

# Main loop to send data every 10 seconds
if __name__ == "__main__":
    print("Sending machine data to Azure IoT Hub every 2 seconds...\n")
    
    while True:
        machine_data = generate_machine_data()
        send_to_azure(machine_data)
        time.sleep(10)
