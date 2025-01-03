function hexToRGBA(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

let polygons = [];

async function createPolygon() {
    try {
        // ユーザー認証チェック
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('ユーザー認証が必要です。');
        }

        // 座標の検証と収集
        const coordinates = [];
        for (let i = 1; i <= 4; i++) {
            const latInput = document.querySelector(`.coordinate-lat[data-point="${i}"]`);
            const lngInput = document.querySelector(`.coordinate-lng[data-point="${i}"]`);
            
            if (!latInput || !lngInput) {
                throw new Error(`ポイント ${i} の入力フィールドが見つかりません。`);
            }
            
            const lat = Number(latInput.value);
            const lng = Number(lngInput.value);
            
            if (!latInput.value || !lngInput.value) {
                throw new Error(`ポイント ${i} の座標が入力されていません。`);
            }
            
            if (isNaN(lat) || isNaN(lng) || 
                lat < -90 || lat > 90 || 
                lng < -180 || lng > 180) {
                throw new Error(`ポイント ${i} の座標が無効です。緯度は -90 から 90、経度は -180 から 180 の間である必要があります。`);
            }
            
            coordinates.push({
                lat,
                lng,
                altitude: Number(document.getElementById('height-input').value) || 0
            });
        }

        // ポリゴンデータの作成
        const polygonData = {
            name: document.getElementById('polygon-name').value || `Polygon ${polygons.length + 1}`,
            coordinates: coordinates,
            height: Number(document.getElementById('height-input').value),
            fill_color: document.getElementById('fill-color').value,
            fill_opacity: Number(document.getElementById('fill-opacity').value) / 100,
            stroke_color: document.getElementById('stroke-color').value,
            stroke_opacity: Number(document.getElementById('stroke-opacity').value) / 100,
            stroke_width: Number(document.getElementById('stroke-width').value)
        };

        // APIリクエストにユーザーIDを含める
        const response = await fetch('/api/polygons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Firebase-UserId': user.uid
            },
            body: JSON.stringify(polygonData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ポリゴンの保存中にエラーが発生しました。');
        }

        const result = await response.json();
        polygonData.id = result.id;
        polygons.push(polygonData);

        // 3Dポリゴンを地図に追加
        const { Polygon3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
        const polygon = new Polygon3DElement({
            altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
            fillColor: hexToRGBA(polygonData.fill_color, polygonData.fill_opacity),
            strokeColor: hexToRGBA(polygonData.stroke_color, polygonData.stroke_opacity),
            strokeWidth: polygonData.stroke_width,
            extruded: true
        });
        polygon.setAttribute('data-id', result.id);
        polygon.outerCoordinates = coordinates;
        map3DElement.append(polygon);

        updatePolygonTable();
        console.log('ポリゴンが正常に作成されました。');
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
                <button class="btn btn-sm btn-primary me-2" onclick="editPolygon(${polygon.id})">Copy</button>
                <button class="btn btn-sm btn-danger" onclick="deletePolygon(${polygon.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadPolygons() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.warn('ユーザーが認証されていません。');
            // 認証されていない場合はポリゴンリストをクリア
            polygons = [];
            updatePolygonTable();
            return;
        }
        
        const response = await fetch('/api/polygons', {
            headers: {
                'X-Firebase-UserId': user.uid
            }
        });
        
        if (!response.ok) {
            throw new Error('ポリゴンの読み込みに失敗しました。');
        }
        
        polygons = await response.json();
        
        // 地図上の全てのポリゴンをクリア
        const existingPolygons = map3DElement.querySelectorAll('gmp-polygon-3d');
        existingPolygons.forEach(polygon => polygon.remove());
        
        // 認証されたユーザーのポリゴンのみを表示
        const { Polygon3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
        
        polygons.forEach(polygonData => {
            if (polygonData.user_id === user.uid) {
                const fillColor = hexToRGBA(polygonData.fill_color, polygonData.fill_opacity);
                const strokeColor = hexToRGBA(polygonData.stroke_color, polygonData.stroke_opacity);
                const polygon = new Polygon3DElement({
                    altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
                    fillColor: fillColor,
                    strokeColor: strokeColor,
                    strokeWidth: polygonData.stroke_width,
                    extruded: true
                });
                polygon.setAttribute('data-id', polygonData.id);
                polygon.outerCoordinates = polygonData.coordinates;
                map3DElement.append(polygon);
            }
        });
        
        updatePolygonTable();
    } catch (error) {
        console.error('ポリゴンの読み込みエラー:', error);
        alert('ポリゴンの読み込み中にエラーが発生しました。');
    }
}

// Firebase認証状態の変更時にポリゴンを再読み込み
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadPolygons();
    } else {
        // ユーザーがログアウトした場合、ポリゴンリストをクリア
        polygons = [];
        updatePolygonTable();
        const existingPolygons = map3DElement.querySelectorAll('gmp-polygon-3d');
        existingPolygons.forEach(polygon => polygon.remove());
    }
});

