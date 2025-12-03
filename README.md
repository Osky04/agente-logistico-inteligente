# Agente Logístico Inteligente – Proyecto Final

Este repositorio contiene el **código fuente completo** del *Agente Logístico Inteligente*, desarrollado como parte del Proyecto Final del curso de Inteligencia Artificial.  

El agente fue implementado en **n8n** y permite automatizar la planificación logística mediante:

- Geocodificación de direcciones (OpenCageData)
- Cálculo de rutas y tiempos de viaje (OpenRouteService)
- Validación de restricciones operativas del vehículo
- Detección de anomalías (combustible, capacidad, ventanas horarias, horas del conductor)
- Generación automática de alertas vía **Telegram** y **Gmail**
- Registro de rutas exitosas en **Google Sheets**

Toda la lógica del agente está construida sobre un flujo visual en n8n y un nodo principal de JavaScript que actúa como motor de decisión.

---

## 📁 Estructura del repositorio

```text
agente-logistico-inteligente/
├─ README.md                          # Documentación general del proyecto
├─ n8n/
│  └─ workflow_logistics_plan.json   # Flujo completo exportado desde n8n
├─ src/
│  └─ agent_core.js                  # Lógica central del agente (nodo Code)
└─ scripts/
   ├─ caso1_driver_hours_excedidas.ps1
   ├─ caso2_combustible_insuficiente.ps1
   └─ caso3_exito_total.ps1
