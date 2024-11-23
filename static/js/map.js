let map3DElement = null;
let autocomplete = null;

async function initMap() {
    try {
        console.log('Starting map initialization...');
        await google.maps.importLibrary("maps");
        const { Map3DElement } = await google.maps.importLibrary("maps3d");
        
        // Wait for custom element to be defined
        await customElements.whenDefined('gmp-map-3d');
        
        // Create new Map3D element
        map3DElement = new Map3DElement({
            center: { lat: 35.6539047014202, lng: 139.7638538324872, altitude: 0 }, // Takeshiba
            heading: 30,
            tilt: 70,
            range: 1000
        });
        
        // Replace the existing element with the new map
        const mapContainer = document.getElementById('map');
        mapContainer.replaceWith(map3DElement);
        
        await initAutocomplete();
        initRotateButton();
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Map initialization error:', error);
        console.error(error.stack);
    }
}

async function initAutocomplete() {
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
        
        console.log(`場所が選択されました: ${place.name}`);
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
        }
    });
}

function initRotateButton() {
    document.getElementById('rotate-camera').addEventListener('click', () => {
        const currentCenter = map3DElement.center;
        
        map3DElement.flyCameraAround({
            camera: {
                center: currentCenter,
                tilt: 70,
                range: 1000
            },
            durationMillis: 30000,
            rounds: 1
        });
    });
}

function initFlyToButton() {
    document.getElementById('fly-to').addEventListener('click', () => {
        if (!autocomplete) return;
        
        const place = autocomplete.getPlace();
        if (!place || !place.geometry) {
            alert('移動先の場所を選択してください。');
            return;
        }
        
        const targetLocation = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            altitude: 100
        };
        
        map3DElement.flyCameraTo({
            endCamera: {
                center: targetLocation,
                tilt: 67.5,
                range: 200
            },
            durationMillis: 3000
        });
    });
}

function initControls() {
    initRotateButton();
    initFlyToButton();
}

// Expose initMap to global scope
window.initMap = initMap;
