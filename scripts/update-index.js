/**
 * Script per actualitzar l'índex de dades disponibles
 * Executat per GitHub Actions després de recollir dades
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Escaneja els fitxers de dades disponibles
 */
function scanDataFiles() {
    const index = {
        lastUpdate: new Date().toISOString(),
        schools: {}
    };

    // Llegir directoris d'escoles
    const schoolDirs = fs.readdirSync(DATA_DIR).filter(item => {
        const itemPath = path.join(DATA_DIR, item);
        return fs.statSync(itemPath).isDirectory() && item.startsWith('escola');
    });

    for (const schoolId of schoolDirs) {
        const schoolDir = path.join(DATA_DIR, schoolId);
        const files = fs.readdirSync(schoolDir).filter(f => f.endsWith('.json') && f !== 'channel-info.json');
        
        // Extreure els mesos disponibles
        const months = files.map(f => f.replace('.json', '')).sort();
        
        // Obtenir info del canal si existeix
        let channelInfo = null;
        const channelInfoPath = path.join(schoolDir, 'channel-info.json');
        if (fs.existsSync(channelInfoPath)) {
            try {
                channelInfo = JSON.parse(fs.readFileSync(channelInfoPath, 'utf8'));
            } catch (e) {
                console.error(`Error llegint channel-info de ${schoolId}:`, e);
            }
        }

        // Calcular rang de dates i total de registres
        let totalRecords = 0;
        let earliestDate = null;
        let latestDate = null;

        for (const month of months) {
            const filePath = path.join(schoolDir, `${month}.json`);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                totalRecords += data.length;
                
                if (data.length > 0) {
                    const firstDate = new Date(data[0].timestamp);
                    const lastDate = new Date(data[data.length - 1].timestamp);
                    
                    if (!earliestDate || firstDate < earliestDate) {
                        earliestDate = firstDate;
                    }
                    if (!latestDate || lastDate > latestDate) {
                        latestDate = lastDate;
                    }
                }
            } catch (e) {
                console.error(`Error processant ${filePath}:`, e);
            }
        }

        // Check if school has recent data (within last hour)
        const now = new Date();
        const recentData = latestDate && (now - latestDate) <= ONE_HOUR_MS;
        
        index.schools[schoolId] = {
            availableMonths: months,
            channelInfo: channelInfo,
            recentData: recentData,
            stats: {
                totalRecords: totalRecords,
                earliestDate: earliestDate ? earliestDate.toISOString() : null,
                latestDate: latestDate ? latestDate.toISOString() : null,
            }
        };

        console.log(`📊 ${schoolId}: ${months.length} mesos, ${totalRecords} registres, recentData: ${recentData}`);
    }

    return index;
}

/**
 * Funció principal
 */
function main() {
    console.log('📋 Actualitzant índex de dades...\n');
    
    const index = scanDataFiles();
    
    const indexPath = path.join(DATA_DIR, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    
    console.log(`\n✅ Índex actualitzat: ${indexPath}`);
}

main();
