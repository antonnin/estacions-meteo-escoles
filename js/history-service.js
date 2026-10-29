/**
 * ============================================
 * HISTÒRIC (full de càlcul via Apps Script)
 * ============================================
 *
 * L'Apps Script guarda cada hora la mitjana de cada estació al full de
 * càlcul i la serveix per aquí. Això permet graficar l'històric sense
 * dependre de les quotes ni de la retenció de ThingSpeak.
 */

class HistoryService {
    get enabled() {
        return !!CONFIG.api.url;
    }

    /**
     * @returns {Promise<Array>} entrades { created_at, field1.. } (mitjanes horàries)
     */
    async fetch(stationId, startDate, endDate) {
        if (!this.enabled) throw new Error('Històric no configurat');
        const params = new URLSearchParams({
            action: 'history',
            id: stationId,
            from: startDate.toISOString(),
            to: endDate.toISOString(),
        });
        const res = await fetch(`${CONFIG.api.url}?${params}`);
        if (!res.ok) throw new Error(`Històric: HTTP ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(`Històric: ${json.error}`);
        return json.rows || [];
    }
}

const historyService = new HistoryService();
