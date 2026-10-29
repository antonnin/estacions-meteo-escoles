/**
 * ============================================
 * SERVEI DE CONNEXIÓ AMB THINGSPEAK
 * ============================================
 * 
 * Aquest mòdul gestiona totes les connexions amb l'API de ThingSpeak
 * per obtenir les dades de les estacions meteorològiques.
 */

class ThingSpeakService {
    constructor() {
        this.baseUrl = CONFIG.thingspeak.baseUrl;
        this.cache = new Map();
        // TTL curt: el dashboard s'actualitza cada minut i no ha de quedar-se amb dades velles
        this.cacheExpiry = CONFIG.thingspeak.cacheTtl || 30000;
    }

    /**
     * Obté les dades d'un canal de ThingSpeak amb suport per paginació
     * @param {string} schoolId - Identificador de l'escola
     * @param {Date} startDate - Data d'inici (opcional)
     * @param {Date} endDate - Data de fi (opcional)
     * @returns {Promise<Object>} - Dades del canal (combinades de múltiples requests si cal)
     */
    async fetchChannelData(schoolId, startDate = null, endDate = null) {
        const school = Stations.get(schoolId);
        if (!school) {
            throw new Error(`Estació no trobada: ${schoolId}`);
        }
        await Stations.ensureFields(school);

        // Comprovar cache primer
        const cacheKey = `${schoolId}_${startDate?.getTime()}_${endDate?.getTime()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const allFeeds = await this._fetchAllChannelFeeds(school, startDate, endDate);
            const data = this.buildDataset(school, allFeeds.feeds || [], allFeeds.channel);
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`❌ Error obtenint dades de ${school.name}:`, error);
            throw error;
        }
    }

    /**
     * Construeix l'objecte de dades que consumeix el dashboard
     * a partir d'una llista d'entrades ja processades (processEntry).
     */
    buildDataset(school, feeds, channel = {}) {
        const fieldData = {};
        Object.keys(school.fields).forEach(fieldKey => {
            fieldData[fieldKey] = {
                ...school.fields[fieldKey],
                data: feeds
                    .map(feed => ({ timestamp: feed.timestamp, value: feed[fieldKey] }))
                    .filter(item => item.value !== null && item.value !== undefined)
            };
        });
        return {
            channel: channel || {},
            school: school,
            feeds: feeds,
            fieldData: fieldData,
            stats: this.calculateStats(feeds, school)
        };
    }

    /**
     * Decideix la mitjana (en minuts) segons l'interval demanat.
     * ThingSpeak torna màxim 8000 registres per petició; amb una estació
     * que escriu cada ~20 s això són uns 2 dies. Per a rangs llargs demanem
     * mitjanes i evitem baixar centenars de milers de punts.
     * @returns {number|null} minuts de mitjana o null per dades crues
     */
    getAverageMinutes(startDate, endDate) {
        const end = endDate || new Date();
        const start = startDate || new Date(end.getTime() - 24 * 3600 * 1000);
        const hours = (end - start) / 3600000;
        const tiers = CONFIG.thingspeak.averageTiers || [];
        for (const tier of tiers) {
            if (hours <= tier.maxHours) return tier.average;
        }
        return null;
    }

    /**
     * Obté les dades del canal. Si cal més d'una pàgina, pagina cap
     * endavant fent servir `start` = últim timestamp rebut.
     * (El paràmetre `offset` de ThingSpeak és un desplaçament horari, no
     * serveix per paginar.)
     * @private
     */
    async _fetchAllChannelFeeds(school, startDate, endDate, forceAverage = null) {
        const { channelId, readApiKey } = school.thingspeak;
        const baseUrl = `${this.baseUrl}/channels/${channelId}/feeds.json`;
        const pageSize = CONFIG.thingspeak.resultsPerRequest;
        const maxPages = CONFIG.thingspeak.maxPages || 10;
        const average = forceAverage || this.getAverageMinutes(startDate, endDate);

        const allFeeds = [];
        let channel = {};
        let cursor = startDate;
        const seen = new Set();

        for (let page = 0; page < maxPages; page++) {
            const params = new URLSearchParams();
            if (readApiKey && !readApiKey.startsWith('YOUR_')) params.append('api_key', readApiKey);
            params.append('results', pageSize);
            if (average) {
                params.append('average', average);
                params.append('round', 2);
            }
            if (cursor) params.append('start', this.formatDateForApi(cursor));
            if (endDate) params.append('end', this.formatDateForApi(endDate));

            const response = await fetch(`${baseUrl}?${params.toString()}`);
            if (!response.ok) {
                if (page === 0) throw new Error(`Error HTTP: ${response.status}`);
                console.warn(`⚠️ Error HTTP ${response.status} a la pàgina ${page}`);
                break;
            }

            const data = await response.json();
            if (page === 0) channel = data.channel || {};
            const feeds = data.feeds || [];
            if (feeds.length === 0) break;

            let added = 0;
            for (const feed of feeds) {
                // Amb mitjanes no hi ha entry_id: la clau és el timestamp
                const key = feed.entry_id ?? feed.created_at;
                if (seen.has(key)) continue;
                seen.add(key);
                allFeeds.push(this.processEntry(feed, school));
                added++;
            }

            // Última pàgina (o sense res nou): parem
            if (feeds.length < pageSize || added === 0) break;

            // Següent pàgina: just després de l'últim registre rebut
            cursor = new Date(new Date(feeds[feeds.length - 1].created_at).getTime() + 1000);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        allFeeds.sort((a, b) => a.timestamp - b.timestamp);
        return { channel, feeds: allFeeds, average };
    }

    /**
     * Obté l'última lectura d'un canal
     * @param {string} schoolId - Identificador de l'escola
     * @returns {Promise<Object>} - Última lectura
     */
    async fetchLastEntry(schoolId) {
        const school = Stations.get(schoolId);
        if (!school) {
            throw new Error(`Estació no trobada: ${schoolId}`);
        }

        await Stations.ensureFields(school);

        const { channelId, readApiKey } = school.thingspeak;
        const url = `${this.baseUrl}/channels/${channelId}/feeds/last.json${this.keyQuery(readApiKey)}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return this.processEntry(data, school);
        } catch (error) {
            console.error(`❌ Error obtenint última entrada de ${school.name}:`, error);
            throw error;
        }
    }

    /**
     * Últimes N lectures (més recent al final). Serveix perquè cada magnitud
     * trobi el seu últim valor encara que la placa no envii tots els camps a cada escriptura.
     */
    async fetchRecentEntries(schoolId, count = 30) {
        const school = Stations.get(schoolId);
        if (!school) throw new Error(`Estació no trobada: ${schoolId}`);
        await Stations.ensureFields(school);
        const { channelId, readApiKey } = school.thingspeak;
        const key = this.keyQuery(readApiKey);
        const url = `${this.baseUrl}/channels/${channelId}/feeds.json${key ? key + '&' : '?'}results=${count}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        return (data.feeds || []).map(f => this.processEntry(f, school));
    }

    /**
     * Obté informació del canal (metadades)
     * @param {string} schoolId - Identificador de l'escola
     * @returns {Promise<Object>} - Informació del canal
     */
    async fetchChannelInfo(schoolId) {
        const school = Stations.get(schoolId);
        if (!school) {
            throw new Error(`Estació no trobada: ${schoolId}`);
        }

        const { channelId, readApiKey } = school.thingspeak;
        const url = `${this.baseUrl}/channels/${channelId}.json${this.keyQuery(readApiKey)}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`❌ Error obtenint info del canal de ${school.name}:`, error);
            throw error;
        }
    }

    /**
     * Processa una entrada individual
     */
    processEntry(entry, school) {
        const processed = {
            entry_id: entry.entry_id,
            timestamp: new Date(entry.created_at),
            created_at: entry.created_at
        };

        // Processar cada camp
        Object.keys(school.fields).forEach(fieldKey => {
            const value = entry[fieldKey];
            let parsed = value !== null && value !== undefined && value !== '' 
                ? parseFloat(value) 
                : null;
            
            // Escala configurable per camp (p. ex. vent del kit micro:bit en cm/h → scale 0.01)
            const scale = this.getFieldScale(school.fields[fieldKey]);
            if (parsed !== null && !isNaN(parsed)) parsed = parsed * scale;
            
            processed[fieldKey] = parsed;
        });

        return processed;
    }

    /** Factor d'escala d'un camp (p. ex. vent del kit micro:bit en cm/h → 0.01). Per defecte 1. */
    getFieldScale(field) {
        return field && typeof field.scale === 'number' ? field.scale : 1;
    }

    /**
     * Calcula estadístiques per a les dades
     */
    calculateStats(feeds, school) {
        const stats = {};
        
        Object.keys(school.fields).forEach(fieldKey => {
            const values = feeds
                .map(f => f[fieldKey])
                .filter(v => v !== null && v !== undefined && !isNaN(v));
            
            if (values.length > 0) {
                stats[fieldKey] = {
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                    count: values.length,
                    current: values[values.length - 1]
                };
            } else {
                stats[fieldKey] = null;
            }
        });

        return stats;
    }

    /** Cadena `?api_key=` només si hi ha clau (els canals públics no la necessiten) */
    keyQuery(readApiKey) {
        return readApiKey && !readApiKey.startsWith('YOUR_') ? `?api_key=${readApiKey}` : '';
    }

    /** Un canal està configurat si té un channelId real */
    isConfigured(schoolId) {
        const ts = Stations.get(schoolId)?.thingspeak;
        return !!ts && !!ts.channelId && !String(ts.channelId).startsWith('YOUR_');
    }

    /**
     * Formata una data per l'API de ThingSpeak
     */
    formatDateForApi(date) {
        return date.toISOString();
    }

    /**
     * Gestió del cache
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Comprova si el canal està actiu (ha enviat dades recentment)
     */
    async checkChannelStatus(schoolId, maxMinutesInactive = 30) {
        try {
            const lastEntry = await this.fetchLastEntry(schoolId);
            const now = new Date();
            const diff = (now - lastEntry.timestamp) / 1000 / 60; // minuts
            
            return {
                online: diff < maxMinutesInactive,
                lastUpdate: lastEntry.timestamp,
                minutesSinceUpdate: Math.round(diff)
            };
        } catch (error) {
            return {
                online: false,
                lastUpdate: null,
                error: error.message
            };
        }
    }
}

// Crear instància global
const thingSpeakService = new ThingSpeakService();
