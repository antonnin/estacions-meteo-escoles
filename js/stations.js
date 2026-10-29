/**
 * ============================================
 * REGISTRE D'ESTACIONS
 * ============================================
 *
 * Carrega la llista d'estacions de (per ordre):
 *   1. L'API d'Apps Script (CONFIG.api.url) → full de càlcul de registre
 *   2. La còpia local de l'última càrrega correcta (localStorage)
 *   3. data/stations.json (llavor local, per a desenvolupament / fora de línia)
 *
 * Ús:   await Stations.ready;   Stations.get('castellot');   Stations.list();
 */

const Stations = {
    map: {},
    ready: null,

    COLORS: ['#ff9ff3', '#4ECDC4', '#feca57', '#54a0ff', '#ff6b6b', '#1dd1a1', '#a29bfe', '#fd9644'],

    list({ includeInactive = false } = {}) {
        return Object.values(this.map).filter(s => includeInactive || s.active);
    },

    get(id) {
        return this.map[id] || null;
    },

    /** Carrega el registre (una sola vegada) */
    load() {
        if (!this.ready) this.ready = this._load();
        return this.ready;
    },

    async _load() {
        let raw = null;
        if (CONFIG.api.url) {
            try {
                raw = await this._fromApi();
                this._saveCache(raw);
            } catch (e) {
                console.warn('Registre: API no disponible, uso còpia local', e);
                raw = this._loadCache();
            }
        }
        if (!raw) raw = await this._fromSeed();

        // Mode demo sense estacions registrades: n'inventem dues perquè la interfície es pugui provar
        if (!raw.length && typeof DemoDataGenerator !== 'undefined' && DemoDataGenerator.isEnabled()) {
            raw = [
                { id: 'demo-microbit', name: 'Estació demo micro:bit', location: 'Vilafranca del Penedès', lat: 41.3632, lng: 1.7129, profile: 'microbit-iot', channelId: 'demo', icon: '🔬' },
                { id: 'demo-esp32', name: 'Estació demo ESP32', location: 'Girona', lat: 41.9794, lng: 2.8214, profile: 'esp32', channelId: 'demo', icon: '🛰️' },
            ];
        }

        this.map = {};
        raw.forEach((r, i) => {
            const st = this.build(r, i);
            if (st) this.map[st.id] = st;
        });
        return this.map;
    },

    async _fromApi() {
        const res = await fetch(`${CONFIG.api.url}?action=stations`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json.stations)) throw new Error('Resposta sense estacions');
        return json.stations;
    },

    async _fromSeed() {
        const res = await fetch('data/stations.json');
        if (!res.ok) throw new Error('No es pot carregar data/stations.json');
        return (await res.json()).stations || [];
    },

    _saveCache(stations) {
        try { localStorage.setItem('meteobit.stations', JSON.stringify({ ts: Date.now(), stations })); } catch (e) { /* mode privat */ }
    },

    _loadCache() {
        try {
            const c = JSON.parse(localStorage.getItem('meteobit.stations') || 'null');
            return c && Array.isArray(c.stations) ? c.stations : null;
        } catch (e) { return null; }
    },

    /** Converteix una fila del registre en l'objecte que fan servir la resta de mòduls */
    build(raw, index = 0) {
        if (!raw || !raw.id || !raw.channelId) return null;
        const color = raw.color || this.COLORS[index % this.COLORS.length];
        const profile = PROFILES[raw.profile] ? raw.profile : 'personalitzat';

        // Camps: explícits > perfil > (pendents de detectar pel nom del canal)
        let fieldsSpec = raw.fields;
        if (typeof fieldsSpec === 'string') {
            try { fieldsSpec = JSON.parse(fieldsSpec); } catch (e) { fieldsSpec = null; }
        }
        if (!fieldsSpec || !Object.keys(fieldsSpec).length) fieldsSpec = PROFILES[profile].fields;

        const station = {
            id: String(raw.id),
            name: raw.name || raw.id,
            location: raw.location || '',
            comarca: raw.comarca || '',
            description: [raw.location, raw.comarca && `(${raw.comarca})`].filter(Boolean).join(' '),
            website: raw.website || '',
            icon: raw.icon || '🌦️',
            color,
            gradient: `linear-gradient(135deg, ${color} 0%, ${this.shade(color)} 100%)`,
            coordinates: (raw.lat !== '' && raw.lat != null && raw.lng !== '' && raw.lng != null)
                ? { lat: Number(raw.lat), lng: Number(raw.lng) } : null,
            profile,
            thingspeak: { channelId: String(raw.channelId), readApiKey: raw.readApiKey || '' },
            active: raw.active !== false && raw.active !== 'FALSE' && raw.active !== 'no',
            fields: null,
            fieldsPending: false,
        };
        if (fieldsSpec) station.fields = this.expandFields(fieldsSpec);
        else station.fieldsPending = true;
        return station;
    },

    expandFields(spec) {
        const out = {};
        for (const [key, def] of Object.entries(spec)) if (def) out[key] = expandField(def);
        return out;
    },

    /** Aclareix un color per al degradat de la targeta */
    shade(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!m) return hex;
        const c = [1, 2, 3].map(i => Math.max(0, Math.round(parseInt(m[i], 16) * 0.8)));
        return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
    },

    /**
     * Perfil "personalitzat" sense camps al registre: els deduïm dels noms
     * que l'usuari ha posat als camps del canal de ThingSpeak.
     */
    async ensureFields(station) {
        if (!station || station.fields) return station;
        const info = await thingSpeakService.fetchChannelInfo(station.id);
        const spec = {};
        for (let i = 1; i <= 8; i++) {
            const label = info[`field${i}`];
            if (!label) continue;
            const type = detectFieldType(label);
            spec[`field${i}`] = { type, name: label.replace(/\s*[\(\[].*[\)\]]\s*$/, '').trim() || label };
        }
        station.fields = this.expandFields(spec);
        station.fieldsPending = false;
        return station;
    },

    /** Camp (clau) d'un tipus donat: p. ex. fieldKeyFor(st,'temperature') → 'field3' */
    fieldKeyFor(station, type) {
        if (!station || !station.fields) return null;
        const hit = Object.entries(station.fields).find(([, f]) => f.type === type);
        return hit ? hit[0] : null;
    },
};
