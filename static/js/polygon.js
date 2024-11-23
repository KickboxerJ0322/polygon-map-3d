let polygons = [];

async function createPolygon() {
    const { Polygon3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
    
    const coordinates = Array.from(document.querySelectorAll('.coordinate-input'))
        .map(input => {
            const [lat, lng] = input.value.split(',').map(Number);
            return {
                lat,
                lng,
                altitude: Number(document.getElementById('height-input').value)
            };
        });
    
    const polygon = new Polygon3DElement({
        altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
        fillColor: document.getElementById('fill-color').value,
        strokeColor: document.getElementById('stroke-color').value,
        strokeWidth: Number(document.getElementById('stroke-width').value),
        extruded: true
    });
    
    polygon.outerCoordinates = coordinates;
    map3DElement.append(polygon);
    
    // Save to database
    const polygonData = {
        name: `Polygon ${polygons.length + 1}`,
        coordinates: coordinates,
        height: Number(document.getElementById('height-input').value),
        fill_color: document.getElementById('fill-color').value,
        stroke_color: document.getElementById('stroke-color').value,
        stroke_width: Number(document.getElementById('stroke-width').value)
    };
    
    const response = await fetch('/api/polygons', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(polygonData)
    });
    
    if (response.ok) {
        const result = await response.json();
        polygonData.id = result.id;
        polygons.push(polygonData);
        updatePolygonTable();
    }
}

function updatePolygonTable() {
    const tbody = document.getElementById('polygon-list');
    tbody.innerHTML = '';
    
    polygons.forEach(polygon => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${polygon.name}</td>
            <td>${polygon.height}m</td>
            <td><div style="background-color: ${polygon.fill_color}; width: 20px; height: 20px;"></div></td>
            <td><div style="background-color: ${polygon.stroke_color}; width: 20px; height: 20px;"></div></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editPolygon(${polygon.id})">Edit</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadPolygons() {
    const response = await fetch('/api/polygons');
    if (response.ok) {
        polygons = await response.json();
        updatePolygonTable();
        
        // Recreate polygons on map
        const { Polygon3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
        
        polygons.forEach(polygonData => {
            const polygon = new Polygon3DElement({
                altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
                fillColor: polygonData.fill_color,
                strokeColor: polygonData.stroke_color,
                strokeWidth: polygonData.stroke_width,
                extruded: true
            });
            polygon.outerCoordinates = polygonData.coordinates;
            map3DElement.append(polygon);
        });
    }
}

document.getElementById('create-polygon').addEventListener('click', createPolygon);
window.addEventListener('load', loadPolygons);
