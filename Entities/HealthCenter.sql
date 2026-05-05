{
  "name": "HealthCenter",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "title": "Nom du centre"
    },
    "region": {
      "type": "string",
      "title": "R\u00e9gion"
    },
    "district": {
      "type": "string",
      "title": "District"
    },
    "gps_lat": {
      "type": "number",
      "title": "Latitude GPS"
    },
    "gps_lng": {
      "type": "number",
      "title": "Longitude GPS"
    },
    "center_type": {
      "type": "string",
      "title": "Type de centre",
      "enum": [
        "hopital_regional",
        "hopital_district",
        "centre_sante_integre",
        "poste_sante"
      ]
    }
  },
  "required": [
    "name",
    "region"
  ]
}