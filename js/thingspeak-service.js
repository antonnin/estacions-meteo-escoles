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
     * Obté les dades d'un canal de ThingSpeak amb suport per paginació
     * @param {string} schoolId - Identificador de l'escola
     * @param {Date} startDate - Data d'inici (opcional)
     * @param {Date} endDate - Data de fi (opcional)
     * @returns {Promise<Object>} - Dades del canal (combinades de múltiples requests si cal)
     */
    async fetchChannelData(schoolId, startDate = null, endDate = null) {
        const school = CONFIG.schools[schoolId];
        if (!school) {
            throw new Error(`Escola no trobada: ${schoolId}`);
        }

        // Comprovar cache primer
        const cacheKey = `${schoolId}_${startDate?.toISOString()}_${endDate?.toISOString()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log(`📦 Dades del cache per ${school.name}`);
            return cached;
        }

        try {
            console.log(`🌐 Obtenint dades de ${school.name}...`);
            
            // Fetch all data with pagination support
            const allFeeds = await this._fetchAllChannelFeeds(school, startDate, endDate);
            
            // Processar i normalitzar les dades
            const data = {
                channel: allFeeds.channel || {},
                school: school,
                feeds: allFeeds.feeds || [],
                fieldData: {},
                stats: {}
            };
            
            // Separar dades per camp
            Object.keys(school.fields).forEach(fieldKey => {
                data.fieldData[fieldKey] = {
                    ...school.fields[fieldKey],
                    data: allFeeds.feeds.map(feed => ({
                        timestamp: feed.timestamp,
                        value: feed[fieldKey]
                    })).filter(item => item.value !== null && item.value !== undefined)
                };
            });

            // Calcular estadístiques
            data.stats = this.calculateStats(allFeeds.feeds, school);
            
            // Guardar al cache
            this.saveToCache(cacheKey, data);
            
            return data;
        } catch (error) {
            console.error(`❌ Error obtenint dades de ${school.name}:`, error);
            throw error;
        }
    }

    /**
     * Obté totes les dades del canal amb paginació automàtica
     * @private
     */
    async _fetchAllChannelFeeds(school, startDate, endDate) {
        const { channelId, readApiKey } = school.thingspeak;
        let allFeeds = [];
        let page = 0;
        let hasMoreData = true;
        const baseUrl = `${this.baseUrl}/channels/${channelId}/feeds.json`;

        while (hasMoreData) {
            try {
                const params = new URLSearchParams();
                params.append('api_key', readApiKey);
                params.append('results', CONFIG.thingspeak.resultsPerRequest);
                
                // Afegir paginació
                const offset = page * CONFIG.thingspeak.resultsPerRequest;
                if (offset > 0) {
                    params.append('offset', offset);
                }
                
                if (startDate) {
                    params.append('start', this.formatDateForApi(startDate));
                }
                if (endDate) {
                    params.append('end', this.formatDateForApi(endDate));
                }
                
                const url = baseUrl + '?' + params.toString();
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                const feeds = data.feeds || [];

                if (feeds.length === 0) {
                    hasMoreData = false;
                    if (page === 0) {
                        // Primera petició i no hi ha dades
                        return data;
                    }
                } else {
                    // Processar feeds
                    const processedFeeds = feeds.map(feed => this.processEntry(feed, school));
                    allFeeds = processedFeeds.concat(allFeeds); // Afegir al principi (per mantenir ordre cronològic)
                    
                    if (feeds.length < CONFIG.thingspeak.resultsPerRequest) {
                        // Hem rebut menys resultats que el màxim, significa que no hi ha més dades
                        hasMoreData = false;
                    } else {
                        // Potser hi ha més dades, intenta la pàgina següent
                        page++;
                        // Afegir petita espera per evitar rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                if (page === 0 && feeds.length > 0) {
                    // Retornar info del canal de la primera petició
                    return {
                        channel: data.channel,
                        feeds: allFeeds
                    };
                }
            } catch (error) {
                console.warn(`⚠️ Error en pàgina ${page}:`, error);
                hasMoreData = false;
            }
        }

        return {
            channel: {},
            feeds: allFeeds
        };
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
            let parsed = value !== null && value !== undefined && value !== '' 
                ? parseFloat(value) 
                : null;
            
            // Convert wind from cm/h to km/h (divide by 100)
            if (fieldKey === 'field5' && parsed !== null && !isNaN(parsed)) {
                parsed = parsed / 100;
            }
            
            processed[fieldKey] = parsed;
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
