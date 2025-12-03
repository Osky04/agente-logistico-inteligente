# Datos del Agente Logístico Inteligente

Este directorio contiene todos los **archivos de datos complementarios** que permiten reproducir los experimentos, pruebas y resultados del Agente Logístico Inteligente.

Los datos corresponden a los **payloads JSON** utilizados como entrada en los scripts de prueba incluidos en la carpeta `scripts/`.

Además, estos archivos representan casos reales de uso del agente y pueden utilizarse directamente con el Webhook del sistema.

---

## Archivos incluidos

### 1. `payload_caso1.json`
Corresponde al caso de prueba: **Horas de conducción excedidas**.

Incluye:
- Una única orden con destino definido.
- Un vehículo cuya cantidad de horas de conducción acumuladas está cerca del límite permitido.
- Se espera que el agente emita la bandera `driver_hours_ok = false` y genere una alerta.

Este archivo es utilizado por:  
`scripts/caso1_driver_hours_excedidas.ps1`

---

### 2. `payload_caso2.json`
Corresponde al caso de prueba: **Combustible insuficiente**.

Incluye:
- Dos órdenes con destinos relativamente alejados.
- Un vehículo con solo 1 litro de combustible.
- Se espera que el agente marque `fuel_ok = false` y genere una alerta.

Este archivo es utilizado por:  
`scripts/caso2_combustible_insuficiente.ps1`

---

### 3. `payload_caso3.json`
Corresponde al caso de prueba: **Éxito total en la planificación**.

Incluye:
- Dos órdenes correctamente definidas (volumen, peso, ventana horaria).
- Un vehículo con capacidad, combustible y horas de conducción suficientes.
- Se espera que todas las banderas (`capacity_ok`, `fuel_ok`, `windows_ok`, `driver_hours_ok`) sean `true`.
- El plan debe registrarse como exitoso en Google Sheets.

Este archivo es utilizado por:  
`scripts/caso3_exito_total.ps1`

---

## Cómo se generaron estos datos

Los datos fueron generados siguiendo estos pasos:

1. Se identificaron los tres escenarios clave evaluados por el agente:
   - Exceso de horas.
   - Combustible insuficiente.
   - Caso exitoso.

2. Para cada escenario:
   - Se definió una lista representativa de órdenes.
   - Se especificaron parámetros realistas del vehículo (capacidad, combustible, horas acumuladas, ubicación).
   - Se escribieron los datos manualmente en formato JSON.

3. Los payloads fueron diseñados para ser **compatibles directamente** con el nodo Webhook del flujo n8n.

---

## Dependencias necesarias para reproducir los resultados

Para ejecutar los scripts asociados a estos datos, se requiere:

### Requisitos
- **PowerShell** (cualquier versión actual).
- Acceso a Internet.
- Una instancia de **n8n** funcionando.
- URL activa del Webhook de planificación logística.

### APIs necesarias en n8n
- OpenCageData API Key  
- OpenRouteService API Key  
- Credenciales de:
  - Google Sheets
  - Telegram
  - Gmail

---

## Nota final

Estos datos forman parte del **Entregable 3: Datos y Scripts Complementarios**.  
Permiten validar, reproducir y verificar el funcionamiento del Agente Logístico Inteligente de manera independiente al informe técnico y al código fuente.
