{
  "name": "EyePhoto",
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "title": "ID Session"
    },
    "photo_url": {
      "type": "string",
      "title": "URL Photo"
    },
    "analyzed_by": {
      "type": "string",
      "title": "Analys\u00e9 par",
      "enum": [
        "tflite",
        "claude",
        "fusion"
      ]
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