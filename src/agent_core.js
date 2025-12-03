/**
 * agent_core.js
 *
 * Lógica principal del Agente Logístico Inteligente.
 *
 * Este archivo está pensado para ser usado dentro de un nodo "Code" de n8n.
 * n8n proporciona:
 *  - El array `items` como entrada del flujo.
 *  - El helper `this.helpers.httpRequest` para hacer peticiones HTTP.
 *
 * Entradas esperadas (body del webhook):
 *  {
 *    "vehiculos": [
 *      {
 *        "id": "V-01",
 *        "cap_vol": 8,
 *        "cap_peso": 1200,
 *        "ubik": [lat, lng],
 *        "combustible_actual": 30,
 *        "consumo_km_l": 9,
 *        "horas_conducidas_actuales": 1
 *      }
 *    ],
 *    "ordenes": [
 *      {
 *        "id": "O-1",
 *        "destino": "Dirección completa",
 *        "vol": 1.5,
 *        "peso": 50,
 *        "prioridad": 1,
 *        "ventana": { "ini": "08:00", "fin": "23:00" }
 *      }
 *    ]
 *  }
 *
 * Salida (items[0].json):
 *  {
 *    "vehicle": "V-01",
 *    "metrics": { ... },
 *    "flags": {
 *      "capacity_ok": true/false,
 *      "windows_ok": true/false,
 *      "fuel_ok": true/false,
 *      "driver_hours_ok": true/false
 *    },
 *    "plan": [ ... ]
 *  }
 */

// --- CONFIGURACIÓN ---
// Nota: en un entorno real NO deberías dejar las API keys en texto plano.
// Aquí se dejan placeholders para documentar el uso.
const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY || 'TU_API_KEY_DE_OPENCAGE';
const OPENROUTESERVICE_API_KEY = process.env.OPENROUTESERVICE_API_KEY || 'TU_API_KEY_DE_OPENROUTESERVICE';

// Límite máximo de horas de conducción permitidas antes de exigir un descanso.
const MAX_HORAS_CONDUCCION = 4.5;

// --- INICIO DEL CÓDIGO PRINCIPAL ---
// Datos enviados al webhook (n8n los expone en items[0].json.body)
const webhookData = items[0].json.body;
const veh = webhookData.vehiculos[0];     // Usamos un solo vehículo en este flujo
const orders = webhookData.ordenes;       // Órdenes de entrega

// Lista de coordenadas para la matriz de rutas (vehículo + destinos)
const locations = [];

// Coordenadas del vehículo (se invierte [lat, lng] -> [lng, lat] para OpenRouteService)
const vehicleCoords = [veh.ubik[1], veh.ubik[0]];
locations.push(vehicleCoords);

// 1) GEOCODIFICACIÓN DE ÓRDENES
// Para cada orden se llama a la API de OpenCageData y se obtienen coordenadas.
for (const order of orders) {
    try {
        const geoResponse = await this.helpers.httpRequest({
            url: 'https://api.opencagedata.com/geocode/v1/json',
            qs: { q: order.destino, key: OPENCAGE_API_KEY, limit: 1 },
            json: true,
        });

        if (geoResponse.results && geoResponse.results.length > 0) {
            const coords = geoResponse.results[0].geometry;
            order._coords = [coords.lng, coords.lat];  // [lng, lat]
            locations.push(order._coords);
        } else {
            // Si no se encuentra la dirección, se lanza un error claro.
            throw new Error(`Dirección NO encontrada: ${order.destino}`);
        }
    } catch (error) {
        // Cualquier fallo en geocodificación se convierte en un error controlado.
        throw new Error(`Fallo al geocodificar: ${order.destino}. Error: ${error.message}`);
    }
}

// 2) CÁLCULO DE MATRIZ DE DISTANCIA/DURACIÓN (OpenRouteService)
let matrixData;
try {
    const matrixResponse = await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.openrouteservice.org/v2/matrix/driving-car',
        headers: { Authorization: OPENROUTESERVICE_API_KEY },
        body: {
            locations: locations,
            metrics: ['distance', 'duration'],
            sources: [0], // índice 0 = vehículo
        },
        json: true,
    });

    matrixData = matrixResponse;
} catch (error) {
    throw new Error(`Fallo al llamar a OpenRouteService: ${error.message}`);
}

// Validación básica de estructura de respuesta
if (!matrixData || !matrixData.durations || !matrixData.distances) {
    throw new Error('Respuesta de OpenRouteService inesperada');
}

// Extraemos arreglos de duraciones y distancias desde el vehículo a cada destino
const durations = matrixData.durations[0]; // en segundos
const distances = matrixData.distances[0]; // en metros

