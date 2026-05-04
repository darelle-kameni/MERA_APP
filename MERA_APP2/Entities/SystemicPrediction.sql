{
  "name": "SystemicPrediction",
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "title": "ID Session"
    },
    "disease": {
      "type": "string",
      "title": "Maladie"
    },
    "probability": {
      "type": "number",
      "title": "Probabilit\u00e9 (%)"
    },
    "severity": {
      "type": "string",
      "title": "Gravit\u00e9",
      "enum": [
        "critique",
        "eleve",
        "modere",
        "faible"
      ]
    },
    "trigger_factors": {
      "type": "string",
      "title": "Facteurs d\u00e9clencheurs"
    }
  },
  "required": [
    "session_id",
    "disease"
  ]
}