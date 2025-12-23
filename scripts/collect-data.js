/**
 * Script de recollida de dades de ThingSpeak
 * Executat per GitHub Actions cada hora
 */

const fs = require('fs');
const path = require('path');

// Configuració de les escoles des de variables d'entorn
const SCHOOLS = [
    { id: 'escola1', channelId: process.env.ESCOLA1_CHANNEL_ID, apiKey: process.env.ESCOLA1_API_KEY },
    { id: 'escola2', channelId: process.env.ESCOLA2_CHANNEL_ID, apiKey: process.env.ESCOLA2_API_KEY },
    { id: 'escola3', channelId: process.env.ESCOLA3_CHANNEL_ID, apiKey: process.env.ESCOLA3_API_KEY },
    { id: 'escola4', channelId: process.env.ESCOLA4_CHANNEL_ID, apiKey: process.env.ESCOLA4_API_KEY },
    { id: 'escola5', channelId: process.env.ESCOLA5_CHANNEL_ID, apiKey: process.env.ESCOLA5_API_KEY },
    { id: 'escola6', channelId: process.env.ESCOLA6_CHANNEL_ID, apiKey: process.env.ESCOLA6_API_KEY },
];

const THINGSPEAK_BASE_URL = 'https://api.thingspeak.com/channels';

/**
 * Obté les dades d'un canal de ThingSpeak
 */
async function fetchThingSpeakData(channelId, apiKey, results = 100) {
    const url = `${THINGSPEAK_BASE_URL}/${channelId}/feeds.json?api_key=${apiKey}&results=${results}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filtrar només dades a partir del 23 de desembre de 2025
    const cutoffDate = new Date('2025-12-23T00:00:00Z');
    if (data.feeds) {
        data.feeds = data.feeds.filter(feed => {
            const feedDate = new Date(feed.created_at);
            return feedDate >= cutoffDate;
        });
    }
    
    return data;
}

/**
 * Guarda les dades en un fitxer JSON organitzat per mes
 */
function saveData(schoolId, data) {
    if (!data.feeds || data.feeds.length === 0) {
        console.log(`No hi ha dades noves per ${schoolId}`);
        return;
    }

    const dataDir = path.join(__dirname, '..', 'data', schoolId);
    
    // Crear directori si no existeix
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Organitzar dades per mes
    const dataByMonth = {};
    
    data.feeds.forEach(feed => {
        const date = new Date(feed.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!dataByMonth[monthKey]) {
            dataByMonth[monthKey] = [];
        }
        
        dataByMonth[monthKey].push({
            timestamp: feed.created_at,
            entry_id: feed.entry_id,
            field1: parseFloat(feed.field1) || null,
            field2: parseFloat(feed.field2) || null,
            field3: parseFloat(feed.field3) || null,
            field4: parseFloat(feed.field4) || null,
            field5: parseFloat(feed.field5) || null,
            field6: parseFloat(feed.field6) || null,
            field7: parseFloat(feed.field7) || null,
            field8: parseFloat(feed.field8) || null,
        });
    });

    // Guardar cada mes en un fitxer separat
    for (const [month, feeds] of Object.entries(dataByMonth)) {
        const filePath = path.join(dataDir, `${month}.json`);
        
        let existingData = [];
        
        // Carregar dades existents si el fitxer existeix
        if (fs.existsSync(filePath)) {
            try {
                existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                console.error(`Error llegint ${filePath}:`, e);
                existingData = [];
            }
        }

        // Crear un Set amb els entry_id existents per evitar duplicats
        const existingIds = new Set(existingData.map(d => d.entry_id));
        
        // Afegir només les noves entrades
        const newFeeds = feeds.filter(f => !existingIds.has(f.entry_id));
        
        if (newFeeds.length > 0) {
            const mergedData = [...existingData, ...newFeeds];
            // Ordenar per timestamp
            mergedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            fs.writeFileSync(filePath, JSON.stringify(mergedData, null, 2));
            console.log(`✅ ${schoolId}: Afegides ${newFeeds.length} noves entrades a ${month}.json`);
        } else {
            console.log(`ℹ️ ${schoolId}: No hi ha entrades noves per ${month}`);
        }
    }
    
    // Netejar fitxers de dades més antics de 30 dies
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(dataDir);
    
    for (const file of files) {
        if (file.endsWith('.json') && file !== 'channel-info.json') {
            const filePath = path.join(dataDir, file);
            const fileMonth = file.replace('.json', '');
            const [year, month] = fileMonth.split('-').map(Number);
            const fileDate = new Date(year, month - 1, 1);
            
            if (fileDate < thirtyDaysAgo) {
                fs.unlinkSync(filePath);
                console.log(`🧹 ${schoolId}: Eliminat fitxer antic ${file}`);
            }
        }
    }

    // Guardar info del canal
    const channelInfoPath = path.join(dataDir, 'channel-info.json');
    const channelInfo = {
        id: data.channel.id,
        name: data.channel.name,
        description: data.channel.description,
        latitude: data.channel.latitude,
        longitude: data.channel.longitude,
        created_at: data.channel.created_at,
        updated_at: data.channel.updated_at,
        last_entry_id: data.channel.last_entry_id,
        field1: data.channel.field1,
        field2: data.channel.field2,
        field3: data.channel.field3,
        field4: data.channel.field4,
        field5: data.channel.field5,
        field6: data.channel.field6,
        field7: data.channel.field7,
        field8: data.channel.field8,
    };
    fs.writeFileSync(channelInfoPath, JSON.stringify(channelInfo, null, 2));
}

/**
 * Funció principal
 */
async function main() {
    console.log('🌤️ Iniciant recollida de dades meteorològiques...');
    console.log(`📅 ${new Date().toISOString()}\n`);

    for (const school of SCHOOLS) {
        if (!school.channelId || !school.apiKey) {
            console.log(`⚠️ ${school.id}: Sense configuració (secrets no definits)`);
            continue;
        }

        try {
            console.log(`📡 Recollint dades de ${school.id}...`);
            const data = await fetchThingSpeakData(school.channelId, school.apiKey);
            saveData(school.id, data);
        } catch (error) {
            console.error(`❌ Error amb ${school.id}:`, error.message);
        }
    }

    console.log('\n✨ Recollida de dades completada!');
}

main().catch(console.error);
