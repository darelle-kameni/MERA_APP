{
  "name": "Patient",
  "type": "object",
  "properties": {
    "qr_code": {
      "type": "string",
      "title": "Code QR"
    },
    "full_name": {
      "type": "string",
      "title": "Nom complet"
    },
    "age": {
      "type": "number",
      "title": "\u00c2ge"
    },
    "sex": {
      "type": "string",
      "title": "Sexe",
      "enum": [
        "M",
        "F"
      ]
    },
    "village": {
      "type": "string",
      "title": "Village"
    },
    "health_center_id": {
      "type": "string",
      "title": "ID Centre de sant\u00e9"
    },
    "is_pediatric": {
      "type": "boolean",
      "title": "Mode p\u00e9diatrique"
    }
  },
  "required": [
    "age",
    "sex"
  ]
}