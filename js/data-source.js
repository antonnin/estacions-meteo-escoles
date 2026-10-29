/**
 * ============================================
 * FONT DE DADES ÚNICA
 * ============================================
 *
 * Decideix d'on surten les dades segons el rang demanat:
 *  - Rang curt (≤ CONFIG.history.minHours)  → ThingSpeak, temps real.
 *  - Rang llarg → històric del full de càlcul + últim tram de ThingSpeak.
 *    Si l'històric falla o no està configurat, es fa servir ThingSpeak amb mitjanes.
 */

class DataSource {
    async fetch(stationId, startDate, endDate) {
        const station = Stations.get(stationId);
        if (!station) throw new Error(`Estació no trobada: ${stationId}`);

        const end = endDate || new Date();
        const start = startDate || new Date(end.getTime() - 24 * 3600 * 1000);
        const hours = (end - start) / 3600000;

        const demo = typeof DemoDataGenerator !== 'undefined' && DemoDataGenerator.isEnabled();
        if (demo || !historyService.enabled || hours <= CONFIG.history.minHours) {
            return thingSpeakService.fetchChannelData(stationId, start, end);
        }

        try {
            await Stations.ensureFields(station);
            const rows = await historyService.fetch(stationId, start, end);
            const feeds = rows.map(r => thingSpeakService.processEntry(r, station));
            feeds.sort((a, b) => a.timestamp - b.timestamp);

            // Omplim el forat entre l'última hora arxivada i ara amb ThingSpeak (mitjanes horàries)
            const lastArchived = feeds.length ? feeds[feeds.length - 1].timestamp : start;
            if (end - lastArchived > 2 * 3600 * 1000) {
                try {
                    const recent = await thingSpeakService._fetchAllChannelFeeds(
                        station, new Date(lastArchived.getTime() + 1000), end, 60);
                    feeds.push(...recent.feeds);
                } catch (e) {
                    console.warn('No s\'ha pogut completar l\'últim tram amb ThingSpeak', e);
                }
            }
            if (!feeds.length) return thingSpeakService.fetchChannelData(stationId, start, end);
            return thingSpeakService.buildDataset(station, feeds, {});
        } catch (e) {
            console.warn('Històric no disponible, uso ThingSpeak', e);
            return thingSpeakService.fetchChannelData(stationId, start, end);
        }
    }
}

const dataSource = new DataSource();
