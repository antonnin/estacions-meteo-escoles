/**
 * ============================================
 * CONFIGURACIÓ GENERAL DE METEO:BIT
 * ============================================
 *
 * Les ESTACIONS ja no es defineixen aquí: viuen al full de càlcul (registre)
 * i s'hi donen d'alta des de la web (alta.html). Aquest fitxer només té
 * els paràmetres globals.
 *
 * Posada en marxa: desplega l'Apps Script (apps-script/README.md) i enganxa
 * aquí les dues URL que et dona.
 */

const CONFIG = {
    // ==========================================
    // BACKEND (Google Apps Script + full de càlcul)
    // ==========================================
    api: {
        // URL de l'aplicació web d'Apps Script (acaba en /exec). Serveix el
        // registre d'estacions (?action=stations) i l'històric (?action=history).
        // Buida = mode local: s'usa data/stations.json i no hi ha històric.
        url: 'https://script.google.com/macros/s/AKfycbxc3ABXa7gEGNISD2muJ3c-zPvfkczqpE2cefziiH-uGTHvYRIRGy3Rh1hrC-SyicOa/exec',
        // URL del Google Form d'alta d'estacions (la de "incrustar", amb ?embedded=true)
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSczdOsUD-_hBLeXFSfCbdwRawMCyGHwxrtDB2ZTwSuyWIlFpw/viewform?embedded=true',
        // Cache local del registre d'estacions (ms)
        registryCacheTtl: 10 * 60 * 1000,
    },

    // ==========================================
    // MODE DEMO - dades simulades (també amb ?demo=true a la URL)
    // ==========================================
    demoMode: false,

    // ==========================================
    // THINGSPEAK (temps real)
    // ==========================================
    thingspeak: {
        baseUrl: 'https://api.thingspeak.com',
        resultsPerRequest: 8000, // Màxim de ThingSpeak per petició
        updateInterval: 60000,   // Refresc automàtic del dashboard (ms)
        cacheTtl: 30000,         // Cache en memòria de peticions (ms); < updateInterval
        maxPages: 10,            // Límit de seguretat de pàgines per petició
        // Mitjanes de ThingSpeak segons la durada del rang (hores → minuts de mitjana).
        averageTiers: [
            { maxHours: 36,  average: null },  // fins a 1,5 dies: dades crues
            { maxHours: 96,  average: 10 },
            { maxHours: 400, average: 60 },
            { maxHours: 9999, average: 240 },
        ],
    },

    // ==========================================
    // HISTÒRIC (full de càlcul via Apps Script)
    // ==========================================
    history: {
        // Per sobre d'aquestes hores es llegeix l'històric del full (mitjanes horàries)
        // i només l'últim tram es demana a ThingSpeak.
        minHours: 36,
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
        subtitle: 'Projecte mentoria 4.0',
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

