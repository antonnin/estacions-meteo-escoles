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
        // --- Pinch-to-zoom support for trackpads and touchscreens ---
        addPinchZoomSupport(svg) {
            let lastTouchDist = null;
            let lastMidpoint = null;
            svg.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                    lastMidpoint = {
                        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
                    };
                }
            }, { passive: false });
            svg.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2 && lastTouchDist !== null) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const newDist = Math.sqrt(dx * dx + dy * dy);
                    const scale = newDist / lastTouchDist;
                    if (Math.abs(scale - 1) > 0.01) {
                        // Pinch midpoint in SVG coordinates
                        const svgRect = svg.getBoundingClientRect();
                        const midX = lastMidpoint.x - svgRect.left;
                        const midY = lastMidpoint.y - svgRect.top;
                        this.zoom(scale, { x: midX, y: midY, svg });
                        lastTouchDist = newDist;
                        lastMidpoint = {
                            x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                            y: (e.touches[0].clientY + e.touches[1].clientY) / 2
                        };
                    }
                    e.preventDefault();
                }
            }, { passive: false });
            svg.addEventListener('touchend', (e) => {
                if (e.touches.length < 2) {
                    lastTouchDist = null;
                    lastMidpoint = null;
                }
            });
            // Trackpad pinch-zoom (gesture events, non-standard, but supported in some browsers)
            svg.addEventListener('gesturestart', (e) => {
                e.preventDefault();
            });
            svg.addEventListener('gesturechange', (e) => {
                // e.scale > 1: zoom in, < 1: zoom out
                const svgRect = svg.getBoundingClientRect();
                const mouseX = e.clientX - svgRect.left;
                const mouseY = e.clientY - svgRect.top;
                this.zoom(e.scale, { x: mouseX, y: mouseY, svg });
                e.preventDefault();
            });
            svg.addEventListener('gestureend', (e) => {
                e.preventDefault();
            });
        }
    addKeyboardAndWheelControls(svg) {
        // Keyboard zoom: Ctrl + '+' or '-' (on main keyboard or numpad)
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && !e.shiftKey && !e.altKey) {
                if (e.key === '+' || e.key === '=' || e.key === 'Add') {
                    this.zoom(1.2);
                    e.preventDefault();
                } else if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
                    this.zoom(0.8);
                    e.preventDefault();
                }
            }
        });

        // Shift + mouse wheel for horizontal pan
        svg.addEventListener('wheel', (e) => {
            if (e.shiftKey) {
                // Zoom in/out around mouse position
                const svgRect = svg.getBoundingClientRect();
                const mouseX = e.clientX - svgRect.left;
                const mouseY = e.clientY - svgRect.top;
                const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8;
                this.zoom(zoomFactor, { x: mouseX, y: mouseY, svg });
                e.preventDefault();
            } else if (e.ctrlKey) {
                // Ctrl + wheel for zoom (like Google Maps)
                const rect = svg.getBoundingClientRect();
                const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                if (e.deltaY < 0) {
                    this.zoom(1.2, mouse);
                } else if (e.deltaY > 0) {
                    this.zoom(0.8, mouse);
                }
                e.preventDefault();
            }
        }, { passive: false });
    }
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
        
        this.currentSensor = 'field2'; // Temperatura per defecte
        this.schoolData = {};
        this.markers = [];
        
        this.sensorConfig = {
            field1: { name: 'Pols', unit: 'ug/m3', icon: '🫧', colorScale: ['#ECEFF1', '#B0BEC5', '#78909C', '#546E7A', '#37474F'] },
            field2: { name: 'Temperatura', unit: '°C', icon: '🌡️', colorScale: ['#3B82F6', '#10B981', '#FBBF24', '#F97316', '#EF4444'] },
            field3: { name: 'Humitat', unit: '%', icon: '💧', colorScale: ['#FEE2E2', '#BFDBFE', '#93C5FD', '#3B82F6', '#1E40AF'] },
            field4: { name: 'Pressió', unit: 'hPa', icon: '📊', colorScale: ['#D1FAE5', '#6EE7B7', '#34D399', '#10B981', '#047857'] },
            field5: { name: 'Altura', unit: 'm', icon: '⛰️', colorScale: ['#FFF3E0', '#FFB74D', '#FF9800', '#F57C00', '#E65100'] },
            field6: { name: 'Lluminositat', unit: '%', icon: '☀️', colorScale: ['#FFF9C4', '#FFF176', '#FFEB3B', '#FDD835', '#F9A825'] },
            field7: { name: 'Vent', unit: 'm/s', icon: '💨', colorScale: ['#E0E7FF', '#A5B4FC', '#818CF8', '#6366F1', '#4338CA'] }
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
                
                // Force uniform background color by completely replacing inline styles
                paths.forEach(path => {
                    path.classList.add('comarca-path');
                    // Remove both fill attribute AND any inline style fill
                    path.removeAttribute('fill');
                    // Clear existing inline style and set new one
                    path.setAttribute('style', 'fill: rgba(30, 58, 95, 0.6) !important; fill-opacity: 1 !important; stroke: rgba(0, 0, 0, 0.4); stroke-width: 0.3; transition: fill 0.3s ease;');
                });
                
                // No hover effects for map paths (landing page)
                
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

                // Add keyboard and advanced wheel controls
                this.addKeyboardAndWheelControls(svg);

                // Add pinch-to-zoom for trackpad/touchscreen
                this.addPinchZoomSupport(svg);
                
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
        // Remove any existing school-list-panel to prevent duplicates
        const oldPanel = document.getElementById('school-list-panel');
        if (oldPanel && oldPanel.parentNode) oldPanel.parentNode.removeChild(oldPanel);
        this.container.innerHTML = `
            <div class="catalonia-map-wrapper">
                <div class="map-header">
                    <h3>🗺️ Mapa de Catalunya</h3>
                    <p>Visualització en temps real de les estacions meteorològiques</p>
                </div>
                <div class="sensor-selector">
                    <button class="sensor-btn" data-sensor="field1"><span>🫧</span><span>Pols</span></button>
                    <button class="sensor-btn active" data-sensor="field2"><span>🌡️</span><span>Temperatura</span></button>
                    <button class="sensor-btn" data-sensor="field3"><span>💧</span><span>Humitat</span></button>
                    <button class="sensor-btn" data-sensor="field4"><span>📊</span><span>Pressió</span></button>
                    <button class="sensor-btn" data-sensor="field5"><span>⛰️</span><span>Altura</span></button>
                    <button class="sensor-btn" data-sensor="field6"><span>☀️</span><span>Lluminositat</span></button>
                    <button class="sensor-btn" data-sensor="field7"><span>💨</span><span>Vent</span></button>
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
                <div class="school-list-panel" id="school-list-panel" style="margin: 24px auto 0 auto; position:relative; z-index:1; background:rgba(20,30,50,0.92); border-radius:12px; padding:0; min-width:220px; max-width:420px; box-shadow:0 2px 12px #0002; width:100%; max-width:420px;">
                    <div id="school-list-header" style="font-weight:700;font-size:1.1em;padding:12px 18px;cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;">
                        <span>Estat de les escoles</span>
                        <span id="school-list-toggle" style="font-size:1.3em;transition:transform 0.2s;">▼</span>
                    </div>
                    <ul id="school-list" style="list-style:none;padding:0 18px 12px 18px;margin:0;display:block;"></ul>
                </div>
            </div>
        `;
        this.bindEvents();
        // Add fold/unfold logic for school list
        const header = document.getElementById('school-list-header');
        const list = document.getElementById('school-list');
        const toggle = document.getElementById('school-list-toggle');
        if (header && list && toggle) {
            header.addEventListener('click', () => {
                const isOpen = list.style.display !== 'none';
                if (isOpen) {
                    list.style.display = 'none';
                    toggle.textContent = '▲';
                } else {
                    list.style.display = 'block';
                    toggle.textContent = '▼';
                }
            });
        }
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
        this.schoolData = {};
        // DEMO MODE: use DemoDataGenerator
        if (typeof DemoDataGenerator !== 'undefined' && DemoDataGenerator.isEnabled()) {
            for (const [schoolId, school] of Object.entries(schools)) {
                if (!school.active) continue;
                try {
                    const demoData = DemoDataGenerator.generateSchoolData(schoolId, new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());
                    if (demoData && demoData.feeds) {
                        this.schoolData[schoolId] = demoData;
                    }
                } catch (e) {
                    console.warn(`Could not load demo data for ${schoolId}:`, e);
                }
            }
        } else {
            // NON-DEMO MODE: use ThingSpeak service (same as dashboard and status indicators)
            if (typeof thingSpeakService !== 'undefined') {
                const now = new Date();
                const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
                
                for (const [schoolId, school] of Object.entries(schools)) {
                    if (!school.active) continue;
                    try {
                        // Use the same data source as dashboard and status indicators
                        const data = await thingSpeakService.fetchChannelData(schoolId, startDate, now);
                        if (data && data.feeds && data.feeds.length > 0) {
                            this.schoolData[schoolId] = data;
                        }
                    } catch (e) {
                        console.warn(`Could not load data for ${schoolId}:`, e);
                    }
                }
            }
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
    
    zoom(factor, mouse = null) {
        // If mouse is provided, zoom around that SVG point (works for both in and out)
        if (mouse) {
            const svg = document.getElementById('catalonia-svg');
            if (svg && svg.createSVGPoint) {
                const pt = svg.createSVGPoint();
                pt.x = mouse.x;
                pt.y = mouse.y;
                const ctm = svg.getScreenCTM();
                if (ctm) {
                    const inv = ctm.inverse();
                    const svgPt = pt.matrixTransform(inv);
                    const oldZoom = this.currentZoom;
                    // Calculate new zoom, clamp
                    let newZoom = this.currentZoom * factor;
                    newZoom = Math.max(0.5, Math.min(8, newZoom));
                    // The mouse position in SVG coordinates should remain under the mouse after zoom
                    // So, adjust pan so that the SVG point under the mouse stays under the mouse
                    this.currentX = (this.currentX - svgPt.x) * (newZoom / oldZoom) + svgPt.x;
                    this.currentY = (this.currentY - svgPt.y) * (newZoom / oldZoom) + svgPt.y;
                    this.currentZoom = newZoom;
                } else {
                    this.currentZoom *= factor;
                    this.currentZoom = Math.max(0.5, Math.min(8, this.currentZoom));
                }
            } else {
                this.currentZoom *= factor;
                this.currentZoom = Math.max(0.5, Math.min(8, this.currentZoom));
            }
        } else {
            this.currentZoom *= factor;
            this.currentZoom = Math.max(0.5, Math.min(8, this.currentZoom));
        }
        this.applyTransform();
        this.updateMarkerScales();
    }

    updateMarkerScales() {
        // Keep marker size constant regardless of zoom
        const markersGroup = document.getElementById('markers-group');
        if (!markersGroup) return;
        const scale = 1 / this.currentZoom;
        markersGroup.childNodes.forEach(marker => {
            if (marker.nodeType === 1 && marker.hasAttribute('data-base-transform')) {
                marker.setAttribute('transform', marker.getAttribute('data-base-transform') + ` scale(${scale})`);
            }
        });
    }
    
    resetZoom() {
        this.currentZoom = 1;
        this.currentX = 0;
        this.currentY = 0;
        this.applyTransform();
    }
    
    applyTransform() {
        const transformWrapper = document.getElementById('transform-wrapper');
        if (transformWrapper) {
            transformWrapper.setAttribute('transform', 
                `translate(${this.currentX}, ${this.currentY}) scale(${this.currentZoom})`);
        }
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
    
    latLngToXY(lat, lng, schoolId = null) {
        // Apply offset to move markers north and east (except for Santa Coloma and ZER Moianès)
        if (schoolId !== 'escola3' && schoolId !== 'escola5') {
            lat = lat + 0.0152;
            lng = lng + 0.1153;
        }
        
        // Convert GPS coordinates to SVG coordinates using precise calibration
        // 
        // Reference points from SVG comarca text labels (center coordinates):
        // - Tarragonès: SVG (80.24, 369.69), GPS (41.12, 1.24)
        // - Garraf: SVG (204.24, 344.69), GPS (41.30, 1.82)  
        // - Barcelonès: SVG (286.24, 302.69), GPS (41.40, 2.16)
        // - Cerdanya: SVG (207.24, -10.31), GPS (42.45, 1.95)
        //
        // Linear regression:
        // X: slope = (286.24-80.24)/(2.16-1.24) = 206/0.92 = 223.91
        //    intercept = 80.24 - 223.91*1.24 = -197.41
        // Y: slope = (-10.31-344.69)/(42.45-41.30) = -355/1.15 = -308.70
        //    intercept = 344.69 - (-308.70)*41.30 = 13093.80
        
        const lngScale = 223.91304347826087;
        const lngOffset = -197.41217391304348;
        
        const latScale = -308.6956521739130;
        const latOffset = 13093.800000000001;
        
        const x = lngOffset + lng * lngScale;
        const y = latOffset + lat * latScale;
        
        // Return exact decimals, no rounding
        return { x: x, y: y };
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
            const { x, y } = this.latLngToXY(school.coordinates.lat, school.coordinates.lng, schoolId);
            console.log(`${school.name}: lat=${school.coordinates.lat}, lng=${school.coordinates.lng} -> x=${x}, y=${y}`);
            const fullName = school.name;
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            marker.setAttribute('class', 'map-marker');
            marker.setAttribute('data-school', schoolId);
            marker.setAttribute('transform', `translate(${x}, ${y})`);
            marker.setAttribute('data-base-transform', `translate(${x}, ${y})`);
            marker.innerHTML = `
                <g class="marker-content">
                    <circle class="marker-pulse" r="18" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5">
                        <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle class="marker-bg" r="16" fill="currentColor" filter="url(#markerShadow)"/>
                    <circle class="marker-inner" r="13" fill="white"/>
                    <text class="marker-value" y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#333">--</text>
                    <text class="marker-label" y="32" text-anchor="middle" font-size="9" font-weight="600" fill="white" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${fullName}</text>
                </g>
            `;
            marker.addEventListener('click', () => this.showSchoolInfo(schoolId));
            marker.style.cursor = 'pointer';
            markersGroup.appendChild(marker);
            this.markers.push({ element: marker, schoolId });
        }
        this.updateMarkerScales();
        
        console.log(`Created ${this.markers.length} markers`);
    }
    
    updateMarkers() {
        const config = this.sensorConfig[this.currentSensor];
        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;
        // For each school, find latest value within 24h for the selected field
        const schoolList = [];
        const values = this.markers.map(({ schoolId }) => {
            const school = CONFIG.schools[schoolId];
            let value = null;
            let timestamp = null;
            if (school && this.schoolData[schoolId] && this.schoolData[schoolId].feeds) {
                const feeds = this.schoolData[schoolId].feeds;
                for (let i = feeds.length - 1; i >= 0; i--) {
                    const feed = feeds[i];
                    // Support both 'timestamp' and 'created_at' fields
                    const feedTime = feed.timestamp || feed.created_at;
                    if (!feedTime) continue;
                    const t = new Date(feedTime).getTime();
                    if (now - t <= DAY_MS && feed[this.currentSensor] !== undefined && feed[this.currentSensor] !== null) {
                        value = feed[this.currentSensor];
                        timestamp = feedTime;
                        break;
                    }
                }
            }
            schoolList.push({
                schoolId,
                name: school?.name || schoolId,
                value,
                timestamp
            });
            return { schoolId, value, timestamp };
        });

        // Only show markers for schools with value in 24h
        const validValues = values.filter(v => v.value !== null && v.value !== undefined);
        if (validValues.length === 0) {
            this.markers.forEach(({ element }) => {
                element.style.display = 'none';
            });
        } else {
            const minVal = Math.min(...validValues.map(v => v.value));
            const maxVal = Math.max(...validValues.map(v => v.value));
            this.updateLegend(minVal, maxVal, config);
            this.markers.forEach(({ element, schoolId }) => {
                const found = validValues.find(v => v.schoolId === schoolId);
                if (!found) {
                    element.style.display = 'none';
                    return;
                }
                element.style.display = '';
                const value = found.value;
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
                if (markerBg) markerBg.setAttribute('fill', color);
                if (markerInner) markerInner.setAttribute('fill', color);
                if (pulse) pulse.setAttribute('stroke', color);
                element.style.color = color;
            });
        }

        // Update school list panel (clear and update, never duplicate)
        const schoolListElem = document.getElementById('school-list');
        if (schoolListElem) {
            schoolListElem.innerHTML = '';
            schoolList.forEach(({ schoolId, name, value, timestamp }) => {
                let statusHtml = '';
                if (value !== null && value !== undefined) {
                    const d = new Date(timestamp);
                    statusHtml = `<span style=\"color:#22c55e;font-weight:600;\">${this.formatNumber(value, this.currentSensor === 'field3' ? 0 : 1)} ${config.unit}</span> <span style=\"color:#aaa;font-size:0.92em;\">(${d.toLocaleString('ca-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' })})</span>`;
                } else if (typeof DemoDataGenerator !== 'undefined' && DemoDataGenerator.isEnabled()) {
                    statusHtml = `<span style=\"color:#facc15;font-weight:600;\">Mode demo</span>`;
                } else {
                    statusHtml = `<span style=\"color:#ef4444;font-weight:600;\">dada no disponible</span>`;
                }
                const li = document.createElement('li');
                li.style.marginBottom = '6px';
                li.innerHTML = `<span style=\"font-weight:600;\">${name}</span>: ${statusHtml}`;
                schoolListElem.appendChild(li);
            });
        }
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
        
        const decimals = (this.currentSensor === 'field4' || this.currentSensor === 'field5') ? 0 : 1;
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

        // Find latest value/timestamp for each field within 24h
        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;
        let feeds = data.feeds || [];
        function latestFieldValue(field) {
            for (let i = feeds.length - 1; i >= 0; i--) {
                const feed = feeds[i];
                // Support both 'timestamp' and 'created_at' fields
                const feedTime = feed.timestamp || feed.created_at;
                if (!feedTime) continue;
                const t = new Date(feedTime).getTime();
                if (now - t <= DAY_MS && feed[field] !== undefined && feed[field] !== null) {
                    return { value: feed[field], timestamp: feedTime };
                }
            }
            // fallback for demo/simple data
            if (data[field] !== undefined) {
                return { value: data[field], timestamp: null };
            }
            return { value: null, timestamp: null };
        }

        // Generate friendly school URL
        let schoolUrl = '';
        switch (schoolId) {
            case 'escola1': schoolUrl = 'escola-mas-i-perera.html'; break;
            case 'escola2': schoolUrl = 'escola-jaume-balmes.html'; break;
            case 'escola3': schoolUrl = 'escola-santa-coloma.html'; break;
            case 'escola4': schoolUrl = 'escola-mar-i-cel.html'; break;
            case 'escola5': schoolUrl = 'zer-moianes.html'; break;
            case 'escola6': schoolUrl = 'escola-el-castellot.html'; break;
            default: schoolUrl = 'escola.html?id=' + schoolId;
        }
        // Helper to format timestamp
        function formatTs(ts) {
            if (!ts) return '<span style="color:#aaa">no disponible</span>';
            const d = new Date(ts);
            return d.toLocaleString('ca-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
        }
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
                        <span>🫧</span>
                        <span>${this.formatNumber(latestFieldValue('field1').value, 1)} ug/m3</span>
                        <span class="info-ts">${formatTs(latestFieldValue('field1').timestamp)}</span>
                    </div>
                    <div class="info-value">
                        <span>🌡️</span>
                        <span>${this.formatNumber(latestFieldValue('field2').value, 1)}°C</span>
                        <span class="info-ts">${formatTs(latestFieldValue('field2').timestamp)}</span>
                    </div>
                    <div class="info-value">
                        <span>💧</span>
                        <span>${this.formatNumber(latestFieldValue('field3').value, 1)}%</span>
                        <span class="info-ts">${formatTs(latestFieldValue('field3').timestamp)}</span>
                    </div>
                    <div class="info-value">
                        <span>📊</span>
                        <span>${this.formatNumber(latestFieldValue('field4').value, 0)} hPa</span>
                        <span class="info-ts">${formatTs(latestFieldValue('field4').timestamp)}</span>
                    </div>
                    <div class="info-value">
                        <span>⛰️</span>
                        <span>${this.formatNumber(latestFieldValue('field5').value, 0)} m</span>
                        <span class="info-ts">${formatTs(latestFieldValue('field5').timestamp)}</span>
                    </div>
                    <div class="info-value">
                        <span>☀️</span>
                        <span>${this.formatNumber(latestFieldValue('field6').value, 1)}%</span>
                        <span class="info-ts">${formatTs(latestFieldValue('field6').timestamp)}</span>
                    </div>
                    <div class="info-value">
                        <span>💨</span>
                        <span>${this.formatNumber(latestFieldValue('field7').value, 1)} m/s</span>
                        <span class="info-ts">${formatTs(latestFieldValue('field7').timestamp)}</span>
                    </div>
                </div>
                <a href="${schoolUrl}" class="view-data-btn" style="margin-top: 16px; display: inline-flex; text-align: center; justify-content: center; width: 100%;">
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
