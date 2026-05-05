{
  "name": "VocalExchange",
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "title": "ID Session"
    },
    "speaker": {
      "type": "string",
      "title": "Locuteur",
      "enum": [
        "robot",
        "patient",
        "agent"
      ]
    },
    "transcript_text": {
      "type": "string",
      "title": "Texte transcrit"
    },
    "timestamp": {
      "type": "string",
      "title": "Horodatage"
    }
  },
  "required": [
    "session_id",
    "speaker",
    "transcript_text"
  ]
}