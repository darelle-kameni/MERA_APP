{
  "name": "VitalSigns",
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "title": "ID Session"
    },
    "temperature": {
      "type": "number",
      "title": "Temp\u00e9rature (\u00b0C)"
    },
    "spo2": {
      "type": "number",
      "title": "SpO2 (%)"
    },
    "weight": {
      "type": "number",
      "title": "Poids (kg)"
    },
    "heart_rate": {
      "type": "number",
      "title": "Fr\u00e9quence cardiaque (bpm)"
    },
    "bmi": {
      "type": "number",
      "title": "IMC"
    },
    "timestamp": {
      "type": "string",
      "title": "Horodatage"
    }
  },
  "required": [
    "session_id"
  ]
}