let polygons = [];

async function createPolygon() {
    try {
        const { Polygon3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
        
        // Validate inputs
        const coordinates = [];
        console.log('座標の検証を開始します...');
        
        for (let i = 1; i <= 4; i++) {
            const latInput = document.querySelector(`.coordinate-lat[data-point="${i}"]`);
            const lngInput = document.querySelector(`.coordinate-lng[data-point="${i}"]`);
            
            if (!latInput || !lngInput) {
                console.error(`ポイント ${i} の入力フィールドが見つかりません。`);
                throw new Error('入力フィールドの取得に失敗しました。');
            }
            
            const lat = Number(latInput.value);
            const lng = Number(lngInput.value);
            
            console.log(`ポイント ${i}: 緯度=${lat}, 経度=${lng}`);
            
            if (!latInput.value || !lngInput.value) {
                throw new Error(`ポイント ${i} の座標が入力されていません。`);
            }
            
            if (isNaN(lat) || isNaN(lng) || 
                lat < -90 || lat > 90 || 
                lng < -180 || lng > 180) {
                throw new Error(`ポイント ${i + 1} の座標が無効です。緯度は -90 から 90、経度は -180 から 180 の間である必要があります。`);
            }
            
            coordinates.push({
                lat,
                lng,
                altitude: Number(document.getElementById('height-input').value) || 0
            });
        }
        
        // Validate height
        const height = Number(document.getElementById('height-input').value);
        if (isNaN(height) || height < 0) {
            throw new Error('高さは0以上の数値を入力してください。');
        }
        
        console.log('ポリゴンを作成中:', {
            coordinates,
            height,
            fillColor: document.getElementById('fill-color').value,
            strokeColor: document.getElementById('stroke-color').value
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
        console.log('ポリゴンが正常に保存されました。');
    } else {
        throw new Error('ポリゴンの保存中にエラーが発生しました。');
    }
    } catch (error) {
        console.error('エラー:', error.message);
        alert(error.message);
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
