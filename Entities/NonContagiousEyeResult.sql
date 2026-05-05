{
  "name": "NonContagiousEyeResult",
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "title": "ID Session"
    },
    "cataract": {
      "type": "number",
      "title": "Cataracte (%)"
    },
    "pterygion": {
      "type": "number",
      "title": "Pt\u00e9rygion (%)"
    },
    "uveitis": {
      "type": "number",
      "title": "Uv\u00e9ite (%)"
    },
    "jaundice": {
      "type": "number",
      "title": "Jaunisse oculaire (%)"
    },
    "myopia": {
      "type": "number",
      "title": "Myopie (%)"
    },
    "glaucoma": {
      "type": "number",
      "title": "Glaucome (%)"
    },
    "diabetic_retinopathy": {
      "type": "number",
      "title": "R\u00e9tinopathie diab\u00e9tique (%)"
    }
  },
  "required": [
    "session_id"
  ]
}