/**
 * ============================================
 * DASHBOARD - SCRIPT PRINCIPAL
 * ============================================
 * 
 * Gestiona la interfície del dashboard i la interacció amb l'usuari
 */

// Variables globals
let currentSchoolId = null;
let currentSchool = null;
let currentData = null;
let autoUpdateInterval = null;

// Elements DOM
const elements = {
    schoolName: document.getElementById('schoolName'),
    schoolLocation: document.getElementById('schoolLocation'),
    schoolBadge: document.getElementById('schoolBadge'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    currentWeather: document.getElementById('currentWeather'),
    chartsGrid: document.getElementById('chartsGrid'),
    noDataState: document.getElementById('noDataState'),
    updateTime: document.getElementById('updateTime')
};

/**
 * Inicialització
 */
document.addEventListener('DOMContentLoaded', () => {
    // Obtenir ID de l'escola de la URL
    const urlParams = new URLSearchParams(window.location.search);
    currentSchoolId = urlParams.get('id') || 'escola1';
    
    // Verificar que l'escola existeix
    currentSchool = CONFIG.schools[currentSchoolId];
    if (!currentSchool) {
        showError('Escola no trobada. Tornant a l\'inici...');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    // Actualitzar títol de la pàgina
    document.title = `${currentSchool.name} | MeteoEscola`;
    
    // Inicialitzar UI
    initializeUI();
    
    // Configurar dates per defecte (avui)
    setQuickDate('today');
    
    // Carregar dades
    loadData();
    
    // Iniciar actualització automàtica
    startAutoUpdate();
});

/**
 * Inicialitza la interfície
 */
function initializeUI() {
    elements.schoolName.textContent = currentSchool.name;
    elements.schoolLocation.textContent = currentSchool.location;
    elements.schoolBadge.textContent = currentSchool.icon;
    elements.schoolBadge.style.background = currentSchool.gradient;
    
    // Generar targetes del temps actual
    generateWeatherCards();
    
    // Generar gràfiques
    generateChartContainers();
}

/**
 * Genera les targetes del temps actual
 */
function generateWeatherCards() {
    const fields = currentSchool.fields;
    let html = '';
    
    for (const [fieldKey, field] of Object.entries(fields)) {
        const iconClass = field.type || 'temp';
        html += `
            <div class="weather-card" data-field="${fieldKey}">
                <div class="weather-card-icon ${iconClass}">${field.icon}</div>
                <div class="weather-card-content">
                    <h3>${field.name}</h3>
                    <div class="weather-card-value" id="current_${fieldKey}">
                        -- <span>${field.unit}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    elements.currentWeather.innerHTML = html;
}

/**
 * Genera els contenidors de gràfiques
 */
function generateChartContainers() {
    const fields = currentSchool.fields;
    let html = '';
    
    for (const [fieldKey, field] of Object.entries(fields)) {
        html += `
            <div class="chart-card" data-field="${fieldKey}">
                <div class="chart-header">
                    <h3>${field.icon} ${field.name}</h3>
                    <span class="chart-stats" id="stats_${fieldKey}"></span>
                </div>
                <div class="chart-container">
                    <canvas id="chart_${fieldKey}"></canvas>
                </div>
            </div>
        `;
    }
    
    elements.chartsGrid.innerHTML = html;
}

/**
 * Carrega les dades de l'estació
 */
async function loadData() {
    showLoading(true);
    hideError();
    
    const startDate = elements.startDate.value ? new Date(elements.startDate.value) : null;
    const endDate = elements.endDate.value ? new Date(elements.endDate.value) : null;
    
    try {
        // Obtenir dades de ThingSpeak
        let data = await thingSpeakService.fetchChannelData(currentSchoolId, startDate, endDate);
        
        // Filtrar per dates si cal
        if (startDate || endDate) {
            data = dataStorage.filterByDateRange(data, startDate, endDate);
        }
        
        currentData = data;
        
        if (!data.feeds || data.feeds.length === 0) {
            showNoData(true);
            return;
        }
        
        // Actualitzar UI
        updateCurrentWeather(data);
        updateCharts(data);
        updateLastUpdateTime();
        
        showLoading(false);
        showNoData(false);
        elements.currentWeather.style.display = '';
        elements.chartsGrid.style.display = '';
        
    } catch (error) {
        console.error('Error carregant dades:', error);
        showError(`Error: ${error.message}. Comprova que les claus API són correctes.`);
    }
}

/**
 * Actualitza les targetes del temps actual
 */
function updateCurrentWeather(data) {
    const stats = data.stats;
    
    for (const [fieldKey, stat] of Object.entries(stats)) {
        const element = document.getElementById(`current_${fieldKey}`);
        if (element && stat) {
            const field = currentSchool.fields[fieldKey];
            const value = stat.current !== null ? stat.current.toFixed(1) : '--';
            element.innerHTML = `${value} <span>${field.unit}</span>`;
        }
    }
}

/**
 * Actualitza les gràfiques
 */
function updateCharts(data) {
    const fieldData = data.fieldData;
    
    for (const [fieldKey, field] of Object.entries(fieldData)) {
        if (field.data && field.data.length > 0) {
            // Crear gràfica
            chartManager.createLineChart(
                `chart_${fieldKey}`,
                field.data,
                currentSchool.fields[fieldKey]
            );
            
            // Actualitzar estadístiques
            const stats = data.stats[fieldKey];
            if (stats) {
                const statsElement = document.getElementById(`stats_${fieldKey}`);
                if (statsElement) {
                    const unit = currentSchool.fields[fieldKey].unit;
                    statsElement.innerHTML = `
                        <span style="color: var(--gray-500); font-size: 0.8rem;">
                            Mín: ${stats.min.toFixed(1)}${unit} | 
                            Màx: ${stats.max.toFixed(1)}${unit} | 
                            Mitjana: ${stats.avg.toFixed(1)}${unit}
                        </span>
                    `;
                }
            }
        }
    }
}

/**
 * Configura dates ràpides
 */
function setQuickDate(period) {
    const now = new Date();
    let start, end;
    
    // Actualitzar botons actius
    document.querySelectorAll('.quick-date-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    
    switch (period) {
        case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            end = now;
            break;
        case 'yesterday':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
            break;
        case '7days':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            end = now;
            break;
        case '30days':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            end = now;
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            end = now;
            break;
        default:
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            end = now;
    }
    
    // Formatar per a l'input datetime-local
    elements.startDate.value = formatDateTimeLocal(start);
    elements.endDate.value = formatDateTimeLocal(end);
    
    // Carregar dades
    loadData();
}

/**
 * Actualitza les dades
 */
function updateData() {
    loadData();
}

/**
 * Exporta les dades
 */
function exportData(format) {
    if (!currentData) {
        alert('No hi ha dades per exportar');
        return;
    }
    
    const filename = `${currentSchool.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
        dataStorage.exportToCsv(currentData, `${filename}.csv`);
    } else {
        dataStorage.exportToJson(currentData, `${filename}.json`);
    }
}

/**
 * Actualització automàtica
 */
function startAutoUpdate() {
    autoUpdateInterval = setInterval(() => {
        console.log('🔄 Actualització automàtica...');
        loadData();
    }, CONFIG.thingspeak.updateInterval);
}

function stopAutoUpdate() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
}

/**
 * Actualitza el temps de l'última actualització
 */
function updateLastUpdateTime() {
    const now = new Date();
    elements.updateTime.textContent = now.toLocaleTimeString('ca-ES');
}

/**
 * Helpers d'UI
 */
function showLoading(show) {
    elements.loadingState.style.display = show ? '' : 'none';
    if (show) {
        elements.currentWeather.style.display = 'none';
        elements.chartsGrid.style.display = 'none';
    }
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorState.style.display = '';
    showLoading(false);
}

function hideError() {
    elements.errorState.style.display = 'none';
}

function showNoData(show) {
    elements.noDataState.style.display = show ? '' : 'none';
    if (show) {
        elements.currentWeather.style.display = 'none';
        elements.chartsGrid.style.display = 'none';
        showLoading(false);
    }
}

/**
 * Formata una data per a input datetime-local
 */
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Toggle menú mòbil
 */
function toggleMenu() {
    document.getElementById('mainNav').classList.toggle('open');
}

// Netejar quan es tanca la pàgina
window.addEventListener('beforeunload', () => {
    stopAutoUpdate();
    chartManager.destroyAll();
});
