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

## Estructura del repositorio

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

## ⚙️ Dependencias y servicios utilizados

El flujo utiliza los siguientes servicios externos:

- **OpenCageData** – para geocodificar direcciones.
- **OpenRouteService** – para calcular distancias, tiempos estimados y matrices de duración.
- **Google Sheets API** – para almacenar rutas exitosas y métricas.
- **Telegram Bot API** – para enviar alertas instantáneas.
- **Gmail API** – para enviar correos automáticos por fallas críticas.

Además, usa capacidades internas de **n8n**:

- Nodo **Webhook**: recibe solicitudes de planificación.
- Nodo **Code** (JavaScript): implementa la lógica principal del agente.
- Nodos **IF**: validan todas las banderas lógicas.
- Nodo **Google Sheets**: registra el plan cuando es exitoso.
- Nodo **Telegram**: envía mensajes de alerta.
- Nodo **Gmail**: envía correos de advertencia.

---
## 🔧 Configuración requerida en n8n

Para que el flujo funcione correctamente, debes configurar:

### ✔ Credenciales de:
- Google Sheets  
- Telegram  
- Gmail  

### ✔ Claves API necesarias:
- `OPENCAGE_API_KEY`
- `OPENROUTESERVICE_API_KEY`

Estas claves pueden configurarse como:
- Variables de entorno  
- O credenciales internas de n8n (recomendado)

⚠️ **Nunca las publiques en GitHub**.

---
## Cómo importar el flujo en n8n

1. Descarga el archivo `workflow_logistics_plan.json` de la carpeta `n8n/`.
2. Inicia sesión en tu instancia de n8n.
3. Ve a **Workflows → Import from file**.
4. Selecciona el archivo descargado.
5. Asigna las credenciales a los nodos (Telegram, Sheets, Gmail).
6. Activa el workflow.
7. Copia la URL del Webhook que genera n8n. Tendrá un formato similar a:

   `https://TU-INSTANCE.n8n.cloud/webhook-test/logisticsplan`

---
## Descripción de la lógica del agente

La lógica está implementada en `src/agent_core.js`, y realiza los siguientes pasos principales:

### 1. Lectura del input
El agente recibe, a través del Webhook de n8n, un cuerpo JSON con:

- Información del vehículo:
  - Capacidad de volumen (`cap_vol`)
  - Capacidad de peso (`cap_peso`)
  - Ubicación actual (`ubik`)
  - Combustible disponible (`combustible_actual`)
  - Consumo de combustible (`consumo_km_l`)
  - Horas de conducción acumuladas (`horas_conducidas_actuales`)

- Información de las órdenes:
  - Identificador (`id`)
  - Dirección de destino (`destino`)
  - Volumen (`vol`)
  - Peso (`peso`)
  - Prioridad (`prioridad`)
  - Ventana horaria (`ventana.ini`, `ventana.fin`)

### 2. Geocodificación
Cada dirección de destino se envía a la API de **OpenCageData** para obtener coordenadas geográficas (latitud y longitud).  
Si una dirección no puede geocodificarse, el agente lanza un error con un mensaje claro.

### 3. Cálculo de rutas
Con las coordenadas del vehículo y de los destinos, el agente llama a **OpenRouteService** para calcular una matriz de:

- Distancias (en metros)
- Duraciones (en segundos)

Esta información se usa para estimar la distancia y el tiempo desde el vehículo a cada punto de entrega.

### 4. Priorización de órdenes
Las órdenes se ordenan según dos criterios:

1. Mayor prioridad numérica (si `prioridad` está definida).
2. Menor tiempo estimado de viaje (orden más cercana primero).

### 5. Evaluación de restricciones
El agente calcula:

- **Volumen total cargado** vs capacidad del vehículo (`cap_vol`)
- **Peso total** vs límite (`cap_peso`)
- **Distancia total** de la ruta (km)
- **Tiempo total** estimado de la ruta (minutos y horas)
- **Combustible requerido**, en función del consumo (`consumo_km_l`)
- **Horas totales de conducción**, sumando las horas históricas del conductor y las estimadas para la ruta actual

A partir de estos cálculos se generan cuatro banderas lógicas:

