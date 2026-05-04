{
  "name": "MedicalReview",
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "title": "ID Session"
    },
    "doctor_id": {
      "type": "string",
      "title": "ID M\u00e9decin"
    },
    "doctor_name": {
      "type": "string",
      "title": "Nom m\u00e9decin"
    },
    "note": {
      "type": "string",
      "title": "Note clinique"
    },
    "validated_at": {
      "type": "string",
      "title": "Valid\u00e9 le"
    },
    "referral_needed": {
      "type": "boolean",
      "title": "Orientation n\u00e9cessaire"
    },
    "referral_hospital": {
      "type": "string",
      "title": "H\u00f4pital de r\u00e9f\u00e9rence"
    },
    "status": {
      "type": "string",
      "title": "Statut",
      "enum": [
        "en_attente",
        "valide",
        "corrige",
        "refere"
      ]
    }
  },
  "required": [
    "session_id",
    "status"
  ]
}