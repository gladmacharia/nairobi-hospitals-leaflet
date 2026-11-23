
const map = L.map('map').setView([-1.29, 36.82], 12);
const DATA_URL = 'data/nairobi_health_facilities.geojson';


L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'

}).addTo(map);

L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

const LEVELS = {
    6: { label: 'Level 6 - Tertiary', color: '#bd0026' },
    5: { label: 'Level 5 - Secondary', color: '#f03b20' },
    4: { label: 'Level 4 - Primary hospital', color: '#fd8d3c' },
    3: { label: 'Level 3 - Health centre', color: '#fecc5c' },
};


function colorFor(feature) {
    return LEVELS[feature.properties.level].color;
}


function styleFor(feature) {
    return {
        radius: 3 + feature.properties.level * 1.5,
        fillColor: colorFor(feature),
        color: '#333333',
        weight: 1,
        fillOpacity: 0.85,
    };
}


function showDetails(feature) {
    const p = feature.properties;
    const lng = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];

    document.querySelector('#details').innerHTML = `
    <h2>${p.name}</h2>
    <p>${LEVELS[p.level].label}</p>
    <p>Ownership: ${p.owner}</p>
    <p>Area: ${p.area}</p>
    <p>Location (lat, lng): ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
  `;
}

function popupFor(feature) {
    const p = feature.properties;
    return `<strong>${p.name}</strong><br>${LEVELS[p.level].label}<br>Ownership: ${p.owner}<br>Area: ${p.area}`;
}

function renderList(features) {
    const list = document.querySelector('#facility-list');
    list.innerHTML = '';
    for (const feature of features) {
        const item = document.createElement('li');
        item.innerHTML = `
            <span class="badge" style="background-color: ${colorFor(feature)}">
            </span>
            <span class="facility-name">${feature.properties.name}</span>
            <span class="facility-level">L${feature.properties.level}</span>`;
        item.addEventListener('click', () => {
            showDetails(feature);
            const lng = feature.geometry.coordinates[0];
            const lat = feature.geometry.coordinates[1];
            map.flyTo([lat, lng], 15);
        });
        list.append(item);
    }
}



async function loadData() {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
        throw new Error(`Could not load ${DATA_URL} (HTTP ${response.status})`);
    }
    return response.json();
}


let allFeatures = [];
let facilities = null;

function applyFilter() {
    const value = document.querySelector('#level-filter').value;
    let visible = allFeatures;
    if (value !== 'all') {
        visible = allFeatures.filter((f) => f.properties.level === Number(value));
    }
    facilities.clearLayers();
    facilities.addData(visible);
    renderList(visible);
    document.querySelector('#status')
        .textContent = `Showing ${visible.length} of ${allFeatures.length} facilities`;
}


async function init() {
    const data = await loadData();
    allFeatures = data.features;
    console.log('Loaded', data.features.length, 'features');
    document.querySelector('#status').textContent = `${data.features.length} facilities`;

    facilities = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng,
            styleFor(feature)),
        onEachFeature: (feature, layer) => {
            layer.bindPopup(popupFor(feature));
            layer.on('click', () => showDetails(feature));
        },
    }).addTo(map);
    map.fitBounds(facilities.getBounds(), { padding: [30, 30] });
    renderList(data.features);

    document.querySelector('#level-filter').addEventListener('change', applyFilter);
}

init().catch((error) => {
    console.error(error);
    document.querySelector('#status').textContent = 'Could not load the data';
});