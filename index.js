// import '@geoman-io/leaflet-geoman-free';
// import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
// import 'leaflet';

const map = L.map('map').setView([51.505, -0.09], 13);
const propertiesBox = document.getElementById('properties');
const mapBox = document.getElementById('map');
const cbox = document.querySelectorAll('.show');
const saveButton = document.getElementById('save-changes');
const savePropsButton = document.getElementById('save-props');
const postButton = document.getElementById('send-post');
const fetchPostGISButton = document.getElementById('fetch-button');
const fetchPostGISTableInput = document.querySelector(
  'input[name="fetch-table-name"]'
);
const fetchPostGISTableColor = document.querySelector(
  'input[name="fetch-table-color"]'
);
const drawLayerSelect = document.getElementById('draw-layer-selector');

const layersDrawSwitchBlock = document.getElementById('layers-draw-switch');
// const resizeModeToggler = document.getElementById('resize-toggler');
// const rotateModeToggler = document.getElementById('rotate-toggler');

saveButton.addEventListener('click', function (e) {
  isEditingFlag = false;
  saveProperties();
  map.pm.disableGlobalEditMode();
  console.log('disabling');
});

let currentEditingProps = {};

let isEditingFlag = false;
let isDrawingFlag = false;
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 18,
  // id: 'mapbox/streets-v11',
  tileSize: 512,
  zoomOffset: -1
}).addTo(map);

// function hideLayer(layerName) {
//   map.removeLayer(layers[layerName]);
// }

cbox.forEach((chb) => {
  chb.addEventListener('click', function (e) {
    hideLayer(e.target.value);
  });
});
map.pm.addControls({
  position: 'topleft',
  editMode: false,
  cutPolygon: false
});

const lygon = L.polygon([
  [51.509, -0.08],
  [51.503, -0.06],
  [51.51, -0.047]
]);

const fgroup = L.featureGroup([]).addTo(map);
const fgroup2 = L.featureGroup([]).addTo(map);

const layers = { layer1: fgroup, layer2: fgroup2 };

const controlPanel = L.control.layers(null, layers).addTo(map);

const mapChanges = {};

map.on('pm:create', (e) => {
  addEditEventListener(e.layer);
});

map.on('pm:drawstart', (e) => {
  console.log(drawLayerSelect.value);
  map.pm.setGlobalOptions({
    layerGroup: layers[drawLayerSelect.value]
  });
});

map.on('click', (e) => {
  console.log(map.mouseEventToLatLng(e.originalEvent));
  showWeatherPopup(map.mouseEventToLatLng(e.originalEvent));
});

map.on('pm:drawstart', (e) => {
  isDrawingFlag = true;
});
map.on('pm:drawend', (e) => {
  isDrawingFlag = false;
});

async function showWeatherPopup({ lat, lng }) {
  if (!isEditingFlag && !isDrawingFlag) {
    const weatherMapResponse = await getWeatherByLocation(lat, lng);
    const weatherMapData = await weatherMapResponse.json();
    const { temperature, coordinates, weather, place, countryCode } =
      weatherWrapper(weatherMapData);
    // console.log(wrappedWeatherData);
    L.popup({ closeOnClick: true })
      .setLatLng(L.latLng(lat, lng))
      .setContent(
        `<p>${temperature}°C<br/>${coordinates.lon.toFixed(
          2
        )}, ${coordinates.lat.toFixed(2)}<br/>${weather}${
          place ? `<br/>${place}` : ''
        }${countryCode ? `<br/>${countryCode}` : ''}</p>`
      )
      .openOn(map);
  }
}

function weatherWrapper(weatherMapData) {
  console.log(weatherMapData);
  return {
    coordinates: weatherMapData.coord,
    temperature: weatherMapData.main.temp,
    weather: weatherMapData.weather[0].main,
    place: weatherMapData.name || '',
    countryCode: weatherMapData.sys.country || ''
  };
}

function getWeatherByLocation(lat, lng) {
  return fetch(
    ` http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=cd5ba4ed3bdc89add1f0f468d2e34719&units=metric`
  );
}

function addObjectToEditList(gid, tableName) {
  // console.log(gid);
  // console.log(tableName);
  if (!mapChanges.hasOwnProperty(tableName)) {
    mapChanges[tableName] = [gid];
  } else {
    mapChanges[tableName].push(gid);
  }
  console.log(mapChanges);
}

