let map3DElement = null;
let autocomplete = null;

async function initMap() {
    const mapContainer = document.getElementById('map-container');
    try {
        console.log('Starting map initialization...');
        mapContainer.innerHTML = `
            <div class="d-flex flex-column justify-content-center align-items-center h-100">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading map...</span>
                </div>
                <div>Initializing 3D Map...</div>
            </div>
        `;

        // Wait for Google Maps API to be fully loaded
        if (!window.google || !window.google.maps) {
            await new Promise((resolve, reject) => {
                const checkGoogleMaps = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkGoogleMaps);
                        resolve();
                    }
                }, 100);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkGoogleMaps);
                    reject(new Error('Google Maps API failed to load'));
                }, 10000);
            });
        }

        // Import required libraries with proper error handling
        let Map3DElement, Autocomplete, ElevationService;
        try {
            const [maps3d, places, elevation] = await Promise.all([
                google.maps.importLibrary("maps3d"),
                google.maps.importLibrary("places"),
                google.maps.importLibrary("elevation")
            ]);
            
            Map3DElement = maps3d.Map3DElement;
            Autocomplete = places.Autocomplete;
            ElevationService = elevation.ElevationService;
        } catch (e) {
            throw new Error("Failed to load required Google Maps APIs: " + e.message);
        }
        
        // Ensure custom element is defined
        if (!customElements.get('gmp-map-3d')) {
            await customElements.whenDefined('gmp-map-3d');
        }
        
        // Create new map instance with initial view of Tokyo
        map3DElement = new Map3DElement({
            center: { lat: 35.6539047014202, lng: 139.7638538324872, altitude: 100 },
            heading: 30,
            tilt: 67.5,
            range: 1000,
            defaultLabelsDisabled: false
        });
        
        // Clear and append map
        mapContainer.innerHTML = '';
        mapContainer.appendChild(map3DElement);
        
        // Initialize features sequentially with proper error handling
        try {
            await initAutocomplete();
            await initControls();
        } catch (e) {
            console.warn('Feature initialization warning:', e);
        }
        
        console.log('Map initialized successfully');
        
        // Add initial animation
        map3DElement.flyCameraTo({
            endCamera: {
                center: { lat: 35.6539047014202, lng: 139.7638538324872, altitude: 500 },
                tilt: 67.5,
                range: 2000
            },
            durationMillis: 2000
        });

        // Add labels toggle event listener
        document.getElementById('labels-toggle').addEventListener('change', function(e) {
            if (map3DElement) {
                map3DElement.defaultLabelsDisabled = !e.target.checked;
            }
        });

    } catch (error) {
        console.error('Map initialization error:', error);
        mapContainer.innerHTML = `
            <div class="alert alert-danger">
                <h4 class="alert-heading">Map Initialization Failed</h4>
                <p>${error.message}</p>
                <hr>
                <p class="mb-0">Please check:</p>
                <ul>
                    <li>Internet connection is stable</li>
                    <li>Google Maps API key is valid and has the following APIs enabled:
                        <ul>
                            <li>Maps JavaScript API</li>
                            <li>Maps 3D API</li>
                            <li>Places API</li>
                            <li>Elevation API</li>
                        </ul>
                    </li>
                </ul>
                <button class="btn btn-primary mt-3" onclick="window.location.reload()">
                    <i class="fas fa-sync-alt me-2"></i>Retry Loading
                </button>
            </div>
        `;
        throw error;
    }
}

async function initAutocomplete() {
    try {
        const { Autocomplete } = await google.maps.importLibrary("places");
        
        autocomplete = new Autocomplete(document.getElementById("pac-input"), {
            fields: ["geometry", "name", "place_id"],
        });
        
        autocomplete.addListener("place_changed", async () => {
            const place = autocomplete.getPlace();
            if (!place.geometry) {
                alert("場所が見つかりませんでした: " + place.name);
                return;
            }
            
            const location = place.geometry.location;
            const viewport = place.geometry.viewport;
            
            const placeName = place.name;
            document.getElementById('polygon-name').value = placeName;
            
            console.log(`場所が選択されました: ${placeName}`);
            console.log('位置情報:', { lat: location.lat(), lng: location.lng() });
            
            // カメラを選択した場所に移動
            map3DElement.flyCameraTo({
                endCamera: {
                    center: {
                        lat: location.lat(),
                        lng: location.lng(),
                        altitude: 100
                    },
                    tilt: 67.5,
                    range: 500
                },
                durationMillis: 2000
            });
            
            // ビューポートが存在する場合、ポリラインを表示
            if (viewport) {
                await updateViewportPolygon(viewport);
            }
        });
    } catch (error) {
        console.error('Autocomplete initialization error:', error);
    }
}

async function updateViewportPolygon(viewport) {
    try {
        const { Polyline3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
        
        const points = [
            { lat: viewport.getNorthEast().lat(), lng: viewport.getNorthEast().lng() },
            { lat: viewport.getSouthWest().lat(), lng: viewport.getNorthEast().lng() },
            { lat: viewport.getSouthWest().lat(), lng: viewport.getSouthWest().lng() },
            { lat: viewport.getNorthEast().lat(), lng: viewport.getSouthWest().lng() },
            { lat: viewport.getNorthEast().lat(), lng: viewport.getNorthEast().lng() }
        ];
        
        // 既存のポリラインを削除
        const existingPolylines = map3DElement.querySelectorAll('gmp-polyline-3d');
        existingPolylines.forEach(polyline => polyline.remove());
        
        // 新しいポリラインを作成
        const polyline = new Polyline3DElement({
            altitudeMode: AltitudeMode.CLAMP_TO_GROUND,
            strokeColor: "#4285F4",
            strokeWidth: 3,
            coordinates: points
        });
        
        map3DElement.append(polyline);
        console.log('ポリラインを表示しました');
        
        // 座標入力フィールドを更新
        points.slice(0, -1).forEach((point, index) => {
            const latInput = document.querySelector(`.coordinate-lat[data-point="${index + 1}"]`);
            const lngInput = document.querySelector(`.coordinate-lng[data-point="${index + 1}"]`);
            
            if (latInput && lngInput) {
                latInput.value = point.lat.toFixed(6);
                lngInput.value = point.lng.toFixed(6);
            }
        });
    } catch (error) {
        console.error('Viewport polygon update error:', error);
    }
}

function initControls() {
    const aroundButton = document.getElementById('around');
    if (aroundButton) {
        aroundButton.addEventListener('click', () => {
            const currentCamera = {
                center: map3DElement.center,
                tilt: map3DElement.tilt,
                range: map3DElement.range
            };
            
            const durationSeconds = Number(document.getElementById('rotation-duration').value) || 30;
            
            map3DElement.flyCameraAround({
                camera: currentCamera,
                durationMillis: durationSeconds * 1000,
                rounds: 1
            });
        });
    }
}

// DOMContentLoadedイベントで初期化を実行
document.addEventListener('DOMContentLoaded', initMap);
