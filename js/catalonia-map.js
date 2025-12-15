/**
 * ============================================
 * MAPA DE CATALUNYA AMB HEATMAP
 * ============================================
 * 
 * Component interactiu que mostra les escoles
 * sobre un mapa de Catalunya amb visualització
 * de dades meteorològiques.
 */

class CataloniaMap {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Bounding box de Catalunya
        this.bounds = {
            minLat: 40.5,
            maxLat: 42.9,
            minLng: 0.15,
            maxLng: 3.35
        };
        
        this.currentSensor = 'field1'; // Temperatura per defecte
        this.schoolData = {};
        this.markers = [];
        
        this.sensorConfig = {
            field1: { name: 'Temperatura', unit: '°C', icon: '🌡️', colorScale: ['#3B82F6', '#10B981', '#FBBF24', '#F97316', '#EF4444'] },
            field2: { name: 'Humitat', unit: '%', icon: '💧', colorScale: ['#FEE2E2', '#BFDBFE', '#93C5FD', '#3B82F6', '#1E40AF'] },
            field3: { name: 'Pressió', unit: 'hPa', icon: '📊', colorScale: ['#D1FAE5', '#6EE7B7', '#34D399', '#10B981', '#047857'] },
            field4: { name: 'Vent', unit: 'm/s', icon: '💨', colorScale: ['#E0E7FF', '#A5B4FC', '#818CF8', '#6366F1', '#4338CA'] }
        };
        
