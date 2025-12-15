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

/**
 * Format number with comma as decimal separator (European format)
 */
function formatNumber(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(decimals).replace('.', ',');
}

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
    updateTime: document.getElementById('updateTime'),
    // Weather summary hero elements
    weatherSummary: document.getElementById('weatherSummary'),
    summaryTemp: document.getElementById('summaryTemp'),
    conditionIcon: document.getElementById('conditionIcon'),
    conditionText: document.getElementById('conditionText'),
    summaryLocation: document.getElementById('summaryLocation'),
    humidityValue: document.getElementById('humidityValue'),
    pressureValue: document.getElementById('pressureValue'),
    windValue: document.getElementById('windValue'),
    humidityGauge: document.getElementById('humidityGauge'),
    pressureGauge: document.getElementById('pressureGauge'),
    windGauge: document.getElementById('windGauge')
};

/**
 * Inicialització
 */
document.addEventListener('DOMContentLoaded', () => {
    // Obtenir ID de l'escola de la URL o deduir-lo del nom del fitxer HTML
    const urlParams = new URLSearchParams(window.location.search);
    currentSchoolId = urlParams.get('id');
    if (!currentSchoolId) {
        // Detectar per nom de fitxer (friendly URL)
        const file = window.location.pathname.split('/').pop();
        switch (file) {
            case 'escola-mas-i-perera.html': currentSchoolId = 'escola1'; break;
            case 'escola-jaume-balmes.html': currentSchoolId = 'escola2'; break;
            case 'escola-santa-coloma.html': currentSchoolId = 'escola3'; break;
            case 'escola-mar-i-cel.html': currentSchoolId = 'escola4'; break;
            case 'zer-moianes.html': currentSchoolId = 'escola5'; break;
            case 'escola-el-castellot.html': currentSchoolId = 'escola6'; break;
            default: currentSchoolId = 'escola1';
        }
    }
    
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
            const value = formatNumber(stat.current, 1);
            element.innerHTML = `${value} <span>${field.unit}</span>`;
        }
    }
    
    // Update weather summary hero
    updateWeatherSummary(data);
}

/**
 * Actualitza el panell de resum del temps
 */
function updateWeatherSummary(data) {
    const stats = data.stats;
    
    // Update temperature
    if (stats.field1 && elements.summaryTemp) {
        const temp = stats.field1.current;
        elements.summaryTemp.textContent = formatNumber(temp, 1);
        
        // Set condition based on temperature
        if (temp !== null) {
            if (temp < 10) {
                elements.conditionIcon.textContent = '❄️';
                elements.conditionText.textContent = 'Fred';
            } else if (temp < 18) {
                elements.conditionIcon.textContent = '🌤️';
                elements.conditionText.textContent = 'Fresc';
            } else if (temp < 25) {
                elements.conditionIcon.textContent = '☀️';
                elements.conditionText.textContent = 'Agradable';
            } else if (temp < 30) {
                elements.conditionIcon.textContent = '🌡️';
                elements.conditionText.textContent = 'Càlid';
            } else {
                elements.conditionIcon.textContent = '🔥';
                elements.conditionText.textContent = 'Calor';
            }
        }
    }
    
    // Update location
    if (elements.summaryLocation) {
        elements.summaryLocation.textContent = currentSchool.location;
    }
    
    // Update humidity gauge
    if (stats.field2 && elements.humidityValue) {
        const humidity = stats.field2.current;
        elements.humidityValue.textContent = `${formatNumber(humidity, 0)}%`;
        updateGauge(elements.humidityGauge, humidity, 0, 100);
    }
    
    // Update pressure gauge
    if (stats.field3 && elements.pressureValue) {
        const pressure = stats.field3.current;
        elements.pressureValue.textContent = `${formatNumber(pressure, 0)} hPa`;
        updateGauge(elements.pressureGauge, pressure, 970, 1050);
    }
    
    // Update wind gauge
    if (stats.field4 && elements.windValue) {
        const wind = stats.field4.current;
        elements.windValue.textContent = `${formatNumber(wind, 1)} m/s`;
        updateGauge(elements.windGauge, wind, 0, 20);
    }
    
    // Show weather summary
    if (elements.weatherSummary) {
        elements.weatherSummary.style.display = '';
    }
    
    // Create mini temperature chart
    createMiniTempChart(data);
}

/**
 * Actualitza un gauge SVG
 */
function updateGauge(gaugeElement, value, min, max) {
    if (!gaugeElement || value === null) return;
    
    const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const arcLength = 110; // Total arc length
    const dashLength = percentage * arcLength;
    
    gaugeElement.setAttribute('stroke-dasharray', `${dashLength} ${arcLength}`);
}

/**
 * Crea el mini gràfic de temperatura
 */
let miniTempChart = null;

function createMiniTempChart(data) {
    const canvas = document.getElementById('miniTempChart');
    if (!canvas) return;
    
    const tempData = data.fieldData?.field1?.data;
    if (!tempData || tempData.length === 0) return;
    
    // Destroy existing chart
    if (miniTempChart) {
        miniTempChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get last 24 hours of data (or whatever is available)
    const last24h = tempData.slice(-48);
    
    miniTempChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last24h.map(d => new Date(d.timestamp)),
            datasets: [{
                data: last24h.map(d => d.value),
                borderColor: '#FF6B6B',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 8,
                    cornerRadius: 6,
                    titleFont: { size: 11 },
                    bodyFont: { size: 12 },
                    callbacks: {
                        label: (context) => `${formatNumber(context.parsed.y, 1)}°C`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            hour: 'HH:mm'
                        }
                    },
                    grid: { display: false },
                    ticks: {
                        maxTicksLimit: 6,
                        color: 'rgba(255, 255, 255, 0.5)',
                        font: { size: 10 }
                    }
                },
                y: {
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        font: { size: 10 },
                        callback: (value) => `${value}°`
                    }
                }
            }
        }
    });
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
                            Mín: ${formatNumber(stats.min, 1)}${unit} | 
                            Màx: ${formatNumber(stats.max, 1)}${unit} | 
                            Mitjana: ${formatNumber(stats.avg, 1)}${unit}
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

/**
 * Demo mode toggle functions
 */
function initDemoToggle() {
    const toggle = document.getElementById('demoToggle');
    if (toggle) {
        updateDemoToggleState();
    }
}

function toggleDemoMode() {
    CONFIG.demoMode = !CONFIG.demoMode;
    updateDemoToggleState();
    
    // Update URL with demo parameter
    const url = new URL(window.location.href);
    if (CONFIG.demoMode) {
        url.searchParams.set('demo', 'true');
    } else {
        url.searchParams.delete('demo');
    }
    window.history.replaceState({}, '', url);
    
    // Reload data
    loadData();
}

function updateDemoToggleState() {
    const toggle = document.getElementById('demoToggle');
    if (toggle) {
        if (CONFIG.demoMode) {
            toggle.classList.add('active');
            toggle.title = 'Mode Demo activat - Fes clic per desactivar';
        } else {
            toggle.classList.remove('active');
            toggle.title = 'Mode Demo desactivat - Fes clic per activar';
        }
    }
}

// Initialize demo toggle when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure elements are ready
    setTimeout(initDemoToggle, 100);
});
