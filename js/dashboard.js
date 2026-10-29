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
// Mode de rang actual: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'custom'
// Si no és 'custom', el rang es recalcula a cada refresc perquè "ara" avanci.
let currentRange = 'today';
let isLoading = false;
let lastRequestId = 0;

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
    summaryLocation: document.getElementById('summaryLocation')
};

/**
 * Inicialització
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Obtenir ID de l'escola de la URL o deduir-lo del nom del fitxer HTML
    const urlParams = new URLSearchParams(window.location.search);
    currentSchoolId = urlParams.get('id');

    try {
        await Stations.load();
    } catch (e) {
        showError('No s\'ha pogut carregar el registre d\'estacions.');
        return;
    }
    if (!currentSchoolId) {
        // Sense ?id= → primera estació activa (o tornem a la portada si no n'hi ha)
        const first = Stations.list()[0];
        if (!first) { window.location.href = 'index.html'; return; }
        currentSchoolId = first.id;
    }
    
    // Verificar que l'escola existeix
    currentSchool = Stations.get(currentSchoolId);
    if (!currentSchool) {
        showError('Estació no trobada. Tornant a l\'inici...');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    // Actualitzar títol de la pàgina
    document.title = `${currentSchool.name} | Estacions Meteorològiques en Xarxa`;

    // Estacions de perfil "personalitzat": els camps es dedueixen dels noms del canal
    try {
        await Stations.ensureFields(currentSchool);
    } catch (e) {
        showError(`No s'ha pogut llegir el canal de ThingSpeak (${e.message}). Comprova que és públic.`);
        return;
    }
    
    // Inicialitzar UI
    initializeUI();
    
    // Rang per defecte: avui
    applyRange('today');
    document.querySelectorAll('.quick-date-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === 'today');
    });
    // Si l'usuari toca les dates a mà, passem a mode personalitzat
    [elements.startDate, elements.endDate].forEach(input => {
        input.addEventListener('change', () => {
            currentRange = 'custom';
            document.querySelectorAll('.quick-date-btn').forEach(btn => btn.classList.remove('active'));
        });
    });
    loadData();
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
async function loadData({ silent = false } = {}) {
    if (isLoading && silent) return;   // un refresc automàtic no trepitja una càrrega en curs
    const requestId = ++lastRequestId;  // si n'arriba una de més nova, descartem aquesta resposta
    isLoading = true;
    // En refrescos automàtics no amaguem els gràfics (evita el parpelleig)
    if (!silent) showLoading(true);
    hideError();
    
    const startDate = elements.startDate.value ? new Date(elements.startDate.value) : null;
    let endDate = elements.endDate.value ? new Date(elements.endDate.value) : null;
    // Rangs relatius: l'input només té precisió de minut, usem l'hora exacta
    if (currentRange !== 'custom' && currentRange !== 'yesterday') endDate = new Date();
    
    try {
        // Temps real (ThingSpeak) o històric (full de càlcul) segons el rang
        let data = await dataSource.fetch(currentSchoolId, startDate, endDate);
        if (requestId !== lastRequestId) return;  // resposta obsoleta
        
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
        // En un refresc automàtic no tapem les dades ja mostrades amb un error passatger
        if (!silent || !currentData) {
            showError(`Error: ${error.message}. Comprova que el canal és públic o que la clau API és correcta.`);
        }
    } finally {
        if (requestId === lastRequestId) isLoading = false;
    }
}

/**
 * Actualitza les targetes del temps actual
 */
function updateCurrentWeather(data) {
    const stats = data.stats;

    // Només mostrem els camps que tenen dades (molts centres no tenen anemòmetre, pluviòmetre…)
    for (const fieldKey of Object.keys(currentSchool.fields)) {
        const hasData = (data.fieldData?.[fieldKey]?.data || []).length > 0;
        document.querySelectorAll(`[data-field="${fieldKey}"]`).forEach(el => { el.style.display = hasData ? '' : 'none'; });
        // La temperatura ja es veu gran al resum: no es repeteix com a targeta
        if (currentSchool.fields[fieldKey].type === 'temperature') {
            const card = document.querySelector(`.weather-card[data-field="${fieldKey}"]`);
            if (card) card.style.display = 'none';
        }
    }

    for (const [fieldKey, stat] of Object.entries(stats)) {
        const element = document.getElementById(`current_${fieldKey}`);
        if (element && stat) {
            const field = currentSchool.fields[fieldKey];
            const value = formatNumber(stat.current, field.decimals ?? 1);
            element.innerHTML = `${value} <span>${field.unit}</span>`;
        }
    }
    
    // Update weather summary hero
    updateWeatherSummary(data);
}

