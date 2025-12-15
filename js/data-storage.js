/**
 * ============================================
 * MÒDUL D'EMMAGATZEMATGE DE DADES
 * ============================================
 * 
 * Aquest mòdul gestiona l'emmagatzematge local i la sincronització
 * de dades amb els arxius JSON del servidor.
 */

class DataStorage {
    constructor() {
        this.storageKey = 'weatherStationData';
        this.useLocalStorage = CONFIG.storage.useLocalStorage;
    }

    /**
     * Guarda dades al localStorage
     * @param {string} schoolId - Identificador de l'escola
     * @param {Object} data - Dades a guardar
     */
    saveToLocal(schoolId, data) {
        if (!this.useLocalStorage) return;

        try {
            const storageData = this.getAllLocalData();
            storageData[schoolId] = {
                data: data,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(storageData));
            console.log(`💾 Dades guardades localment per ${schoolId}`);
        } catch (error) {
            console.error('Error guardant dades localment:', error);
        }
    }

    /**
     * Obté dades del localStorage
     * @param {string} schoolId - Identificador de l'escola
     * @returns {Object|null} - Dades guardades o null
     */
    getFromLocal(schoolId) {
        if (!this.useLocalStorage) return null;

        try {
            const storageData = this.getAllLocalData();
            const schoolData = storageData[schoolId];
            
            if (schoolData) {
                // Comprovar si les dades han caducat
                const savedAt = new Date(schoolData.savedAt);
                const now = new Date();
                if ((now - savedAt) < CONFIG.storage.cacheExpiry) {
                    return schoolData.data;
                }
            }
            return null;
        } catch (error) {
            console.error('Error llegint dades locals:', error);
            return null;
        }
    }

    /**
     * Obté totes les dades locals
     */
    getAllLocalData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Neteja les dades locals
     */
    clearLocal(schoolId = null) {
        if (schoolId) {
            const storageData = this.getAllLocalData();
            delete storageData[schoolId];
            localStorage.setItem(this.storageKey, JSON.stringify(storageData));
        } else {
            localStorage.removeItem(this.storageKey);
        }
    }