        this.init();
    }
    
    init() {
        this.render();
        this.loadData();
    }
    
    // Format number with comma as decimal separator (European format)
    formatNumber(value, decimals = 1) {
        if (value === null || value === undefined || isNaN(value)) return '--';
        return value.toFixed(decimals).replace('.', ',');
    }
    
    // Get contrasting text color (black or white) based on background
    getContrastColor(hexColor) {
        let r, g, b;
        if (hexColor.startsWith('rgb')) {
            const match = hexColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            } else {
                return '#333333';
            }
        } else {
            const hex = hexColor.replace('#', '');
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        }
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
    }
    
    render() {
        this.container.innerHTML = `
            <div class="catalonia-map-wrapper">
                <div class="map-header">
                    <h3>🗺️ Mapa de Catalunya</h3>
                    <p>Visualització en temps real de les estacions meteorològiques</p>
                </div>
                
                <div class="sensor-selector">
                    <button class="sensor-btn active" data-sensor="field1">
                        <span>🌡️</span>
                        <span>Temperatura</span>
                    </button>
                    <button class="sensor-btn" data-sensor="field2">
                        <span>💧</span>
                        <span>Humitat</span>
                    </button>
                    <button class="sensor-btn" data-sensor="field3">
                        <span>📊</span>
                        <span>Pressió</span>
                    </button>
                    <button class="sensor-btn" data-sensor="field4">
                        <span>💨</span>
                        <span>Vent</span>
                    </button>
                </div>
                
                <div class="map-container">
                    <svg id="catalonia-svg" viewBox="0 0 500 450" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
                            </filter>
                        </defs>
                        
                        <!-- Catalunya amb comarques -->
                        <g id="catalunya-comarques" class="comarques-group">
                            <!-- Contorn principal de Catalunya amb farcit -->
                            <path class="catalunya-outline" d="
                                M 85,45 
                                C 100,35 130,28 160,25
                                C 200,20 240,18 280,22
                                C 320,26 355,38 385,55
                                C 410,70 430,95 445,125
                                C 458,155 465,190 460,225
                                C 455,260 440,295 420,325
                                C 400,355 370,380 335,395
                                C 300,410 260,418 220,415
                                C 180,412 140,400 110,380
                                C 80,360 55,330 40,295
                                C 25,260 20,220 25,180
                                C 30,140 45,105 65,75
                                C 75,60 85,50 85,45
                                Z
                            "/>
                            
                            <!-- Divisions de comarques (simplificades) -->
                            <path class="comarca-line" d="M 85,45 C 150,80 220,85 290,70 L 385,55" />
                            <path class="comarca-line" d="M 65,75 C 130,110 200,115 280,100 L 430,95" />
                            <path class="comarca-line" d="M 40,180 C 120,175 200,170 280,165 L 445,170" />
                            <path class="comarca-line" d="M 45,250 C 130,245 220,240 310,235 L 440,250" />
                            <path class="comarca-line" d="M 110,380 C 180,340 250,330 320,340 L 400,355" />
                            <path class="comarca-line" d="M 150,25 C 145,100 140,200 145,300 L 150,400" />
                            <path class="comarca-line" d="M 250,20 C 245,100 240,200 245,300 L 250,410" />
                            <path class="comarca-line" d="M 350,40 C 345,120 340,220 345,320 L 350,390" />
                            
                            <!-- Contorn amb stroke -->
                            <path class="catalunya-border" d="
                                M 85,45 
                                C 100,35 130,28 160,25
                                C 200,20 240,18 280,22
                                C 320,26 355,38 385,55
                                C 410,70 430,95 445,125
                                C 458,155 465,190 460,225
                                C 455,260 440,295 420,325
                                C 400,355 370,380 335,395
                                C 300,410 260,418 220,415
                                C 180,412 140,400 110,380
                                C 80,360 55,330 40,295
                                C 25,260 20,220 25,180
                                C 30,140 45,105 65,75
                                C 75,60 85,50 85,45
                                Z
                            "/>
                        </g>
                        
                        <text x="420" y="420" class="sea-label" font-size="14" font-style="italic">Mar Mediterrani</text>
                        
                        <g id="markers-group"></g>
                    </svg>
                    
                    <div class="map-legend" id="map-legend">
                        <div class="legend-title">ESCALA</div>
                        <div class="legend-gradient" id="legend-gradient"></div>
                        <div class="legend-labels">
                            <span id="legend-min">--</span>
                            <span id="legend-max">--</span>
                        </div>
                    </div>
                </div>
                
                <div class="map-info" id="map-info">
                    <p>Fes clic a una escola per veure més detalls</p>
                </div>
            </div>
        `;
        
        this.bindEvents();
    }
    
    bindEvents() {
        const sensorBtns = this.container.querySelectorAll('.sensor-btn');
        sensorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                sensorBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentSensor = btn.dataset.sensor;
                this.updateMarkers();
            });
        });
    }
    
    async loadData() {
        const schools = CONFIG.schools;
        
        // Use DemoDataGenerator to get consistent data
        for (const [schoolId, school] of Object.entries(schools)) {
            if (!school.active) continue;
            
            try {
                // Get data from DemoDataGenerator (same source as dashboard)
                if (typeof DemoDataGenerator !== 'undefined') {
                    const demoData = DemoDataGenerator.generateSchoolData(schoolId, 
                        new Date(Date.now() - 24 * 60 * 60 * 1000), 
                        new Date()
                    );
                    
                    if (demoData && demoData.stats) {
                        this.schoolData[schoolId] = {
                            field1: demoData.stats.field1?.current ?? null,
                            field2: demoData.stats.field2?.current ?? null,
                            field3: demoData.stats.field3?.current ?? null,
                            field4: demoData.stats.field4?.current ?? null
                        };
                        continue;
                    }
                }
            } catch (e) {
                console.warn(`Could not load data for ${schoolId}:`, e);
            }
            
            // Fallback
            const seed = schoolId.charCodeAt(schoolId.length - 1);
            this.schoolData[schoolId] = {
                field1: 10 + (seed % 15) + Math.random() * 5,
                field2: 40 + (seed % 30) + Math.random() * 10,
                field3: 1000 + (seed % 25) + Math.random() * 5,
                field4: 1 + (seed % 8) + Math.random() * 2
            };
        }
        
        this.createMarkers();
        this.updateMarkers();
    }
    
    latLngToXY(lat, lng) {
        const x = ((lng - this.bounds.minLng) / (this.bounds.maxLng - this.bounds.minLng)) * 420 + 40;
        const y = 410 - ((lat - this.bounds.minLat) / (this.bounds.maxLat - this.bounds.minLat)) * 370;
        return { x, y };
    }
    
    createMarkers() {
        const markersGroup = document.getElementById('markers-group');
        if (!markersGroup) return;
        
        markersGroup.innerHTML = '';
        const schools = CONFIG.schools;
        
        for (const [schoolId, school] of Object.entries(schools)) {
            if (!school.active || !school.coordinates) continue;
            
            const { x, y } = this.latLngToXY(school.coordinates.lat, school.coordinates.lng);
            const shortName = school.name.split(' ').slice(-1)[0];
            
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            marker.setAttribute('class', 'map-marker');
            marker.setAttribute('data-school', schoolId);
            marker.setAttribute('transform', `translate(${x}, ${y})`);
            
            // Marker with value, label below
            marker.innerHTML = `
                <circle class="marker-pulse" r="22" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5">
                    <animate attributeName="r" values="18;28;18" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle class="marker-bg" r="20" fill="currentColor" filter="url(#markerShadow)"/>
                <circle class="marker-inner" r="16" fill="white"/>
                <text class="marker-value" y="5" text-anchor="middle" font-size="11" font-weight="700" fill="#333">--</text>
                <text class="marker-label" y="40" text-anchor="middle" font-size="10" font-weight="600">${shortName}</text>
            `;
            
            marker.addEventListener('click', () => this.showSchoolInfo(schoolId));
            marker.style.cursor = 'pointer';
            
            markersGroup.appendChild(marker);
            this.markers.push({ element: marker, schoolId });
        }
    }
    
    updateMarkers() {
        const config = this.sensorConfig[this.currentSensor];
        const values = Object.values(this.schoolData)
            .map(d => d[this.currentSensor])
            .filter(v => v !== null && v !== undefined);
        
        if (values.length === 0) return;
        
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        
        this.updateLegend(minVal, maxVal, config);
        
        this.markers.forEach(({ element, schoolId }) => {
            const value = this.schoolData[schoolId]?.[this.currentSensor];
            if (value === undefined || value === null) return;
            
            const color = this.getColorForValue(value, minVal, maxVal, config.colorScale);
            const contrastColor = this.getContrastColor(color);
            
            const valueText = element.querySelector('.marker-value');
            const markerBg = element.querySelector('.marker-bg');
            const markerInner = element.querySelector('.marker-inner');
            const pulse = element.querySelector('.marker-pulse');
            
            const decimals = this.currentSensor === 'field3' ? 0 : 1;
            const formattedValue = this.formatNumber(value, decimals);
            
            if (valueText) {
                valueText.textContent = formattedValue;
                valueText.setAttribute('fill', contrastColor);
            }
            if (markerBg) {
                markerBg.setAttribute('fill', color);
            }
            if (markerInner) {
                markerInner.setAttribute('fill', color);
            }
            if (pulse) {
                pulse.setAttribute('stroke', color);
            }
            element.style.color = color;
        });
    }
    
    getColorForValue(value, min, max, colorScale) {
        if (max === min) return colorScale[Math.floor(colorScale.length / 2)];
        
        const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
        const index = Math.min(Math.floor(ratio * (colorScale.length - 1)), colorScale.length - 2);
        const localRatio = (ratio * (colorScale.length - 1)) - index;
        
        const color1 = this.hexToRgb(colorScale[index]);
        const color2 = this.hexToRgb(colorScale[index + 1]);
        
        const r = Math.round(color1.r + (color2.r - color1.r) * localRatio);
        const g = Math.round(color1.g + (color2.g - color1.g) * localRatio);
        const b = Math.round(color1.b + (color2.b - color1.b) * localRatio);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 128, g: 128, b: 128 };
    }
    
    updateLegend(min, max, config) {
        const gradient = document.getElementById('legend-gradient');
        const minLabel = document.getElementById('legend-min');
        const maxLabel = document.getElementById('legend-max');
        
        if (gradient) {
            gradient.style.background = `linear-gradient(to right, ${config.colorScale.join(', ')})`;
        }
        
        const decimals = this.currentSensor === 'field3' ? 0 : 1;
        if (minLabel) {
            minLabel.textContent = `${this.formatNumber(min, decimals)}${config.unit}`;
        }
        if (maxLabel) {
            maxLabel.textContent = `${this.formatNumber(max, decimals)}${config.unit}`;
        }
    }
    
    showSchoolInfo(schoolId) {
        const school = CONFIG.schools[schoolId];
        const data = this.schoolData[schoolId];
        const infoBox = document.getElementById('map-info');
        
        if (!school || !data || !infoBox) return;
        
        infoBox.innerHTML = `
            <div class="school-info-card">
                <div class="school-info-header">
                    <span class="school-icon">${school.icon}</span>
                    <div>
                        <h4>${school.name}</h4>
                        <p>${school.location}</p>
                    </div>
                </div>
                <div class="school-info-values">
                    <div class="info-value">
                        <span>🌡️</span>
                        <span>${this.formatNumber(data.field1, 1)}°C</span>
                    </div>
                    <div class="info-value">
                        <span>💧</span>
                        <span>${this.formatNumber(data.field2, 1)}%</span>
                    </div>
                    <div class="info-value">
                        <span>📊</span>
                        <span>${this.formatNumber(data.field3, 0)} hPa</span>
                    </div>
                    <div class="info-value">
                        <span>💨</span>
                        <span>${this.formatNumber(data.field4, 1)} m/s</span>
                    </div>
                </div>
                <a href="escola.html?id=${schoolId}" class="view-data-btn" style="margin-top: 16px; display: inline-flex; text-align: center; justify-content: center; width: 100%;">
                    Veure Dades Completes →
                </a>
            </div>
        `;
    }
    
    updateSchoolData(schoolId, sensorData) {
        this.schoolData[schoolId] = sensorData;
        this.updateMarkers();
    }
}

let cataloniaMap = null;

function initCataloniaMap() {
    const container = document.getElementById('catalonia-map');
    if (container) {
        cataloniaMap = new CataloniaMap('catalonia-map');
    }
}

if (typeof window !== 'undefined') {
    window.CataloniaMap = CataloniaMap;
    window.initCataloniaMap = initCataloniaMap;
}