- `capacity_ok` – true si el volumen y el peso no exceden la capacidad.
- `fuel_ok` – true si el combustible alcanza para la distancia planificada.
- `windows_ok` – true si las ETAs respetan las ventanas horarias definidas.
- `driver_hours_ok` – true si el conductor no supera el máximo de horas permitido.

### 6. Construcción del plan logístico
Para cada orden se construye un objeto con:

- ID de la orden (`id`)
- Destino (`destino`)
- Distancia estimada (`distancia_km`)
- Duración del tramo (`dur_min`)
- Hora estimada de llegada (`eta_iso`)
- Indicador de cumplimiento de ventana (`ventana_ok`)

El conjunto de estos objetos forma el **plan completo de ruta**.

### 7. Salida del agente
El nodo Code retorna un objeto JSON con:

- `vehicle`: identificador del vehículo.
- `metrics`: distancias, ocupaciones, combustible requerido, horas de conducción, etc.
- `flags`: las cuatro banderas lógicas (`capacity_ok`, `fuel_ok`, `windows_ok`, `driver_hours_ok`).
- `plan`: lista ordenada de paradas con sus ETAs.

Estas salidas alimentan el resto del flujo en n8n, incluyendo nodos IF, Google Sheets, Telegram y Gmail.

---
## Casos de prueba incluidos

En la carpeta `scripts/` se incluyen tres archivos en PowerShell que permiten probar el comportamiento del agente en distintos escenarios.

### ✔ Caso 1 – Horas de conducción excedidas  
**Archivo:** `scripts/caso1_driver_hours_excedidas.ps1`  

- Envía una solicitud de planificación con un vehículo que ya ha consumido casi todas sus horas de conducción permitidas.
- El agente calcula las horas totales (históricas + ruta actual).
- Si se supera el umbral configurado (por ejemplo, 4.5 horas), la bandera `driver_hours_ok` pasa a `false`.
- El flujo de n8n detona las alertas correspondientes (Telegram/Gmail), en lugar de registrar un plan exitoso.

### ✔ Caso 2 – Combustible insuficiente  
**Archivo:** `scripts/caso2_combustible_insuficiente.ps1`  

- Envía órdenes a destinos relativamente alejados.
- El combustible disponible del vehículo es muy bajo (por ejemplo, 1 litro).
- El agente calcula el combustible necesario según la distancia total y el consumo (`consumo_km_l`).
- Si el combustible no alcanza, `fuel_ok` se marca como `false` y se genera la alerta respectiva.

### ✔ Caso 3 – Éxito total en la planificación  
**Archivo:** `scripts/caso3_exito_total.ps1`  

- Envía un conjunto de órdenes bien definidas y un vehículo con suficiente capacidad, combustible y horas disponibles.
- Todas las banderas (`capacity_ok`, `fuel_ok`, `windows_ok`, `driver_hours_ok`) deberían ser `true`.
- El flujo registra el resultado en Google Sheets y envía un mensaje de éxito al operador (por ejemplo, vía Telegram).

> Para ejecutar estos scripts, se recomienda usar **PowerShell** y asegurarse de que la URL del Webhook dentro de cada archivo coincida con la URL generada por tu instancia de n8n.

---
## Limpieza y buenas prácticas

- No se incluyen archivos innecesarios en el repositorio.
- El código está documentado con comentarios que facilitan su lectura y mantenimiento.
- Las claves API se mantienen privadas y deben configurarse únicamente en n8n o como variables de entorno.
- La estructura del repositorio sigue buenas prácticas profesionales para separar:
  - Lógica del agente (`src/`)
  - Flujo de n8n (`n8n/`)
  - Scripts de prueba (`scripts/`)
  - Documentación (`README.md`)

---

## Notas finales

Este repositorio forma parte de la entrega del **Proyecto Final – Agente Logístico Inteligente**, e incluye:

- Código fuente completo del agente (JavaScript + flujo de n8n).
- Scripts de prueba organizados y reproducibles.
- Flujo listo para importar en n8n.
- Documentación clara y estructurada.

Para entender la teoría, arquitectura, justificación, resultados, y análisis del sistema, consulta el **Informe Técnico Final**, el cual acompaña este código fuente como parte del primer entregable.