function hexToRGBA(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

document.getElementById('create-polygon').addEventListener('click', createPolygon);
async function deletePolygon(id) {
    if (!confirm('このポリゴンを削除してもよろしいですか？')) {
        return;
    }

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('ユーザー認証が必要です。');
        }

        const response = await fetch(`/api/polygons/${id}`, {
            method: 'DELETE',
            headers: {
                'X-Firebase-UserId': user.uid
            }
        });

        if (response.ok) {
            // Remove polygon from the array
            polygons = polygons.filter(p => p.id !== id);
            // Update the table
            updatePolygonTable();
            // Remove the polygon from the map
            const existingPolygon = map3DElement.querySelector(`gmp-polygon-3d[data-id="${id}"]`);
            if (existingPolygon) {
                existingPolygon.remove();
            }
            console.log('ポリゴンが正常に削除されました。');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ポリゴンの削除中にエラーが発生しました。');
        }
    } catch (error) {
        console.error('エラー:', error.message);
        alert(error.message);
    }
}
let currentEditingId = null;

async function editPolygon(id) {
    try {
        // 編集中のポリゴンIDを保存
        currentEditingId = null;  // 編集モードではなく、データコピーモードとして扱う
        
        // 該当するポリゴンを取得
        const polygon = polygons.find(p => p.id === id);
        if (!polygon) {
            throw new Error('ポリゴンが見つかりません。');
        }
        
        // フォームに値を設定
        polygon.coordinates.forEach((coord, index) => {
            const latInput = document.querySelector(`.coordinate-lat[data-point="${index + 1}"]`);
            const lngInput = document.querySelector(`.coordinate-lng[data-point="${index + 1}"]`);
            
            if (latInput && lngInput) {
                latInput.value = coord.lat;
                lngInput.value = coord.lng;
            }
        });
        
        // 各フィールドの値を設定
        document.getElementById('polygon-name').value = polygon.name;
        document.getElementById('height-input').value = polygon.height;
        document.getElementById('fill-color').value = polygon.fill_color;
        document.getElementById('fill-opacity').value = polygon.fill_opacity * 100;
        document.getElementById('stroke-color').value = polygon.stroke_color;
        document.getElementById('stroke-opacity').value = polygon.stroke_opacity * 100;
        document.getElementById('stroke-width').value = polygon.stroke_width;
        
        // create-polygonボタンは有効のまま
        document.getElementById('create-polygon').disabled = false;
    } catch (error) {
        console.error('エラー:', error.message);
        alert(error.message);
    }
}