savePropsButton.addEventListener('click', (e) => saveProperties());

function generatePropertyFields(properties) {
  // console.log(properties === layer.feature.properties);
  mapBox.classList.add('properties-on');
  propertiesBox.classList.remove('properties-off');
  propertiesBox.classList.add('properties-on');
  propertiesBox.innerHTML = '';
  // console.log(properties);
  currentEditingProps = properties;
  for (let key in properties) {
    propertiesBox.innerHTML += `<p>${key}:</p><input type="text" class="property-field" name="${key}" ${
      key.includes('id') ? 'readonly' : ''
    } value="${properties[key]}">`;
  }
}

function saveProperties() {
  mapBox.classList.remove('properties-on');
  propertiesBox.classList.add('properties-off');
  propertiesBox.classList.remove('properties-on');
  for (let key in currentEditingProps) {
    currentEditingProps[key] = document.querySelector(
      `input[name="${key}"]`
    ).value;
  }
}

function addEditEventListener(layer, feature, tableName) {
  layer.addEventListener('click', function (e) {
    generatePropertyFields(feature.properties);
    isEditingFlag = true;
    const editingModeToggler = document.querySelector(
      'input[name="editing-mode"]:checked'
    );
    // console.log(feature.properties);
    addObjectToEditList(feature.properties.gid, tableName);
    if (editingModeToggler.value === 'resize') {
      console.log('resize');
      layer.pm.enable({
        allowSelfIntersection: false
      });
    } else if (editingModeToggler.value === 'rotate') {
      console.log('rotate');
      layer.pm.enableRotate();
    }
  });
}

fetchPostGISButton.addEventListener('click', function (e) {
  console.log('fetch started');
  // console.log(fetchPostGISTableColor.value);
  const tableName = fetchPostGISTableInput.value;
  const tableColor = fetchPostGISTableColor.value;
  const newLayerStyles = { color: tableColor };
  fetchPostGIS(tableName, newLayerStyles);
});

function addLayerToSelect(layerName) {
  const switchNodeCode = `<option value=${layerName}>${layerName}</option>`;
  // const labelContainer = document.createElement('label');
  // const lineBreak = document.createElement('br');
  drawLayerSelect.innerHTML += switchNodeCode;
  // layersDrawSwitchBlock.appendChild(labelContainer);
  // layersDrawSwitchBlock.appendChild(lineBreak);
}

postButton.addEventListener('click', sendUpdate);

function handleUpdatedFeatures() {
  const geoJSONs = {};
  for (let key in mapChanges) {
    geoJSONs[key] = {};
    const layerGeoJSON = layers[key].toGeoJSON();
    mapChanges[key].forEach((id) => {
      geoJSONs[key][id] = layerGeoJSON.features.find(
        (e) => e.properties.gid == id
      );
    });
  }
  console.log(geoJSONs);
  return geoJSONs;
}

function sendUpdate() {
  layerData = layers['rivers'];
  // console.log(layerData);
  // console.log(layerData.getLayer(89).getLayer(99));
  // const gj = layerData.toGeoJSON();
  // console.log(gj);
  const str = JSON.stringify(handleUpdatedFeatures());
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: str
    // body: { layer: 'aloga' }
  };
  fetch('http://localhost:4000/', requestOptions);
  // .then((response) => response.json())
  // .then((data) => console.log(data));
}
// sendUpdate();

function fetchPostGIS(tableName, styles) {
  fetch(`http://localhost:4000/${tableName}`).then((response) => {
    // console.log(response);
    response.json().then((text) => {
      const newLayer = L.featureGroup([]);
      const geoTest = L.geoJSON(text.slice(), {
        onEachFeature: (feature, layer) =>
          addEditEventListener(layer, feature, tableName),
        style: styles || {}
      }).addTo(newLayer);
      layers[tableName] = newLayer;
      newLayer.addTo(map);
      controlPanel.addOverlay(newLayer, tableName);
      addLayerToSelect(tableName);
    });
  });
}
// fetchPostGIS('GBR_water_lines_dcw');
// fetchPostGIS('rivers');
// https://wiki.openstreetmap.org/wiki/Tiles
