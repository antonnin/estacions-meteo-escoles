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
        this.loadCatalunyaMap();
        // loadData() will be called after map loads
    }
    
    async loadCatalunyaMap() {
        try {
            console.log('Loading Catalunya map...');
            const response = await fetch('./data/catalunya-map.svg');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const svgText = await response.text();
            console.log('SVG loaded, length:', svgText.length);
            
            const container = document.getElementById('catalunya-svg-container');
            if (!container) {
                console.error('Container not found!');
                return;
            }
            
            container.innerHTML = svgText;
            console.log('SVG inserted into container');
            
            // Get the SVG element and apply our styles
            const svg = container.querySelector('svg');
            if (svg) {
                console.log('SVG element found');
                svg.id = 'catalonia-svg';
                svg.style.width = '100%';
                svg.style.maxWidth = '900px';
                svg.style.height = 'auto';
                
                // Create a wrapper for zoom/pan functionality
                // We need to wrap the existing layer1 group to not interfere with its original transform
                const originalGroup = svg.querySelector('g[id="layer1"]') || svg.querySelector('g');
                
                // Create a transform wrapper group
                const transformWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                transformWrapper.id = 'transform-wrapper';
                
                // Store reference to the original group
                this.originalGroup = originalGroup;
                
                // Insert the wrapper before the original group, then move the original group inside
                if (originalGroup && originalGroup.parentNode) {
                    originalGroup.parentNode.insertBefore(transformWrapper, originalGroup);
                    transformWrapper.appendChild(originalGroup);
                }
                
                this.currentZoom = 1;
                this.currentX = 0;
                this.currentY = 0;
                
                // Style all paths - all are municipi borders, make them thin and black
                const paths = svg.querySelectorAll('path');
                console.log('Found', paths.length, 'paths');
                
                // Force uniform background color by removing any existing fill styles
                paths.forEach(path => {
                    path.classList.add('comarca-path');
                    // Remove any existing fill attributes
                    path.removeAttribute('fill');
                    path.style.setProperty('fill', 'rgba(30, 58, 95, 0.6)', 'important');
                    path.style.setProperty('fill-opacity', '1', 'important');
                    // All municipi borders - thin dark lines
                    path.style.stroke = 'rgba(0, 0, 0, 0.4)';
                    path.style.strokeWidth = '0.3';
                    path.style.transition = 'fill 0.3s ease';
                });
                
                // Add hover effects
                paths.forEach(path => {
                    path.addEventListener('mouseenter', () => {
                        path.style.setProperty('fill', 'rgba(56, 130, 180, 0.7)', 'important');
                    });
                    path.addEventListener('mouseleave', () => {
                        path.style.setProperty('fill', 'rgba(30, 58, 95, 0.6)', 'important');
                    });
                });
                
                // Style all text elements (comarca names) to white with consistent font
                const textElements = svg.querySelectorAll('text, tspan');
                console.log('Found', textElements.length, 'text elements');
                textElements.forEach(text => {
                    text.style.fill = 'rgba(255, 255, 255, 0.9)';
                    text.style.fontFamily = 'var(--font-sans)';
                    text.style.fontWeight = '600';
                    text.style.fontSize = '10px';
                    text.style.pointerEvents = 'none';
                });
                
                // Add markers group INSIDE the original group so it uses the same coordinate system
                const markersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                markersGroup.id = 'markers-group';
                if (originalGroup) {
                    originalGroup.appendChild(markersGroup);
                } else {
                    svg.appendChild(markersGroup);
                }
                
                // Add Mediterranean Sea label
                const seaLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                seaLabel.setAttribute('x', '550');
                seaLabel.setAttribute('y', '700');
                seaLabel.setAttribute('class', 'sea-label');
                seaLabel.setAttribute('font-size', '16');
                seaLabel.setAttribute('font-style', 'italic');
                seaLabel.textContent = 'Mar Mediterrani';
                if (originalGroup) {
                    originalGroup.appendChild(seaLabel);
                } else {
                    svg.appendChild(seaLabel);
                }
                
                // Add zoom controls
                this.addZoomControls(container);
                
                // Add mouse pan/drag functionality
                this.addPanControls(svg);
                
                console.log('Map loaded successfully!');
                
                // Now that SVG is loaded, load data and create markers
                this.loadData();
            } else {
                console.error('SVG element not found after insertion');
            }
        } catch (error) {
            console.error('Error loading Catalunya map:', error);
            // Show a fallback message
            const container = document.getElementById('catalunya-svg-container');
            if (container) {
                container.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 40px;">Error loading map. Please refresh the page.</p>';
            }
        }
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
                    <div id="catalunya-svg-container"></div>
                    
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
    
    addZoomControls(container) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'map-zoom-controls';
        controlsDiv.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 10;
        `;
        
        const zoomInBtn = this.createZoomButton('+', 'Zoom In');
        const zoomOutBtn = this.createZoomButton('−', 'Zoom Out');
        const resetBtn = this.createZoomButton('⟲', 'Reset');
        
        zoomInBtn.onclick = () => this.zoom(1.2);
        zoomOutBtn.onclick = () => this.zoom(0.8);
        resetBtn.onclick = () => this.resetZoom();
        
        controlsDiv.appendChild(zoomInBtn);
        controlsDiv.appendChild(zoomOutBtn);
        controlsDiv.appendChild(resetBtn);
        
        const mapContainer = container.querySelector('.map-container') || container;
        if (mapContainer.style.position !== 'absolute' && mapContainer.style.position !== 'relative') {
            mapContainer.style.position = 'relative';
        }
        mapContainer.appendChild(controlsDiv);
    }
    
    createZoomButton(text, title) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.title = title;
        btn.style.cssText = `
            width: 40px;
            height: 40px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(15, 23, 42, 0.9);
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        
        btn.onmouseenter = () => {
            btn.style.background = 'rgba(30, 41, 59, 0.95)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            btn.style.transform = 'scale(1.05)';
        };
        
        btn.onmouseleave = () => {
            btn.style.background = 'rgba(15, 23, 42, 0.9)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            btn.style.transform = 'scale(1)';
        };
        
        return btn;
    }
    
    zoom(factor) {
        this.currentZoom *= factor;
        this.currentZoom = Math.max(0.5, Math.min(3, this.currentZoom));
        this.applyTransform();
        this.declutterMarkers();
    }
    
    resetZoom() {
        this.currentZoom = 1;
        this.currentX = 0;
        this.currentY = 0;
        this.applyTransform();
        this.resetMarkerPositions();
    }
    
    applyTransform() {
        const transformWrapper = document.getElementById('transform-wrapper');
        if (transformWrapper) {
            transformWrapper.setAttribute('transform', 
                `translate(${this.currentX}, ${this.currentY}) scale(${this.currentZoom})`);
        }
    }
    
    // Declutter overlapping markers when zoomed in
    declutterMarkers() {
        if (this.markers.length === 0) return;
        
        // Minimum distance between markers in SVG units (adjusts with zoom)
        const minDistance = 40 / this.currentZoom;
        
        // Get all marker positions
        const positions = this.markers.map(({ element }) => ({
            element,
            x: parseFloat(element.dataset.origX),
            y: parseFloat(element.dataset.origY),
            newX: parseFloat(element.dataset.origX),
            newY: parseFloat(element.dataset.origY)
        }));
        
        // Simple collision resolution - push markers apart
        for (let iteration = 0; iteration < 5; iteration++) {
            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    const dx = positions[j].newX - positions[i].newX;
                    const dy = positions[j].newY - positions[i].newY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < minDistance && distance > 0) {
                        // Push markers apart
                        const pushFactor = (minDistance - distance) / 2;
                        const angle = Math.atan2(dy, dx);
                        
                        positions[i].newX -= Math.cos(angle) * pushFactor;
                        positions[i].newY -= Math.sin(angle) * pushFactor;
                        positions[j].newX += Math.cos(angle) * pushFactor;
                        positions[j].newY += Math.sin(angle) * pushFactor;
                    }
                }
            }
        }
        
        // Apply new positions with smooth transition
        positions.forEach(({ element, newX, newY }) => {
            element.style.transition = 'transform 0.3s ease';
            element.setAttribute('transform', `translate(${newX}, ${newY})`);
        });
    }
    
    // Reset markers to original positions
    resetMarkerPositions() {
        this.markers.forEach(({ element }) => {
            const origX = parseFloat(element.dataset.origX);
            const origY = parseFloat(element.dataset.origY);
            element.style.transition = 'transform 0.3s ease';
            element.setAttribute('transform', `translate(${origX}, ${origY})`);
        });
    }
    
    addPanControls(svg) {
        let isPanning = false;
        let startX = 0;
        let startY = 0;
        
        svg.style.cursor = 'grab';
        
        svg.addEventListener('mousedown', (e) => {
            isPanning = true;
            startX = e.clientX - this.currentX;
            startY = e.clientY - this.currentY;
            svg.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        svg.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            
            this.currentX = e.clientX - startX;
            this.currentY = e.clientY - startY;
            this.applyTransform();
            e.preventDefault();
        });
        
        const endPan = () => {
            if (isPanning) {
                isPanning = false;
                svg.style.cursor = 'grab';
            }
        };
        
        svg.addEventListener('mouseup', endPan);
        svg.addEventListener('mouseleave', endPan);
        
        // Touch support for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        svg.addEventListener('touchstart', (e) => {
            isPanning = true;
            const touch = e.touches[0];
            touchStartX = touch.clientX - this.currentX;
            touchStartY = touch.clientY - this.currentY;
            e.preventDefault();
        });
        
        svg.addEventListener('touchmove', (e) => {
            if (!isPanning) return;
            
            const touch = e.touches[0];
            this.currentX = touch.clientX - touchStartX;
            this.currentY = touch.clientY - touchStartY;
            this.applyTransform();
            e.preventDefault();
        });
        
        svg.addEventListener('touchend', () => {
            isPanning = false;
        });
    }
    
    latLngToXY(lat, lng) {
        // Convert GPS coordinates to SVG coordinates using precise calibration points
        // 
        // Reference points from SVG text positions and Wikipedia GPS coordinates:
        // - Alt Penedès: SVG (185, 298), GPS (41.365278, 1.681944)
        // - Garraf: SVG (204, 345), GPS (41.320000, 1.820000)
        // - Cerdanya: SVG (207, -10), GPS (42.446667, 1.952778)
        // - Moianès: SVG (273, 186), GPS (41.821990, 2.131000)
        //
        // Using linear regression on these 4 precise points:
        // For X: using Alt Penedès (1.6819, 185) and Moianès (2.131, 273)
        //   slope = (273-185)/(2.131-1.6819) = 88/0.4491 = 195.95
        //   intercept = 185 - 195.95*1.6819 = 185 - 329.5 = -144.5
        // For Y: using Cerdanya (42.4467, -10) and Garraf (41.32, 345)
        //   slope = (345-(-10))/(41.32-42.4467) = 355/(-1.1267) = -315.1
        //   intercept = -10 - (-315.1)*42.4467 = -10 + 13377 = 13367
        
        // Fine-tuned calibration constants
        const lngScale = 196.0;
        const lngOffset = -144.5;
        
        const latScale = -315.0;
        const latOffset = 13367.0;
        
        const x = lngOffset + lng * lngScale;
        const y = latOffset + lat * latScale;
        
        return { x, y };
    }
    
    createMarkers() {
        const markersGroup = document.getElementById('markers-group');
        if (!markersGroup) {
            console.error('Markers group not found!');
            return;
        }
        
        markersGroup.innerHTML = '';
        const schools = CONFIG.schools;
        
        console.log('Creating markers for schools...');
        
        for (const [schoolId, school] of Object.entries(schools)) {
            if (!school.active || !school.coordinates) {
                console.log(`Skipping ${schoolId} - active: ${school.active}, has coords: ${!!school.coordinates}`);
                continue;
            }
            
            const { x, y } = this.latLngToXY(school.coordinates.lat, school.coordinates.lng);
            console.log(`${school.name}: lat=${school.coordinates.lat}, lng=${school.coordinates.lng} -> x=${x}, y=${y}`);
            
            const shortName = school.name.split(' ').slice(-1)[0];
            
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            marker.setAttribute('class', 'map-marker');
            marker.setAttribute('data-school', schoolId);
            marker.setAttribute('transform', `translate(${x}, ${y})`);
            
            // Marker with value, label below - added transition for hover animation
            marker.innerHTML = `
                <g class="marker-content" style="transition: transform 0.2s ease;">
                    <circle class="marker-pulse" r="18" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5">
                        <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle class="marker-bg" r="16" fill="currentColor" filter="url(#markerShadow)"/>
                    <circle class="marker-inner" r="13" fill="white"/>
                    <text class="marker-value" y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#333">--</text>
                    <text class="marker-label" y="32" text-anchor="middle" font-size="9" font-weight="600" fill="white" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${shortName}</text>
                </g>
            `;
            
            // Store original position for decluttering
            marker.dataset.origX = x;
            marker.dataset.origY = y;
            
            // Add hover animation - scale up marker on hover
            const markerContent = marker.querySelector('.marker-content');
            marker.addEventListener('mouseenter', () => {
                markerContent.style.transform = 'scale(1.5)';
                marker.style.zIndex = '1000';
                // Bring to front by reappending to parent
                marker.parentNode.appendChild(marker);
            });
            marker.addEventListener('mouseleave', () => {
                markerContent.style.transform = 'scale(1)';
                marker.style.zIndex = '';
            });
            
            marker.addEventListener('click', () => this.showSchoolInfo(schoolId));
            marker.style.cursor = 'pointer';
            
            markersGroup.appendChild(marker);
            this.markers.push({ element: marker, schoolId });
        }
        
        console.log(`Created ${this.markers.length} markers`);
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
