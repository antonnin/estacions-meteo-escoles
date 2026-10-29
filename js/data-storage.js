/**
 * ============================================
 * UTILITATS DE DADES (filtre, estadístiques, exportació)
 * ============================================
 */

class DataStorage {
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
