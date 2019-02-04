export const Marker = {
  // Add a marker to FeatureGroup then add it to map
  addToMap: function(marker, group) {
    L.marker([marker.lat, marker.lon]).addTo(group)
      .bindPopup(`<strong>${marker.name}</strong><br>
                  Lat: ${marker.lat}<br>
                  Lon: ${marker.lon}`);

    group.addTo(map);
  },

  // Bind and open popup of a marker in map.
  openPopup: function(marker, group) {
    // Currently I don't know how to open a binded popup
    // so I need to re-bind it then use openPopup method
    L.marker([marker.lat, marker.lon]).addTo(group)
      .bindPopup(`<strong>${marker.name}</strong><br>
                  Lat: ${marker.lat}<br>
                  Lon: ${marker.lon}`)
      .openPopup();
  },

  panTo: function(marker) {
    map.panTo(new L.LatLng(marker.lat, marker.lon));
  },

  drawPolyline: function(latlongs, color='#0e6dd7', group) {
    // Draw polyline from array of latlongs
    // latlongs can be either one or multi-dimensions
    // [ [x1, y1],
    //   [x2, y2], ]
    // or
    // [
    //   [[x1, y1],
    //    [x2, y2], ],
    //   [[a1, b1],
    //    [a2, b2], ],
    // ]
    L.polyline(latlongs, {color: color}).addTo(group);
  },
};
