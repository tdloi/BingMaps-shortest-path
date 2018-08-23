function unpackCoordinates(rawValues) {
  let listCoordinates = rawValues.split(' ');
  listCoordinates = listCoordinates.filter(value => value !== "");
  return [{
    "lat": listCoordinates[0],
    "lon": listCoordinates[1]
  }, {
    "lat": listCoordinates[2],
    "lon": listCoordinates[3]
  }];
}

(function addButtonProceedEventHandle() {
  let buttonProceed = document.getElementById('proceed-button');
  buttonProceed.addEventListener('click', addMarkerToMap);
})();

function addMarkerToMap() {
  let listCoordinates = document.getElementById('list-coordinates');
  listCoordinates.value = listCoordinates.value.replace(/\t/g, ' ');
  let listMarker = listCoordinates.value.split('\n').reduce(
    (accur, curr) => accur.concat(unpackCoordinates(curr)),
    []
  ).filter(coordinate =>
      coordinate.lat !== undefined && coordinate.lon !== undefined
  );

  for (let coordinate of listMarker) {
    L.marker([coordinate.lat, coordinate.lon]).addTo(map);
  }
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
