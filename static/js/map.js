let map3DElement = null;
let autocomplete = null;

async function initMap() {
    try {
        console.log('Starting map initialization...');
        const { Map3DElement } = await google.maps.importLibrary("maps3d");
        
        // Wait for custom element to be defined
        await customElements.whenDefined('gmp-map-3d');
        
        // Pre-load required libraries
        await Promise.all([
            google.maps.importLibrary("places"),
            google.maps.importLibrary("elevation")
        ]);
        
        // 地図の初期設定
        const mapOptions = {
            center: { lat: 35.6539047014202, lng: 139.7638538324872, altitude: 0 },
            heading: 30,
            tilt: 70,
            range: 1000
        };
        
        // Get existing map element
        map3DElement = document.getElementById('map');
        
        // Set map options
        Object.assign(map3DElement, mapOptions);
        
        // Initialize additional features
        await initAutocomplete();
        initControls();
        
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Map initialization error:', error);
        console.error(error.stack);
        alert('Map initialization failed. Please refresh the page.');
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
