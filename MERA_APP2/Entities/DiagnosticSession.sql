{
  "name": "DiagnosticSession",
  "type": "object",
  "properties": {
    "patient_id": {
      "type": "string",
      "title": "ID Patient"
    },
    "agent_id": {
      "type": "string",
      "title": "ID Agent"
    },
    "device_id": {
      "type": "string",
      "title": "ID Appareil MERA"
    },
    "health_center_id": {
      "type": "string",
      "title": "ID Centre"
    },
    "urgency_level": {
      "type": "string",
      "title": "Niveau d'urgence",
      "enum": [
        "CRITIQUE",
        "ELEVE",
        "MODERE",
        "NORMAL"
      ]
    },
    "status": {
      "type": "string",
      "title": "Statut",
      "enum": [
        "en_cours",
        "termine",
        "en_attente_revue",
        "revue_complete"
      ]
    },
    "sync_status": {
      "type": "string",
      "title": "Statut sync",
      "enum": [
        "synced",
        "pending",
        "error"
      ]
    },
    "vocal_transcript": {
      "type": "string",
      "title": "Transcription vocale"
    },
    "patient_name": {
      "type": "string",
      "title": "Nom patient"
    },
    "patient_age": {
      "type": "number",
      "title": "\u00c2ge patient"
    },
    "patient_sex": {
      "type": "string",
      "title": "Sexe patient"
    },
    "recommendations": {
      "type": "string",
      "title": "Recommandations"
    },
    "session_date": {
      "type": "string",
      "title": "Date de session"
    }
  },
  "required": [
    "patient_id",
    "urgency_level",
    "status"
  ]
}