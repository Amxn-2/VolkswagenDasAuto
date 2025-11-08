# Configuration settings

# Thresholds for object detection
DETECTION_THRESHOLDS = {
    # Road hazard model thresholds (yolov12.pt)
    "class_0": 0.35,  # Pothole
    "class_1": 0.65,  # Speedbump
    
    # Standard object detection thresholds (yolov8n.pt)
    "person": 0.50,   # Person
    "dog": 0.50,      # Dog
    "cow": 0.50       # Cow
}

# Default camera index
DEFAULT_CAMERA = 2

# Distance estimation parameters
DISTANCE_ESTIMATION = {
    "focal_length": 1000,  # Approximate focal length in pixels
    "known_width": {
        "person": 0.5,     # Average width of a person in meters
        "dog": 0.4,        # Average width of a dog in meters
        "cow": 0.8         # Average width of a cow in meters
    }
}

# MQTT Configuration
import os
from dotenv import load_dotenv
load_dotenv()

MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", None)
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", None)
MQTT_CLIENT_ID = os.getenv("MQTT_CLIENT_ID", "hazard-eye-backend")
MQTT_ENABLED = os.getenv("MQTT_ENABLED", "false").lower() == "true"

# Geofence Configuration
GEOFENCE_DEFAULT_RADIUS = float(os.getenv("GEOFENCE_DEFAULT_RADIUS", "5000"))  # 5km default