    /**
     * Carrega dades des d'un arxiu JSON del servidor (GitHub Pages)
     * @param {string} schoolId - Identificador de l'escola
     * @param {string} month - Mes en format YYYY-MM (opcional)
     * @returns {Promise<Object>} - Dades carregades
     */
    async loadFromServer(schoolId, month = null) {
        // Construir URL base
        const baseUrl = CONFIG.getDataUrl ? CONFIG.getDataUrl() : CONFIG.storage.dataPath;
        
        // Si no hi ha mes especificat, obtenir el mes actual
        if (!month) {
            const now = new Date();
            month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        
        const url = `${baseUrl}${schoolId}/${month}.json`;
        console.log(`📡 Intentant carregar: ${url}`);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`📄 Arxiu no trobat: ${fileName}`);
                    return null;
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`📥 Dades carregades des del servidor: ${fileName}`);
            return data;
        } catch (error) {
            console.warn(`No s'han pogut carregar les dades del servidor:`, error);
            return null;
        }
    }

    /**
     * Carrega l'índex de dades disponibles
     * @returns {Promise<Object>} - Índex de dades
     */
    async loadDataIndex() {
        try {
            const baseUrl = CONFIG.getDataUrl ? CONFIG.getDataUrl() : CONFIG.storage.dataPath;
            const response = await fetch(`${baseUrl}index.json`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.warn('No s\'ha pogut carregar l\'índex de dades');
            return null;
        }
    }

    /**
     * Carrega dades de múltiples mesos
     * @param {string} schoolId - Identificador de l'escola
     * @param {Date} startDate - Data d'inici
     * @param {Date} endDate - Data de fi
     * @returns {Promise<Array>} - Dades combinades
     */
    async loadMonthsData(schoolId, startDate, endDate) {
        const months = [];
        const current = new Date(startDate);
        current.setDate(1);
        
        while (current <= endDate) {
            months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
            current.setMonth(current.getMonth() + 1);
        }
        
        const allData = [];
        
        for (const month of months) {
            try {
                const data = await this.loadFromServer(schoolId, month);
                if (data && Array.isArray(data)) {
                    allData.push(...data);
                }
            } catch (e) {
                console.log(`No hi ha dades per ${schoolId} - ${month}`);
            }
        }
        
        return allData;
    }

    /**
     * Obté les dades combinant localStorage i servidor
     * @param {string} schoolId - Identificador de l'escola
     * @param {Date} startDate - Data d'inici
     * @param {Date} endDate - Data de fi
     * @returns {Promise<Object>} - Dades combinades
     */
    async getData(schoolId, startDate = null, endDate = null) {
        // Primer, intentar des del localStorage
        const localData = this.getFromLocal(schoolId);
        if (localData && !startDate && !endDate) {
            return localData;
        }

        // Si no, intentar des del servidor
        let serverData = null;
        try {
            serverData = await this.loadFromServer(schoolId);
        } catch (e) {
            // Ignorar error i continuar amb ThingSpeak
        }

        // Finalment, obtenir de ThingSpeak
        try {
            const thingspeakData = await thingSpeakService.fetchChannelData(
                schoolId, 
                startDate, 
                endDate
            );
            
            // Guardar localment
            this.saveToLocal(schoolId, thingspeakData);
            
            return thingspeakData;
        } catch (error) {
            // Si falla ThingSpeak, retornar dades del servidor si existeixen
            if (serverData) return serverData;
            throw error;
        }
    }

    /**
     * Filtra les dades per rang de dates
     * @param {Object} data - Dades completes
     * @param {Date} startDate - Data d'inici
     * @param {Date} endDate - Data de fi
     * @returns {Object} - Dades filtrades
     */
    filterByDateRange(data, startDate, endDate) {
        if (!data || !data.feeds) return data;

        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();

        const filteredFeeds = data.feeds.filter(feed => {
            const timestamp = new Date(feed.timestamp);
            return timestamp >= start && timestamp <= end;
        });

        // Recalcular fieldData
        const fieldData = {};
        const school = data.school;
        
        if (school && school.fields) {
            Object.keys(school.fields).forEach(fieldKey => {
                fieldData[fieldKey] = {
                    ...school.fields[fieldKey],
                    data: filteredFeeds.map(feed => ({
                        timestamp: feed.timestamp,
                        value: feed[fieldKey]
                    })).filter(item => item.value !== null && item.value !== undefined)
                };
            });
        }

        return {
            ...data,
            feeds: filteredFeeds,
            fieldData: fieldData,
            stats: this.recalculateStats(filteredFeeds, school)
        };
    }

    /**
     * Recalcula estadístiques per a un conjunt de dades
     */
    recalculateStats(feeds, school) {
        if (!school || !school.fields) return {};
        
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
     * Exporta les dades a JSON (per descarregar)
     * @param {Object} data - Dades a exportar
     * @param {string} filename - Nom del fitxer
     */
    exportToJson(data, filename = 'weather_data.json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Exporta les dades a CSV
     * @param {Object} data - Dades a exportar
     * @param {string} filename - Nom del fitxer
     */
    exportToCsv(data, filename = 'weather_data.csv') {
        if (!data || !data.feeds || data.feeds.length === 0) {
            console.warn('No hi ha dades per exportar');
            return;
        }

        const school = data.school;
        const headers = ['Timestamp'];
        const fieldKeys = Object.keys(school.fields);
        
        fieldKeys.forEach(key => {
            headers.push(school.fields[key].name);
        });

        let csv = headers.join(',') + '\n';

        data.feeds.forEach(feed => {
            const row = [feed.timestamp.toISOString()];
            fieldKeys.forEach(key => {
                row.push(feed[key] !== null && feed[key] !== undefined ? feed[key] : '');
            });
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Crear instància global
const dataStorage = new DataStorage();
