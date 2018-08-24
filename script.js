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
  return [{
    "lat": lat,
    "lon": lon,
  }];
}

(function addButtonProceedEventHandle() {
  let buttonProceed = document.getElementById('proceed-button');
  buttonProceed.addEventListener('click', addMarkerToMap);
})();

function addMarkerToMap() {
  let listCoordinates = document.getElementById('list-coordinates');
  listCoordinates.value = listCoordinates.value.replace(/\t/g, ' ');
  let uniqueCoordinateString = listCoordinates.value.split('\n').reduce(
    (accur, curr) => accur.concat(splitPairCoordinate(curr)),
    []
  ).filter(
    (curr, index, self) => self.indexOf(curr) === index
  );
  let listMarker = uniqueCoordinateString.reduce(
    (acc, curr) => acc.concat(convertStringCoordinateToObject(curr)),
    []
  ).filter(
    coordinate => coordinate.lat !== 'undefined' && coordinate.lon !== 'undefined'
  );

  markerGroup.clearLayers();
  for (let coordinate of listMarker) {
    L.marker([coordinate.lat, coordinate.lon]).addTo(markerGroup);
  }
  markerGroup.addTo(map);
  map.panTo(new L.LatLng(listMarker[0].lat, listMarker[0].lon));
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
