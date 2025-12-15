/**
 * ============================================
 * COMPONENT DE GRÀFIQUES
 * ============================================
 * 
 * Aquest mòdul gestiona la creació i actualització
 * de totes les gràfiques del dashboard.
 */

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.defaultOptions = CONFIG.charts.options;
    }

    /**
     * Crea una gràfica de línia per a un camp específic
     * @param {string} canvasId - ID del canvas HTML
     * @param {Object} fieldData - Dades del camp
     * @param {Object} fieldConfig - Configuració del camp
     * @returns {Chart} - Instància del Chart
     */
    createLineChart(canvasId, fieldData, fieldConfig) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas no trobat: ${canvasId}`);
            return null;
        }

        // Destruir gràfica existent si existeix
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // Preparar dades
        const data = {
            labels: fieldData.map(d => new Date(d.timestamp)),
            datasets: [{
                label: fieldConfig.name,
                data: fieldData.map(d => ({
                    x: new Date(d.timestamp),
                    y: d.value
                })),
                borderColor: fieldConfig.color,
                backgroundColor: this.hexToRgba(fieldConfig.color, 0.1),
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: fieldConfig.color,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        };

        // Opcions específiques
        const options = {
            ...this.defaultOptions,
            plugins: {
                ...this.defaultOptions.plugins,
                tooltip: {
                    ...this.defaultOptions.plugins.tooltip,
                    callbacks: {
                        label: (context) => {
                            return `${fieldConfig.name}: ${context.parsed.y.toFixed(1)} ${fieldConfig.unit}`;
                        }
                    }
                }
            },
            scales: {
                ...this.defaultOptions.scales,
                y: {
                    ...this.defaultOptions.scales.y,
                    title: {
                        display: true,
                        text: fieldConfig.unit,
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: options
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Crea una gràfica combinada amb múltiples camps
     * @param {string} canvasId - ID del canvas HTML
     * @param {Array} fieldsData - Array de dades dels camps
     * @returns {Chart} - Instància del Chart
     */
    createMultiLineChart(canvasId, fieldsData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas no trobat: ${canvasId}`);
            return null;
        }

        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const ctx = canvas.getContext('2d');
        
        const datasets = fieldsData.map((field, index) => ({
            label: field.config.name,
            data: field.data.map(d => ({
                x: new Date(d.timestamp),
                y: d.value
            })),
            borderColor: field.config.color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        }));

        const options = {
            ...this.defaultOptions,
            plugins: {
                ...this.defaultOptions.plugins,
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            }
        };

        const chart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: options
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Crea una gràfica de barres
     * @param {string} canvasId - ID del canvas HTML
     * @param {Object} fieldData - Dades del camp
     * @param {Object} fieldConfig - Configuració del camp
     * @returns {Chart} - Instància del Chart
     */
    createBarChart(canvasId, fieldData, fieldConfig) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const ctx = canvas.getContext('2d');

        // Agrupar dades per hora
        const hourlyData = this.aggregateByHour(fieldData);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hourlyData.map(d => d.label),
                datasets: [{
                    label: fieldConfig.name,
                    data: hourlyData.map(d => d.avg),
                    backgroundColor: this.hexToRgba(fieldConfig.color, 0.7),
                    borderColor: fieldConfig.color,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Crea una gràfica tipus gauge/indicador
     * @param {string} canvasId - ID del canvas HTML
     * @param {number} value - Valor actual
     * @param {Object} config - Configuració
     * @returns {Chart} - Instància del Chart
     */
    createGaugeChart(canvasId, value, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const ctx = canvas.getContext('2d');
        const { min = 0, max = 100, color } = config;
        
        const percentage = ((value - min) / (max - min)) * 100;
        const remaining = 100 - percentage;

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percentage, remaining],
                    backgroundColor: [color, '#E2E8F0'],
                    borderWidth: 0
                }]
            },
            options: {
                circumference: 180,
                rotation: -90,
                cutout: '75%',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Actualitza les dades d'una gràfica existent
     * @param {string} canvasId - ID del canvas
     * @param {Array} newData - Noves dades
     */
    updateChartData(canvasId, newData) {
        const chart = this.charts.get(canvasId);
        if (!chart) return;

        chart.data.datasets[0].data = newData.map(d => ({
            x: new Date(d.timestamp),
            y: d.value
        }));
        
        chart.update('none'); // Actualització sense animació
    }

    /**
     * Agrupa dades per hora i calcula mitjanes
     */
    aggregateByHour(data) {
        const hourlyGroups = {};
        
        data.forEach(d => {
            const date = new Date(d.timestamp);
            const hourKey = `${date.toLocaleDateString('ca-ES')} ${date.getHours()}:00`;
            
            if (!hourlyGroups[hourKey]) {
                hourlyGroups[hourKey] = {
                    label: hourKey,
                    values: []
                };
            }
            hourlyGroups[hourKey].values.push(d.value);
        });

        return Object.values(hourlyGroups).map(group => ({
            label: group.label,
            avg: group.values.reduce((a, b) => a + b, 0) / group.values.length,
            min: Math.min(...group.values),
            max: Math.max(...group.values)
        }));
    }

    /**
     * Destrueix totes les gràfiques
     */
    destroyAll() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }

    /**
     * Converteix color hex a rgba
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Redimensiona totes les gràfiques
     */
    resizeAll() {
        this.charts.forEach(chart => chart.resize());
    }
}

// Crear instància global
const chartManager = new ChartManager();

// Redimensionar gràfiques quan canvia la mida de la finestra
window.addEventListener('resize', () => {
    chartManager.resizeAll();
});
