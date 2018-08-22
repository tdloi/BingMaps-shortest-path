function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2-lat1);
  const dLon = deg2rad(lon2-lon1);
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) ** 2
    ;
  const c = Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return 2 * R * c;

  function deg2rad(deg) {
    return deg * (Math.PI/180)
  }
}

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