// 3) ENRIQUECIMIENTO DE ÓRDENES CON DURACIÓN Y DISTANCIA
const enriched = orders.map((o, i) => ({
    ...o,
    _dur_s: durations[i + 1] || 0,  // +1 porque la posición 0 es el vehículo
    _dist_m: distances[i + 1] || 0,
}));

// 4) PRIORIZACIÓN DE ÓRDENES
// Primero por nivel de prioridad (si existe), luego por duración (más cercanas primero).
enriched.sort((a, b) => {
    if ((b.prioridad ?? 0) !== (a.prioridad ?? 0)) {
        return (b.prioridad ?? 0) - (a.prioridad ?? 0);
    }
    return (a._dur_s ?? 0) - (b._dur_s ?? 0);
});

// 5) CÁLCULO DE CAPACIDAD (VOLUMEN/PESO)
const totalVol = enriched.reduce((s, o) => s + (o.vol || 0), 0);
const totalPeso = enriched.reduce((s, o) => s + (o.peso || 0), 0);

// Bandera de capacidad: true si no se exceden límites volumétricos ni de peso
const capacityOk =
    totalVol <= (veh.cap_vol || Infinity) &&
    totalPeso <= (veh.cap_peso || Infinity);

// 6) CONSTRUCCIÓN DEL PLAN Y VALIDACIÓN DE VENTANAS HORARIAS
let tAcc = 0;               // Tiempo acumulado en segundos
let windowsOk = true;       // Bandera global de cumplimiento de ventanas
const plan = [];            // Arreglo final de paradas planeadas
const now = new Date();     // Referencia temporal (ahora)

for (const o of enriched) {
    const etaMs = now.getTime() + (tAcc + (o._dur_s || 0)) * 1000;
    const eta = new Date(etaMs);

    let windowOk = true;

    // Si la orden tiene ventana horaria, comprobar si el ETA cae dentro de ella
    if (o.ventana && o.ventana.ini && o.ventana.fin) {
        const [hi, mi] = String(o.ventana.ini).split(':').map(Number);
        const [hf, mf] = String(o.ventana.fin).split(':').map(Number);

        const today = new Date(now);
        const wStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            hi || 0,
            mi || 0,
            0,
        );
        const wEnd = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            hf || 0,
            mf || 0,
            0,
        );

        // Se agrega una tolerancia del 5 % sobre la duración de la ventana
        const tolMs = (wEnd - wStart) * 0.05;

        if (eta.getTime() > wEnd.getTime() + tolMs) {
            windowOk = false;
            windowsOk = false;
        }
    }

    plan.push({
        id: o.id,
        destino: o.destino,
        distancia_km: (o._dist_m || 0) / 1000,
        dur_min: (o._dur_s || 0) / 60,
        eta_iso: eta.toISOString(),
        ventana_ok: windowOk,
    });

    // Acumulamos el tiempo para la siguiente parada
    tAcc += o._dur_s || 0;
}

// 7) CÁLCULO DE MÉTRICAS GLOBALES
const totalKm = plan.reduce((s, p) => s + (p.distancia_km || 0), 0);
const totalMin = tAcc / 60; // Minutos totales de ruta

// Porcentajes de ocupación
const occVol = (totalVol / (veh.cap_vol || 1)) * 100;
const occPeso = (totalPeso / (veh.cap_peso || 1)) * 100;

// 8) VALIDACIÓN DE RECURSOS DEL VEHÍCULO

// Combustible requerido según distancia total y consumo
const combustible_necesario = totalKm / (veh.consumo_km_l || 10);
const fuelOk = (veh.combustible_actual || 0) >= combustible_necesario;

// Cálculo de horas totales de conducción (históricas + ruta actual)
const totalHorasRuta = totalMin / 60;
const horas_totales_conductor =
    (veh.horas_conducidas_actuales || 0) + totalHorasRuta;

// Bandera de horas del conductor
const driverHoursOk = horas_totales_conductor <= MAX_HORAS_CONDUCCION;

// 9) CONSTRUCCIÓN DEL OBJETO DE SALIDA
return [
    {
        json: {
            vehicle: veh.id,
            metrics: {
                total_km: Number(totalKm.toFixed(2)),
                ocupacion_vol_pct: Number(occVol.toFixed(1)),
                ocupacion_peso_pct: Number(occPeso.toFixed(1)),
                n_paradas: plan.length,
                combustible_necesario: Number(
                    combustible_necesario.toFixed(1),
                ),
                combustible_actual: veh.combustible_actual,
                horas_totales_conductor: Number(
                    horas_totales_conductor.toFixed(1),
                ),
                max_horas_conduccion: MAX_HORAS_CONDUCCION,
            },
            flags: {
                capacity_ok: capacityOk,
                windows_ok: windowsOk,
                fuel_ok: fuelOk,
                driver_hours_ok: driverHoursOk,
            },
            plan,
        },
    },
];
