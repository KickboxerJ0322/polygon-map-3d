let map3DElement = null;
let autocomplete = null;

async function initMap() {
    const { Map3DElement } = await google.maps.importLibrary("maps3d");
    
    map3DElement = new Map3DElement({
        center: { lat: 35.6361, lng: 139.7636, altitude: 0 }, // Rainbow Bridge
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
            alert("No location found for input: " + place.name);
            return;
        }
        
        map3DElement.center = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            altitude: 0
        };
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

window.addEventListener('load', initMap);
