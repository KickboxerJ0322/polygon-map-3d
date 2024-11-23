let map3DElement = null;
let autocomplete = null;

async function initMap() {
    const { Map3DElement } = await google.maps.importLibrary("maps3d");
    
    map3DElement = new Map3DElement({
        center: { lat: 35.6589, lng: 139.7622, altitude: 0 }, // 東京・竹芝
        heading: 30,
        tilt: 70,
        range: 1000,
    });
    
    document.getElementById('map').replaceWith(map3DElement);
    initAutocomplete();
    initRotateButton();
}

async function initAutocomplete() {
    const { Autocomplete } = await google.maps.importLibrary("places");
    
    autocomplete = new Autocomplete(document.getElementById("pac-input"), {
        fields: ["geometry", "name", "place_id"],
    });
    
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            alert("場所が見つかりませんでした: " + place.name);
            return;
        }
        
        const location = place.geometry.location;
        const viewport = place.geometry.viewport;
        
        // Update center
        map3DElement.center = {
            lat: location.lat(),
            lng: location.lng(),
            altitude: 0
        };
        
        // Update coordinate inputs if viewport exists
        if (viewport) {
            const inputs = document.querySelectorAll('.coordinate-input');
            const coordinates = [
                { lat: viewport.getNorthEast().lat(), lng: viewport.getNorthEast().lng() },
                { lat: viewport.getSouthWest().lat(), lng: viewport.getNorthEast().lng() },
                { lat: viewport.getSouthWest().lat(), lng: viewport.getSouthWest().lng() },
                { lat: viewport.getNorthEast().lat(), lng: viewport.getSouthWest().lng() }
            ];
            
            coordinates.forEach((coord, index) => {
                if (inputs[index]) {
                    inputs[index].value = `${coord.lat.toFixed(6)},${coord.lng.toFixed(6)}`;
                }
            });
        }
        
        console.log(`場所が選択されました: ${place.name}`);
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

window.addEventListener('load', () => {
    initMap();
    initControls();
});
