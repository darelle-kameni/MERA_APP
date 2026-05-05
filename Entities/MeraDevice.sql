{
  "name": "MeraDevice",
  "type": "object",
  "properties": {
    "serial_number": {
      "type": "string",
      "title": "Num\u00e9ro de s\u00e9rie"
    },
    "health_center_id": {
      "type": "string",
      "title": "ID Centre de sant\u00e9"
    },
    "health_center_name": {
      "type": "string",
      "title": "Nom du centre"
    },
    "status": {
      "type": "string",
      "title": "Statut",
      "enum": [
        "en_ligne",
        "hors_ligne",
        "maintenance"
      ]
    },
    "battery_level": {
      "type": "number",
      "title": "Niveau batterie (%)"
    },
    "last_sync": {
      "type": "string",
      "title": "Derni\u00e8re synchronisation"
    },
    "firmware_version": {
      "type": "string",
      "title": "Version firmware"
    }
  },
  "required": [
    "serial_number"
  ]
}