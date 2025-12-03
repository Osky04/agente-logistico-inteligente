# Caso 1: Límite de conducción excedido
# Envía una orden con un vehículo que ya casi supera el máximo de horas de conducción.

Invoke-WebRequest `
  -Uri "https://moralesj.app.n8n.cloud/webhook-test/logisticsplan" `
  -Method POST `
  -Headers @{ 'Content-Type' = 'application/json' } `
  -Body '{
    "ordenes": [
      {
        "id": "O-DRIVER-FAIL",
        "destino": "Pasacaballos, Cartagena, Bolivar, Colombia"
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
        "horas_conducidas_actuales": 4
      }
    ]
  }'
