/**
 * ============================================
 * MODE DEMO - DADES SIMULADES
 * ============================================
 *
 * Genera dades verosímils per a qualsevol estació, segons el TIPUS de cada
 * camp (no la seva posició), per provar la interfície sense canals reals.
 *
 * Activació: afegeix ?demo=true a la URL o posa demoMode: true a config.js.
 */

const DemoDataGenerator = {
    isEnabled() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true') return true;
        return typeof CONFIG !== 'undefined' && CONFIG.demoMode === true;
    },

    generateSchoolData(stationId, startDate, endDate) {
        const station = Stations.get(stationId);
        if (!station || !station.fields) return null;

        const now = new Date();
        const start = startDate || new Date(now.getTime() - 24 * 3600 * 1000);
        const end = endDate || now;

        // Un punt cada 15 minuts (cada hora si el rang és molt llarg, per no saturar)
        const stepMin = (end - start) > 10 * 86400000 ? 60 : 15;
        const feeds = [];
        let id = 1;
        for (let t = new Date(start); t <= end; t = new Date(t.getTime() + stepMin * 60000)) {
            feeds.push(this.generateFeedEntry(t, station, id++));
        }
        return thingSpeakService.buildDataset(station, feeds, { id: `demo_${stationId}`, name: station.name });
    },

    /** Última lectura simulada (per al mapa i els indicadors d'estat) */
    generateLastEntry(stationId) {
        const station = Stations.get(stationId);
        if (!station || !station.fields) return null;
        return this.generateFeedEntry(new Date(), station, 1);
    },

    generateFeedEntry(timestamp, station, entryId) {
        const hour = timestamp.getHours() + timestamp.getMinutes() / 60;
        const isDay = hour >= 7 && hour <= 20;
        const dayProgress = Math.min(1, Math.max(0, (hour - 6) / 12));
        const sun = Math.sin(dayProgress * Math.PI);          // 0..1
        const tempVariation = sun * 8;
        const r = (n) => this.randomVariation(n);
        const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

        const entry = { entry_id: entryId, timestamp: new Date(timestamp), created_at: timestamp.toISOString() };
        for (const [key, f] of Object.entries(station.fields)) {
            let v;
            switch (f.type) {
                case 'temperature': v = round(15 + tempVariation + r(1.5)); break;
                case 'humidity':    v = round(Math.min(100, Math.max(0, 60 - tempVariation * 2 + r(8)))); break;
                case 'light': {
                    const pct = isDay ? 50 + sun * 45 + r(8) : Math.max(0, r(3));
                    v = f.unit === 'lux' ? round(Math.max(0, pct) * 600, 0) : round(Math.min(100, Math.max(0, pct)), 0);
                    break;
                }
                case 'pressure': v = round(1013 + r(8)); break;
                case 'wind':     v = round(Math.max(0, 5 + r(7))); break;
                case 'rain':     v = Math.random() < 0.05 ? round(Math.random() * 2) : 0; break;
                case 'dust':     v = round(Math.max(0, 12 + r(6)), 0); break;
                case 'battery':  v = round(3.9 + r(0.1), 2); break;
                case 'signal':   v = round(-62 + r(8), 0); break;
                default:         v = round(50 + r(10));
            }
            entry[key] = v;
        }
        return entry;
    },

    randomVariation(max) {
        return (Math.random() - 0.5) * 2 * max;
    },
};

// Interceptar el servei de ThingSpeak si el mode demo està actiu
if (typeof ThingSpeakService !== 'undefined') {
    const originalFetch = ThingSpeakService.prototype.fetchChannelData;
    const originalLast = ThingSpeakService.prototype.fetchLastEntry;

    ThingSpeakService.prototype.fetchChannelData = async function (stationId, startDate, endDate) {
        if (DemoDataGenerator.isEnabled()) {
            await Stations.ensureFields(Stations.get(stationId)).catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 300)); // simular latència
            return DemoDataGenerator.generateSchoolData(stationId, startDate, endDate);
        }
        return originalFetch.call(this, stationId, startDate, endDate);
    };

    ThingSpeakService.prototype.fetchLastEntry = async function (stationId) {
        if (DemoDataGenerator.isEnabled()) {
            await Stations.ensureFields(Stations.get(stationId)).catch(() => {});
            return DemoDataGenerator.generateLastEntry(stationId);
        }
        return originalLast.call(this, stationId);
    };
}

if (typeof window !== 'undefined') {
    window.DemoDataGenerator = DemoDataGenerator;
}
