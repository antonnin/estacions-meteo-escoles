/**
 * ============================================
 * TIPUS DE MAGNITUD I PERFILS DE PLACA
 * ============================================
 *
 * Aquesta és la capa de COMPATIBILITAT entre plaques: el dashboard no sap
 * res de micro:bit ni d'ESP32, només de "camps" amb un tipus (temperature,
 * wind…). Un perfil de placa diu quin tipus té cada field de ThingSpeak i
 * quina escala cal aplicar.
 *
 * Per afegir una placa nova (p. ex. Arduino, Raspberry Pi Pico W), afegeix
 * un perfil a PROFILES i, si cal, a apps-script/Code.gs (mateix identificador).
 */

const FIELD_TYPES = {
    temperature: { name: 'Temperatura', unit: '°C',    icon: '🌡️', color: '#FF6B6B', decimals: 1 },
    humidity:    { name: 'Humitat',     unit: '%',     icon: '💧', color: '#54a0ff', decimals: 0 },
    light:       { name: 'Lluminositat', unit: '%',    icon: '☀️', color: '#f1c40f', decimals: 0 },
    pressure:    { name: 'Pressió',     unit: 'hPa',   icon: '📊', color: '#1dd1a1', decimals: 0 },
    wind:        { name: 'Vent',        unit: 'km/h',  icon: '💨', color: '#a29bfe', decimals: 1 },
    rain:        { name: 'Pluja',       unit: 'mm',    icon: '🌧️', color: '#0984e3', decimals: 1 },
    dust:        { name: 'Pols',        unit: 'µg/m³', icon: '🫧', color: '#95a5a6', decimals: 0 },
    battery:     { name: 'Bateria',     unit: 'V',     icon: '🔋', color: '#fdcb6e', decimals: 2 },
    signal:      { name: 'Senyal Wi-Fi', unit: 'dBm',  icon: '📶', color: '#b2bec3', decimals: 0 },
    generic:     { name: 'Valor',       unit: '',      icon: '📈', color: '#636e72', decimals: 1 },
};

const PROFILES = {
    'microbit-iot': {
        label: 'micro:bit amb kit IoT (Wi-Fi)',
        description: '5 camps: temperatura, humitat, llum (%), pressió i vent (cm/h).',
        fields: {
            field1: { type: 'temperature' },
            field2: { type: 'humidity' },
            field3: { type: 'light' },
            field4: { type: 'pressure' },
            field5: { type: 'wind', scale: 0.01 },   // el kit envia cm/h
        },
    },
    'esp32': {
        label: 'ESP32 (mapa estàndard de 8 camps)',
        description: 'Temperatura, humitat, llum (lux), pressió, vent (km/h), pluja (mm), pols i senyal Wi-Fi.',
        fields: {
            field1: { type: 'temperature' },
            field2: { type: 'humidity' },
            field3: { type: 'light', unit: 'lux' },
            field4: { type: 'pressure' },
            field5: { type: 'wind', scale: 1 },
            field6: { type: 'rain' },
            field7: { type: 'dust' },
            field8: { type: 'signal' },
        },
    },
    'personalitzat': {
        label: 'Personalitzada (es detecta pels noms dels camps)',
        description: 'Posa nom als camps de ThingSpeak (p. ex. "Temperatura", "Humitat") i es detectaran sols.',
        fields: null,
    },
};

/**
 * Endevina el tipus d'un camp pel nom que li ha posat l'usuari a ThingSpeak.
 * (Mateixes regles que apps-script/Code.gs → detectType_)
 */
function detectFieldType(name) {
    const n = String(name || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '');
    const rules = [
        ['temperature', /temp|temperatura|celsius|degree/],
        ['humidity',    /humit|humid|humedad/],
        ['pressure',    /pressi|presion|pressure|hpa|baro/],
        ['wind',        /vent\b|vento|viento|wind|anemo/],
        ['rain',        /pluj|pluv|lluvia|rain|precip/],
        ['light',       /llum|lumin|light|lux|solar|irradi/],
        ['dust',        /pols|polvo|dust|pm ?2|pm ?10|particul/],
        ['battery',     /bateri|battery|volt/],
        ['signal',      /senyal|signal|rssi|wifi|wi-fi/],
    ];
    for (const [type, re] of rules) if (re.test(n)) return type;
    return 'generic';
}

/** Converteix {type, name?, unit?, scale?} o 'type' en una definició completa de camp */
function expandField(spec) {
    const s = typeof spec === 'string' ? { type: spec } : { ...spec };
    const base = FIELD_TYPES[s.type] || FIELD_TYPES.generic;
    return {
        ...base,
        ...s,
        type: FIELD_TYPES[s.type] ? s.type : 'generic',
        scale: typeof s.scale === 'number' ? s.scale : 1,
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FIELD_TYPES, PROFILES, detectFieldType, expandField };
}
