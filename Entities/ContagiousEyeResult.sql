{
  "name": "ContagiousEyeResult",
  "type": "object",
  "properties": {
    "session_id": {
      "type": "string",
      "title": "ID Session"
    },
    "conjunctivitis_bacterial": {
      "type": "number",
      "title": "Conjonctivite bact\u00e9rienne (%)"
    },
    "conjunctivitis_viral": {
      "type": "number",
      "title": "Conjonctivite virale (%)"
    },
    "trachoma": {
      "type": "number",
      "title": "Trachome (%)"
    },
    "blepharitis_infectious": {
      "type": "number",
      "title": "Bl\u00e9pharite infectieuse (%)"
    },
    "contagion_alert": {
      "type": "boolean",
      "title": "Alerte contagion"
    }
  },
  "required": [
    "session_id"
  ]
}