/**
 * ============================================
 * CONFIGURACIÓ DE LES ESTACIONS METEOROLÒGIQUES
 * ============================================
 * 
 * INSTRUCCIONS PER AL PROGRAMADOR:
 * 
 * Per afegir o modificar una estació meteorològica:
 * 1. Afegeix una nova entrada a l'objecte SCHOOLS
 * 2. Configura el channelId de ThingSpeak
 * 3. Afegeix la readApiKey del canal
 * 4. Personalitza els camps (fields) segons els sensors connectats
 * 
 * Per obtenir les claus de ThingSpeak:
 * 1. Inicia sessió a https://thingspeak.com
 * 2. Vés al teu canal
 * 3. A "API Keys", copia la "Read API Key"
 * 4. El "Channel ID" es troba a la configuració del canal
 * 
 * CONFIGURACIÓ GITHUB PAGES:
 * 1. Puja aquest projecte a un repositori GitHub
 * 2. Activa GitHub Pages a Settings > Pages > Source: main branch
 * 3. Actualitza GITHUB_USERNAME i GITHUB_REPO a sota
 */

const CONFIG = {
    // ==========================================
    // CONFIGURACIÓ GITHUB - ACTUALITZA AIXÒ!
    // ==========================================
    github: {
        username: 'antonnin',           // ← Canvia pel teu usuari de GitHub
        repository: 'estacions-meteo-escoles', // ← Canvia pel nom del teu repositori
        branch: 'main'
    },

    // ==========================================
    // MODE DEMO - Activa per provar sense API keys
    // ==========================================
    // Posa a true per veure dades simulades, o afegeix ?demo=true a la URL
    demoMode: true,  // ← Canvia a false quan tinguis les API keys reals

    // ==========================================
    // CONFIGURACIÓ GLOBAL DE THINGSPEAK
    // ==========================================
    thingspeak: {
        baseUrl: 'https://api.thingspeak.com',
        resultsPerRequest: 8000, // Màxim 8000 resultats per petició
        updateInterval: 60000,  // Actualització cada 60 segons (en milisegons)
    },

    // ==========================================
    // CONFIGURACIÓ DE LES ESCOLES
    // ==========================================
    // 
    // IMPORTANT: Modifica aquesta secció amb les dades reals de cada escola
    // 
    schools: {
        // ------------------------------------------
        // ESCOLA 1
        // ------------------------------------------
        escola1: {
            id: 'escola1',
            name: 'Escola Mas i Perera',
            description: 'Vilafranca del Penedès (Alt Penedès)',
            location: 'Vilafranca del Penedès',
            website: 'https://agora.xtec.cat/ceip-masiperera/',
            icon: '🌻',
            color: '#FF6B6B',
            gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
            // GPS coordinates for map positioning (from Wikipedia: 41°20′53.75″N 1°41′34.60″E)
            coordinates: { lat: 41.3632, lng: 1.7129 },
            
            // CONFIGURACIÓ THINGSPEAK - MODIFICA AQUÍ
            thingspeak: {
                channelId: 'YOUR_CHANNEL_ID_1',      // ← Substitueix pel Channel ID real
                readApiKey: 'YOUR_READ_API_KEY_1',   // ← Substitueix per la Read API Key real
            },
            
            // CONFIGURACIÓ DELS CAMPS/SENSORS
            // Cada field correspon a un sensor connectat al kit micro:bit
            fields: {
                field1: { name: 'Pols', unit: 'ug/m3', icon: '🫧', color: '#95a5a6', type: 'dust' },
                field2: { name: 'Temperatura', unit: '°C', icon: '🌡️', color: '#FF6B6B', type: 'temperature' },
                field3: { name: 'Humitat', unit: '%', icon: '💧', color: '#54a0ff', type: 'humidity' },
                field4: { name: 'Pressió', unit: 'hPa', icon: '📊', color: '#1dd1a1', type: 'pressure' },
                field5: { name: 'Altura', unit: 'm', icon: '⛰️', color: '#e67e22', type: 'altitude' },
                field6: { name: 'Lluminositat', unit: '%', icon: '☀️', color: '#f1c40f', type: 'light' },
                field7: { name: 'Vent', unit: 'm/s', icon: '💨', color: '#a29bfe', type: 'wind' },
            },
            active: true, // Posa a false si l'estació està inactiva
        },

        // ------------------------------------------
        // ESCOLA 2
        // ------------------------------------------
        escola2: {
            id: 'escola2',
            name: 'Escola Jaume Balmes',
            description: 'Sant Martí Sarroca (Alt Penedès)',
            location: 'Sant Martí Sarroca',
            website: 'https://agora.xtec.cat/escolajaumebalmes/',
            icon: '💡',
            color: '#4ECDC4',
            gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
            // GPS coordinates for map positioning (Sant Martí Sarroca: 41°18′36″N 1°36′37″E)
            coordinates: { lat: 41.3250, lng: 1.6303 },
            
            thingspeak: {
                channelId: 'YOUR_CHANNEL_ID_2',
                readApiKey: 'YOUR_READ_API_KEY_2',
            },
            
            fields: {
                field1: { name: 'Pols', unit: 'ug/m3', icon: '🫧', color: '#95a5a6', type: 'dust' },
                field2: { name: 'Temperatura', unit: '°C', icon: '🌡️', color: '#FF6B6B', type: 'temperature' },
                field3: { name: 'Humitat', unit: '%', icon: '💧', color: '#54a0ff', type: 'humidity' },
                field4: { name: 'Pressió', unit: 'hPa', icon: '📊', color: '#1dd1a1', type: 'pressure' },
                field5: { name: 'Altura', unit: 'm', icon: '⛰️', color: '#e67e22', type: 'altitude' },
                field6: { name: 'Lluminositat', unit: '%', icon: '☀️', color: '#f1c40f', type: 'light' },
                field7: { name: 'Vent', unit: 'm/s', icon: '💨', color: '#a29bfe', type: 'wind' },
            },
            active: true,
        },

        // ------------------------------------------
        // ESCOLA 3
        // ------------------------------------------
        escola3: {
            id: 'escola3',
            name: 'Escola Santa Coloma',
            description: 'Ger (Baixa Cerdanya)',
            location: 'Ger',
            website: 'https://agora.xtec.cat/escsantacolomager/',
            icon: '⭐',
            color: '#667eea',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            coordinates: { lat: 42.4065, lng: 1.9385 },
            
            thingspeak: {
                channelId: 'YOUR_CHANNEL_ID_3',
                readApiKey: 'YOUR_READ_API_KEY_3',
            },
            
            fields: {
                field1: { name: 'Pols', unit: 'ug/m3', icon: '🫧', color: '#95a5a6', type: 'dust' },
                field2: { name: 'Temperatura', unit: '°C', icon: '🌡️', color: '#FF6B6B', type: 'temperature' },
                field3: { name: 'Humitat', unit: '%', icon: '💧', color: '#54a0ff', type: 'humidity' },
                field4: { name: 'Pressió', unit: 'hPa', icon: '📊', color: '#1dd1a1', type: 'pressure' },
                field5: { name: 'Altura', unit: 'm', icon: '⛰️', color: '#e67e22', type: 'altitude' },
                field6: { name: 'Lluminositat', unit: '%', icon: '☀️', color: '#f1c40f', type: 'light' },
                field7: { name: 'Vent', unit: 'm/s', icon: '💨', color: '#a29bfe', type: 'wind' },
            },
            active: true,
        },

        // ------------------------------------------
        // ESCOLA 4
        // ------------------------------------------
        escola4: {
            id: 'escola4',
            name: 'Escola Mar i Cel',
            description: 'Cubelles (Garraf)',
            location: 'Cubelles',
            website: 'https://agora.xtec.cat/ceipmaricel/',
            icon: '🍃',
            color: '#f093fb',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            // GPS coordinates for map positioning (from Wikipedia: 41°12′26″N 1°40′26.4″E)
            coordinates: { lat: 41.2222, lng: 1.6940 },
            
            thingspeak: {
                channelId: 'YOUR_CHANNEL_ID_4',
                readApiKey: 'YOUR_READ_API_KEY_4',
            },
            
            fields: {
                field1: { name: 'Pols', unit: 'ug/m3', icon: '🫧', color: '#95a5a6', type: 'dust' },
                field2: { name: 'Temperatura', unit: '°C', icon: '🌡️', color: '#FF6B6B', type: 'temperature' },
                field3: { name: 'Humitat', unit: '%', icon: '💧', color: '#54a0ff', type: 'humidity' },
                field4: { name: 'Pressió', unit: 'hPa', icon: '📊', color: '#1dd1a1', type: 'pressure' },
                field5: { name: 'Altura', unit: 'm', icon: '⛰️', color: '#e67e22', type: 'altitude' },
                field6: { name: 'Lluminositat', unit: '%', icon: '☀️', color: '#f1c40f', type: 'light' },
                field7: { name: 'Vent', unit: 'm/s', icon: '💨', color: '#a29bfe', type: 'wind' },
            },
            active: true,
        },

        // ------------------------------------------
        // ESCOLA 5
        // ------------------------------------------
        escola5: {
            id: 'escola5',
            name: 'ZER Moianès',
            description: 'Moianès',
            location: 'Moianès',
            website: 'https://agora.xtec.cat/zermoianesllevant/',
            icon: '🌊',
            color: '#4facfe',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            coordinates: { lat: 41.8270, lng: 2.1194 },
            
            thingspeak: {
                channelId: 'YOUR_CHANNEL_ID_5',
                readApiKey: 'YOUR_READ_API_KEY_5',
            },
            
            fields: {
                field1: { name: 'Pols', unit: 'ug/m3', icon: '🫧', color: '#95a5a6', type: 'dust' },
                field2: { name: 'Temperatura', unit: '°C', icon: '🌡️', color: '#FF6B6B', type: 'temperature' },
                field3: { name: 'Humitat', unit: '%', icon: '💧', color: '#54a0ff', type: 'humidity' },
                field4: { name: 'Pressió', unit: 'hPa', icon: '📊', color: '#1dd1a1', type: 'pressure' },
                field5: { name: 'Altura', unit: 'm', icon: '⛰️', color: '#e67e22', type: 'altitude' },
                field6: { name: 'Lluminositat', unit: '%', icon: '☀️', color: '#f1c40f', type: 'light' },
                field7: { name: 'Vent', unit: 'm/s', icon: '💨', color: '#a29bfe', type: 'wind' },
            },
            active: true,
        },

        // ------------------------------------------
        // ESCOLA 6
        // ------------------------------------------
        escola6: {
            id: 'escola6',
            name: 'Escola El Castellot',
            description: 'Castellví de la Marca (Alt Penedès)',
            location: 'Castellví de la Marca',
            website: 'https://agora.xtec.cat/ceipelcastellot/',
            icon: '🏰',
            color: '#ff9ff3',
            gradient: 'linear-gradient(135deg, #ff9ff3 0%, #feca57 100%)',
            coordinates: { lat: 41.3416, lng: 1.6356 },
            
            thingspeak: {
                channelId: '3185873',
                readApiKey: '66411666AE08BXSD',
            },
            
            fields: {
                field1: { name: 'Pols', unit: 'ug/m3', icon: '🫧', color: '#95a5a6', type: 'dust' },
                field2: { name: 'Temperatura', unit: '°C', icon: '🌡️', color: '#FF6B6B', type: 'temperature' },
                field3: { name: 'Humitat', unit: '%', icon: '💧', color: '#54a0ff', type: 'humidity' },
                field4: { name: 'Pressió', unit: 'hPa', icon: '📊', color: '#1dd1a1', type: 'pressure' },
                field5: { name: 'Altura', unit: 'm', icon: '⛰️', color: '#e67e22', type: 'altitude' },
                field6: { name: 'Lluminositat', unit: '%', icon: '☀️', color: '#f1c40f', type: 'light' },
                field7: { name: 'Vent', unit: 'm/s', icon: '💨', color: '#a29bfe', type: 'wind' },
            },
            active: true,
        },
    },

    // ==========================================
    // CONFIGURACIÓ DE L'EMMAGATZEMATGE DE DADES
    // ==========================================
    storage: {
        // Ruta base per als arxius JSON de dades (relatiu a GitHub Pages)
        dataPath: 'data/',
        // Format del nom dels arxius: {schoolId}_{date}.json
        fileNameFormat: '{schoolId}_{date}.json',
        // Utilitza emmagatzematge local del navegador com a cache
        useLocalStorage: true,
        // Temps màxim de cache (en milisegons) - 5 minuts
        cacheExpiry: 300000,
    },

    // ==========================================
    // FUNCIONS AUXILIARS
    // ==========================================
    getDataUrl: function() {
        // Retorna la URL base de les dades segons l'entorn
        if (this.github.username !== 'EL_TEU_USUARI') {
            return `https://${this.github.username}.github.io/${this.github.repository}/data/`;
        }
        // En desenvolupament local, usa ruta relativa
        return 'data/';
    },
    
    isGitHubConfigured: function() {
        return this.github.username !== 'EL_TEU_USUARI';
    },

    // ==========================================
    // CONFIGURACIÓ DE LES GRÀFIQUES
    // ==========================================
    charts: {
        // Colors per defecte de les gràfiques
        defaultColors: [
            '#FF6B6B', '#54a0ff', '#1dd1a1', '#ffeaa7',
            '#00cec9', '#fd79a8', '#74b9ff', '#a29bfe'
        ],
        // Opcions globals de Chart.js
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            hour: 'HH:mm',
                            day: 'dd MMM',
                            week: 'dd MMM',
                            month: 'MMM yyyy'
                        }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 8
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    },

    // ==========================================
    // TEXTOS EN CATALÀ
    // ==========================================
    i18n: {
        title: 'Estació Meteorològica Escolar',
        subtitle: 'Projecte STEM',
        schools: 'Escoles',
        viewData: 'Veure Dades',
        temperature: 'Temperatura',
        humidity: 'Humitat',
        pressure: 'Pressió',
        light: 'Lluminositat',
        noise: 'Soroll',
        uv: 'Índex UV',
        rain: 'Pluja',
        wind: 'Vent',
        startDate: 'Data d\'inici',
        endDate: 'Data de fi',
        update: 'Actualitzar',
        loading: 'Carregant dades...',
        noData: 'No hi ha dades disponibles per aquest període',
        error: 'Error en carregar les dades',
        lastUpdate: 'Última actualització',
        online: 'En línia',
        offline: 'Fora de línia',
        today: 'Avui',
        yesterday: 'Ahir',
        last7days: 'Últims 7 dies',
        last30days: 'Últims 30 dies',
        thisMonth: 'Aquest mes',
        backToHome: '← Tornar a l\'inici',
    }
};

// Exportar per ús en altres mòduls
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

