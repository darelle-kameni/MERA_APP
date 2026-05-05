{
  "name": "TraditionalTreatment",
  "type": "object",
  "properties": {
    "disease": {
      "type": "string",
      "title": "Maladie"
    },
    "plant_name_fr": {
      "type": "string",
      "title": "Nom plante (fran\u00e7ais)"
    },
    "plant_name_local": {
      "type": "string",
      "title": "Nom vernaculaire"
    },
    "part_used": {
      "type": "string",
      "title": "Partie utilis\u00e9e"
    },
    "preparation": {
      "type": "string",
      "title": "Mode de pr\u00e9paration"
    },
    "dosage_adult": {
      "type": "string",
      "title": "Dosage adulte"
    },
    "dosage_child": {
      "type": "string",
      "title": "Dosage enfant"
    },
    "precautions": {
      "type": "string",
      "title": "Pr\u00e9cautions"
    },
    "max_severity": {
      "type": "string",
      "title": "Gravit\u00e9 max applicable",
      "enum": [
        "modere",
        "faible"
      ]
    }
  },
  "required": [
    "disease",
    "plant_name_fr"
  ]
}