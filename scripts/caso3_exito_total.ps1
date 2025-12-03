# Caso 3: Éxito total en la planificación
# Todas las condiciones se cumplen y el plan debe generarse correctamente.

Invoke-WebRequest `
  -Uri "https://moralesj.app.n8n.cloud/webhook-test/logisticsplan" `
  -Method POST `
  -Headers @{ 'Content-Type' = 'application/json' } `
  -Body '{
    "ordenes": [
      {
        "id": "O-SUCCESS-1",
        "destino": "Bocagrande, Cartagena, Bolivar, Colombia",
        "vol": 1.5,
        "peso": 50,
        "ventana": { "ini": "08:00", "fin": "23:00" }
      },
      {
        "id": "O-SUCCESS-2",
        "destino": "Getsemani, Cartagena, Bolivar, Colombia",
        "vol": 1.0,
        "peso": 30,
        "ventana": { "ini": "08:00", "fin": "23:00" }
      }
    ],
    "vehiculos": [
      {
        "id": "V-01",
        "cap_vol": 8,
        "cap_peso": 1200,
        "ubik": [10.4236, -75.5252],
        "combustible_actual": 30,
        "consumo_km_l": 9,
        "horas_conducidas_actuales": 1
      }
    ]
  }'
