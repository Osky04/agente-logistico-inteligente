# Caso 2: Combustible insuficiente
# El combustible disponible no alcanza para completar la ruta.

Invoke-WebRequest `
  -Uri "https://moralesj.app.n8n.cloud/webhook-test/logisticsplan" `
  -Method POST `
  -Headers @{ 'Content-Type' = 'application/json' } `
  -Body '{
    "ordenes": [
      { "id": "O-FUEL-FAIL", "destino": "Turbaco, Bolivar, Colombia" },
      { "id": "O-FUEL-FAIL-2", "destino": "Arjona, Bolivar, Colombia" }
    ],
    "vehiculos": [
      {
        "id": "V-01",
        "cap_vol": 8,
        "cap_peso": 1200,
        "ubik": [10.4236, -75.5252],
        "combustible_actual": 1,
        "consumo_km_l": 9,
        "horas_conducidas_actuales": 1
      }
    ]
  }'
