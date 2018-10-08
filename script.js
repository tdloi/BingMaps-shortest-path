function getRadius() {
  let r = document.querySelector('.coordinate__radius');
  if (r.value === "") {
    return Math.random()*90 + 10;
  }
  return +r.value;
}

function convertDataToCoordinate(raw) {
  // Each string includes: Coordinate name, Latitude, Lontitude
  // seperated by a space, so to avoid space in name, we need get
  // lat and lon first
  raw = raw.split(' ');
  let [lat, lon] = raw.splice(-2, 2);
  return new Coordinate(undefined, raw.join(' '), lat, lon);
}

(function addButtonProceedEventHandle() {
  let buttonProceed = document.getElementById('proceed-button');
  buttonProceed.addEventListener('click', processData);
})();


function processData() {
  const radius = getRadius();
  document.querySelector('.coordinate__radius').value = radius;
  C.list = {}; // Clear list coordinate
  let listCoordinates = document.getElementById('list-coordinates').value
                          .replace(/\t/g, ' ')
                          .split('\n').filter( value => value !== "" );
  let listMarker = [];

  for (let rawCoordinate of listCoordinates) {
    let c = convertDataToCoordinate(rawCoordinate);
    let index = listMarker.length === 0 ? 0 : listMarker[listMarker.length - 1];
    c.label = index + 1;
    if (c.isValid()) {
      if (C.isExisted(c)) c.label = +C.findCoordinate(c);
      if (listMarker.includes(c.label) === false) {
        listMarker.push(c.label);
      }
      C.addCoordinate(c);
    }
  }

  let _markers = [...listMarker];
  while(_markers.length > 0) {
    let c = _markers.pop();
    for (let coordinate of _markers) {
      let c1 = C.list[c];
      let c2 = C.list[coordinate];
      if ( HaversineFormula(c1, c2) <= radius )
        C.addNeighbor(c1, c2);
    }
  }

  markerGroup.clearLayers();
  addMarkerToMap(listMarker);
  drawPolyline(listMarker);

  // Find shortest path
  let _map = {};
  for (let marker of Object.keys(C.list).map(key => parseInt(key, 10))) {
    _map[marker] = C.list[marker].neighbors;
  }
  let g = new Graph(_map);
  drawPolyline(
    g.findShortestPath(listMarker[0], listMarker[listMarker.length - 1])
      .map(value => parseInt(value)),
    'red',
    false
  );
}

function addMarkerToMap(listMarker) {
  let marker = C.list;
  for (let c of listMarker) {
    L.marker([marker[c].lat, marker[c].lon]).addTo(markerGroup)
      .bindPopup(`<strong>${marker[c].name}</strong><br>
                  ${marker[c].lat}, ${marker[c].lon}`);
  }
  markerGroup.addTo(map);
  panToMarker(marker[listMarker[0]].lat, marker[listMarker[0]].lon);
}

function drawPolyline(listMarker, color = 'blue', drawAll = true) {
  let drewCoordinates = [];
  let Marker = C.list;
  for (let currentMarker of listMarker) {
    let neighbors;
    if (drawAll) {
      neighbors = Object.keys(Marker[currentMarker].neighbors)
                    .filter(n => drewCoordinates.includes(n) === false);
    } else {
      neighbors = [];
      let index = listMarker.indexOf(currentMarker);
      if (index !== listMarker.length - 1) {
        neighbors.push(listMarker[index + 1]);
      }
    }

    let latlngs = neighbors.map(
      neighborMarker => [
        [Marker[currentMarker].lat, Marker[currentMarker].lon],
        [Marker[neighborMarker].lat, Marker[neighborMarker].lon]
      ]
    );

    L.polyline(latlngs, {color: color}).addTo(markerGroup);
  }
}

function panToMarker(lat, lon) {
  map.panTo(new L.LatLng(lat, lon));
}

(function readFileInput(){
  let file = document.getElementById('file');
  file.onchange = function() {
    const selectedFile = file.files[0];
    const reader = new FileReader();

    reader.onload = function(fi) {
      let listCoordinates = document.getElementById('list-coordinates');
      // Each column from csv file is seperated by comma
      // We need to replace it with space so that we can filter it later
      listCoordinates.value = fi.target.result.replace(/,/g, ' ');
    };

    reader.readAsText(selectedFile);
  };
})();