/**
 * Trova un field per type
 */
function findFieldByType(type) {
    for (const [fieldKey, field] of Object.entries(currentSchool.fields)) {
        if (field.type === type) {
            return { fieldKey, field };
        }
    }
    return null;
}

/**
 * Actualitza el panell de resum del temps
 */
function updateWeatherSummary(data) {
    const stats = data.stats;
    
    // Update temperature (find field by type, not hardcoded)
    const tempField = findFieldByType('temperature');
    if (tempField && stats[tempField.fieldKey] && elements.summaryTemp) {
        const temp = stats[tempField.fieldKey].current;
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
    
    // Show weather summary
    if (elements.weatherSummary) {
        const tf = findFieldByType('temperature');
        const hasTemp = tf && (data.fieldData?.[tf.fieldKey]?.data || []).length > 0;
        elements.weatherSummary.style.display = hasTemp ? '' : 'none';
    }
    
    // Create mini temperature chart
    createMiniTempChart(data);
}

/**
 * Crea el mini gràfic de temperatura
 */
let miniTempChart = null;

function createMiniTempChart(data) {
    const canvas = document.getElementById('miniTempChart');
    if (!canvas) return;
    
    // Find temperature field dynamically
    const tempField = findFieldByType('temperature');
    if (!tempField) return;
    
    const tempData = data.fieldData?.[tempField.fieldKey]?.data;
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
                borderColor: tempField.field.color,
                backgroundColor: `${tempField.field.color}20`,
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
                        color: '#78716c',
                        font: { size: 10 }
                    }
                },
                y: {
                    grid: { 
                        color: 'rgba(28, 25, 23, 0.06)'
                    },
                    ticks: {
                        color: '#78716c',
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
 * Calcula l'interval de dates d'un període ràpid
 */
function computeRange(period, now = new Date()) {
    const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    switch (period) {
        case 'today':     return [new Date(y, m, d, 0, 0, 0), now];
        case 'yesterday': return [new Date(y, m, d - 1, 0, 0, 0), new Date(y, m, d - 1, 23, 59, 59)];
        case '7days':     return [new Date(now.getTime() - 7 * 86400000), now];
        case '30days':    return [new Date(now.getTime() - 30 * 86400000), now];
        case 'month':     return [new Date(y, m, 1, 0, 0, 0), now];
        default:          return [new Date(now.getTime() - 86400000), now];
    }
}

/**
 * Aplica un període ràpid als inputs de data
 */
function applyRange(period) {
    currentRange = period;
    const [start, end] = computeRange(period);
    elements.startDate.value = formatDateTimeLocal(start);
    elements.endDate.value = formatDateTimeLocal(end);
}

/**
 * Configura dates ràpides (cridat des dels botons)
 */
function setQuickDate(period, btn) {
    document.querySelectorAll('.quick-date-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.period === period || b === btn);
    });
    applyRange(period);
    loadData();
}

/**
 * Actualitza les dades
 */
function updateData() {
    if (currentRange !== 'custom') applyRange(currentRange);
    thingSpeakService.clearCache();
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
    stopAutoUpdate();
    autoUpdateInterval = setInterval(() => {
        // No gastem peticions si la pestanya està en segon pla
        if (document.hidden) return;
        // Rangs fixos (ahir, personalitzat) no canvien: no cal refrescar
        if (currentRange === 'custom' || currentRange === 'yesterday') return;
        applyRange(currentRange);
        loadData({ silent: true });
    }, CONFIG.thingspeak.updateInterval);
}

// En tornar a la pestanya, refresca de seguida
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentRange !== 'custom' && currentRange !== 'yesterday' && currentSchool) {
        applyRange(currentRange);
        loadData({ silent: true });
    }
});

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
