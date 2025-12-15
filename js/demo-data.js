/**
 * ============================================
 * MODE DEMO - DADES SIMULADES
 * ============================================
 * 
 * Aquest mòdul genera dades simulades per provar
 * la interfície sense necessitat de claus ThingSpeak reals.
 * 
 * Per activar el mode demo:
 * - Canvia DEMO_MODE = true a config.js
 * - O afegeix ?demo=true a la URL
 */

const DemoDataGenerator = {
    /**
     * Comprova si el mode demo està actiu
     */
    isEnabled() {
        // Comprovar URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true') return true;
        
        // Comprovar config
        if (typeof CONFIG !== 'undefined' && CONFIG.demoMode === true) return true;
        
        return false;
    },

    /**
     * Genera dades simulades per a una escola
     * @param {string} schoolId - ID de l'escola
     * @param {Date} startDate - Data d'inici
     * @param {Date} endDate - Data de fi
     * @returns {Object} - Dades simulades
     */
    generateSchoolData(schoolId, startDate, endDate) {
        const school = CONFIG.schools[schoolId];
        if (!school) return null;

        const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
        const end = endDate || new Date();
        
        // Generar punts de dades (cada 15 minuts)
        const feeds = [];
        const interval = 15 * 60 * 1000; // 15 minuts en ms
        let currentTime = new Date(start);
        let entryId = 1;

        while (currentTime <= end) {
            const feed = this.generateFeedEntry(currentTime, school, entryId);
            feeds.push(feed);
            currentTime = new Date(currentTime.getTime() + interval);
            entryId++;
        }

        // Processar dades
        const fieldData = {};
        Object.keys(school.fields).forEach(fieldKey => {
            fieldData[fieldKey] = {
                ...school.fields[fieldKey],
                data: feeds.map(feed => ({
                    timestamp: feed.timestamp,
                    value: feed[fieldKey]
                })).filter(item => item.value !== null)
            };
        });

        return {
            channel: {
                id: `demo_${schoolId}`,
                name: school.name,
                description: school.description,
                created_at: start.toISOString(),
                updated_at: end.toISOString()
            },
            school: school,
            feeds: feeds,
            fieldData: fieldData,
            stats: this.calculateStats(feeds, school)
        };
    },

    /**
     * Genera una entrada individual de dades
     */
    generateFeedEntry(timestamp, school, entryId) {
        const hour = timestamp.getHours();
        const isDay = hour >= 7 && hour <= 20;
        
        // Variació sinusoïdal per simular cicle diürn
        const dayProgress = (hour - 6) / 12; // 0 a 1 durant el dia
        const tempVariation = Math.sin(dayProgress * Math.PI) * 8;
        
        const entry = {
            entry_id: entryId,
            timestamp: new Date(timestamp),
            created_at: timestamp.toISOString()
        };

        // Generar cada camp amb valors realistes
        const baseTemp = 15 + tempVariation + this.randomVariation(2);
        
        entry.field1 = Math.round((baseTemp) * 10) / 10; // Temperatura
        entry.field2 = Math.round((60 - tempVariation * 2 + this.randomVariation(10)) * 10) / 10; // Humitat
        entry.field3 = Math.round((1013 + this.randomVariation(10)) * 10) / 10; // Pressió
        entry.field4 = isDay ? Math.round(500 + Math.sin(dayProgress * Math.PI) * 400 + this.randomVariation(100)) : Math.round(this.randomVariation(20)); // Llum
        entry.field5 = Math.round((40 + this.randomVariation(15)) * 10) / 10; // Soroll
        entry.field6 = isDay ? Math.round((3 + Math.sin(dayProgress * Math.PI) * 4 + this.randomVariation(1)) * 10) / 10 : 0; // UV
        entry.field7 = Math.random() > 0.9 ? Math.round(this.randomVariation(5) * 10) / 10 : 0; // Pluja
        entry.field8 = Math.round((2 + this.randomVariation(3)) * 10) / 10; // Vent

        return entry;
    },

    /**
     * Genera variació aleatòria
     */
    randomVariation(max) {
        return (Math.random() - 0.5) * 2 * max;
    },

    /**
     * Calcula estadístiques
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
            }
        });

        return stats;
    }
};

// Interceptar el servei de ThingSpeak si mode demo actiu
if (typeof ThingSpeakService !== 'undefined') {
    const originalFetch = ThingSpeakService.prototype.fetchChannelData;
    
    ThingSpeakService.prototype.fetchChannelData = async function(schoolId, startDate, endDate) {
        if (DemoDataGenerator.isEnabled()) {
            console.log('🎭 Mode Demo actiu - Generant dades simulades...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Simular latència
            return DemoDataGenerator.generateSchoolData(schoolId, startDate, endDate);
        }
        return originalFetch.call(this, schoolId, startDate, endDate);
    };
}

// Exportar per ús directe
if (typeof window !== 'undefined') {
    window.DemoDataGenerator = DemoDataGenerator;
}