async function updatePolygon() {
    try {
        if (!currentEditingId) {
            throw new Error('編集中のポリゴンがありません。');
        }
        
        // 入力値の検証
        const coordinates = [];
        for (let i = 1; i <= 4; i++) {
            const latInput = document.querySelector(`.coordinate-lat[data-point="${i}"]`);
            const lngInput = document.querySelector(`.coordinate-lng[data-point="${i}"]`);
            
            if (!latInput || !lngInput) {
                throw new Error(`ポイント ${i} の入力フィールドが見つかりません。`);
            }
            
            const lat = Number(latInput.value);
            const lng = Number(lngInput.value);
            
            if (!latInput.value || !lngInput.value) {
                throw new Error(`ポイント ${i} の座標が入力されていません。`);
            }
            
            if (isNaN(lat) || isNaN(lng) || 
                lat < -90 || lat > 90 || 
                lng < -180 || lng > 180) {
                throw new Error(`ポイント ${i} の座標が無効です。緯度は -90 から 90、経度は -180 から 180 の間である必要があります。`);
            }
            
            coordinates.push({
                lat,
                lng,
                altitude: Number(document.getElementById('height-input').value) || 0
            });
        }
        
        const height = Number(document.getElementById('height-input').value);
        if (isNaN(height) || height < 0) {
            throw new Error('高さは0以上の数値を入力してください。');
        }

        // 透明度の取得と適用
        const fillOpacity = document.getElementById('fill-opacity').value / 100;
        const strokeOpacity = document.getElementById('stroke-opacity').value / 100;
        const fillColor = hexToRGBA(document.getElementById('fill-color').value, fillOpacity);
        const strokeColor = hexToRGBA(document.getElementById('stroke-color').value, strokeOpacity);
        
        // ポリゴンデータの作成
        const polygonData = {
            name: document.getElementById('polygon-name').value,
            coordinates: coordinates,
            height: height,
            fill_color: document.getElementById('fill-color').value,
            fill_opacity: Number(document.getElementById('fill-opacity').value) / 100,
            stroke_color: document.getElementById('stroke-color').value,
            stroke_opacity: Number(document.getElementById('stroke-opacity').value) / 100,
            stroke_width: Number(document.getElementById('stroke-width').value)
        };
        
        // 既存のポリゴンを削除
        const existingPolygon = map3DElement.querySelector(`gmp-polygon-3d[data-id="${currentEditingId}"]`);
        if (existingPolygon) {
            existingPolygon.remove();
        }

        // サーバーに更新リクエストを送信
        const response = await fetch(`/api/polygons/${currentEditingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(polygonData)
        });
        
        if (!response.ok) {
            throw new Error('ポリゴンの更新に失敗しました。');
        }
        
        // ローカルのポリゴンデータを更新
        const index = polygons.findIndex(p => p.id === currentEditingId);
        if (index !== -1) {
            polygons[index] = { ...polygonData, id: currentEditingId };
        }
        
        // 新しいポリゴンを作成して追加
        const { Polygon3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
        const newPolygon = new Polygon3DElement({
            altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: polygonData.stroke_width,
            extruded: true
        });
        newPolygon.setAttribute('data-id', currentEditingId);
        newPolygon.outerCoordinates = coordinates;
        map3DElement.append(newPolygon);
        
        // UIを更新
        updatePolygonTable();
        
        // 編集モードを終了
        cancelEdit();
        
        console.log('ポリゴンが正常に更新されました。');
        alert('ポリゴンを更新しました。');
        
    } catch (error) {
        console.error('エラー:', error.message);
        alert(error.message);
    }
}

function cancelEdit() {
    currentEditingId = null;
    const createPolygonBtn = document.getElementById('create-polygon');
    const updatePolygonBtn = document.getElementById('update-polygon');
    const cancelEditBtn = document.getElementById('cancel-edit');
    
    if (createPolygonBtn) createPolygonBtn.disabled = false;
    if (updatePolygonBtn) updatePolygonBtn.disabled = true;
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    
    // フォームをリセット
    document.querySelectorAll('.coordinate-lat, .coordinate-lng').forEach(input => {
        input.value = '';
    });
    document.getElementById('height-input').value = '300';
    document.getElementById('fill-color').value = '#ff0000';
    document.getElementById('stroke-color').value = '#0000ff';
    document.getElementById('stroke-width').value = '3';
    
    // 非表示のポリゴンを再表示
    const hiddenPolygon = map3DElement.querySelector('gmp-polygon-3d[style*="display: none"]');
    if (hiddenPolygon) {
        hiddenPolygon.style.display = '';
    }
document.getElementById('update-polygon').addEventListener('click', updatePolygon);
}

window.addEventListener('load', loadPolygons);
