function splitPairCoordinate(pairCoordinate) {
  let listCoordinates = pairCoordinate.split(' ');
  listCoordinates = listCoordinates.filter(value => value !== "");
  return [
    `${listCoordinates[0]} ${listCoordinates[1]}`,
    `${listCoordinates[2]} ${listCoordinates[3]}`
  ];
}

function convertStringCoordinateToObject(stringCoordinate) {
  let [lat, lon] = stringCoordinate.split(' ');
  return {
    "lat": Number(lat),
    "lon": Number(lon),
  };
}

(function addButtonProceedEventHandle() {
  let buttonProceed = document.getElementById('proceed-button');
  buttonProceed.addEventListener('click', processData);
})();

function processData() {
  let listCoordinates = document.getElementById('list-coordinates');
  listCoordinates.value = listCoordinates.value.replace(/\t/g, ' ');
  listCoordinates = listCoordinates.value.split('\n').filter(
    value => value !== ""
  );

  let listMarker = [];
  for (let pairCoordinate of listCoordinates) {
    let [c1, c2] = splitPairCoordinate(pairCoordinate);
    let index = listMarker.length === 0 ? 0 : listMarker[listMarker.length - 1];
    c1 = convertStringCoordinateToObject(c1);
    c1 = new Coordinate(index + 1, c1.lat, c1.lon);
    c2 = convertStringCoordinateToObject(c2);
    c2 = new Coordinate(index + 2, c2.lat, c2.lon);

    if (c1.isValid() && c2.isValid() ){
      if (C.isExisted(c1)) { c1.label = +C.findCoordinate(c1); } // force label to number
      if (C.isExisted(c2)) { c2.label = +C.findCoordinate(c2); }

      if (listMarker.includes(c1.label) === false) { listMarker.push(c1.label); }
      if (listMarker.includes(c2.label) === false) { listMarker.push(c2.label); }

      C.addCoordinates(c1, c2);
    }
  }
  addMarkerToMap(listMarker);
  drawPolyline();
}

function addMarkerToMap(listMarker) {
  markerGroup.clearLayers();
  let marker = C.list;
  for (let c of listMarker) {
    L.marker([marker[c].lat, marker[c].lon]).addTo(markerGroup)
      .bindPopup(`${marker[c].lat}, ${marker[c].lon}`);
  }
  markerGroup.addTo(map);
  map.panTo(new L.LatLng(marker[listMarker[0]].lat, marker[listMarker[0]].lon));
}

function drawPolyline() {
  let drewCoordinates = [];
  let listMarker = Object.keys(C.list);
  let Marker = C.list;
  for (let c of listMarker) {
    let neighbors = Object.keys(Marker[c].neighbors);
    neighbors = neighbors.filter(n => drewCoordinates.includes(n) === false);
    let latlngs = neighbors.map(
      coordinate => [
        [Marker[c].lat, Marker[c].lon],
        [Marker[coordinate].lat, Marker[coordinate].lon]
      ]
    );
    L.polyline(latlngs, {colors: 'blue'}).addTo(markerGroup);
  }
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
