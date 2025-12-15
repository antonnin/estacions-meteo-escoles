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
        this.cacheExpiry = CONFIG.storage.cacheExpiry || 300000; // 5 minuts
    }

    /**
     * Obté les dades d'un canal de ThingSpeak
     * @param {string} schoolId - Identificador de l'escola
     * @param {Date} startDate - Data d'inici (opcional)
     * @param {Date} endDate - Data de fi (opcional)
     * @returns {Promise<Object>} - Dades del canal
     */
    async fetchChannelData(schoolId, startDate = null, endDate = null) {
        const school = CONFIG.schools[schoolId];
        if (!school) {
            throw new Error(`Escola no trobada: ${schoolId}`);
        }

        const { channelId, readApiKey } = school.thingspeak;
        
        // Construir URL amb paràmetres
        let url = `${this.baseUrl}/channels/${channelId}/feeds.json`;
        const params = new URLSearchParams();
        
        params.append('api_key', readApiKey);
        params.append('results', CONFIG.thingspeak.resultsPerRequest);
        
        if (startDate) {
            params.append('start', this.formatDateForApi(startDate));
        }
        if (endDate) {
            params.append('end', this.formatDateForApi(endDate));
        }
        
        url += '?' + params.toString();

        // Comprovar cache
        const cacheKey = `${schoolId}_${startDate?.toISOString()}_${endDate?.toISOString()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log(`📦 Dades del cache per ${school.name}`);
            return cached;
        }

        try {
            console.log(`🌐 Obtenint dades de ${school.name}...`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Processar i normalitzar les dades
            const processedData = this.processChannelData(data, school);
            
            // Guardar al cache
            this.saveToCache(cacheKey, processedData);
            
            return processedData;
        } catch (error) {
            console.error(`❌ Error obtenint dades de ${school.name}:`, error);
            throw error;
        }
    }

    /**
     * Obté l'última lectura d'un canal
     * @param {string} schoolId - Identificador de l'escola
     * @returns {Promise<Object>} - Última lectura
     */
    async fetchLastEntry(schoolId) {
        const school = CONFIG.schools[schoolId];
        if (!school) {
            throw new Error(`Escola no trobada: ${schoolId}`);
        }

        const { channelId, readApiKey } = school.thingspeak;
        const url = `${this.baseUrl}/channels/${channelId}/feeds/last.json?api_key=${readApiKey}`;

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
     * Obté informació del canal (metadades)
     * @param {string} schoolId - Identificador de l'escola
     * @returns {Promise<Object>} - Informació del canal
     */
    async fetchChannelInfo(schoolId) {
        const school = CONFIG.schools[schoolId];
        if (!school) {
            throw new Error(`Escola no trobada: ${schoolId}`);
        }

        const { channelId, readApiKey } = school.thingspeak;
        const url = `${this.baseUrl}/channels/${channelId}.json?api_key=${readApiKey}`;

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
     * Processa les dades del canal i les normalitza
     */
    processChannelData(data, school) {
        const channel = data.channel || {};
        const feeds = data.feeds || [];
        
        // Processar cada entrada
        const processedFeeds = feeds.map(feed => this.processEntry(feed, school));
        
        // Separar dades per camp
        const fieldData = {};
        Object.keys(school.fields).forEach(fieldKey => {
            fieldData[fieldKey] = {
                ...school.fields[fieldKey],
                data: processedFeeds.map(feed => ({
                    timestamp: feed.timestamp,
                    value: feed[fieldKey]
                })).filter(item => item.value !== null && item.value !== undefined)
            };
        });

        return {
            channel: {
                id: channel.id,
                name: channel.name || school.name,
                description: channel.description || school.description,
                created_at: channel.created_at,
                updated_at: channel.updated_at,
                last_entry_id: channel.last_entry_id
            },
            school: school,
            feeds: processedFeeds,
            fieldData: fieldData,
            stats: this.calculateStats(processedFeeds, school)
        };
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
            processed[fieldKey] = value !== null && value !== undefined && value !== '' 
                ? parseFloat(value) 
                : null;
        });

        return processed;
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
