export const Marker = {
  // Add a marker to FeatureGroup then add it to map
  addToMap: function(marker, group, iconPath='') {
    let popup = `<strong>${marker.name}</strong><br>
                 Lat: ${marker.lat}<br>
                 Lon: ${marker.lon}`;
    if (marker.ele !== null) {
      popup += `<br>Elevation: ${marker.ele} m`;
    }

    L.marker([marker.lat, marker.lon]).addTo(group)
      .bindPopup(popup);
    if (iconPath !== '') {
      if (iconPath === 'red') iconPath = "img/marker-red.png";
      // Change iconUrl will result in relative path of Leaflet unpkg path
      // Leaflet icon is joined imagePath and iconUrl, this is
      // workaround by removed iconUrl (default to marker-icon.png) then
      // set icon imagePath directly
      L.Icon.Default.prototype.options.iconUrl = "";
      L.Icon.Default.imagePath = iconPath;
    }


    group.addTo(map);
  },

  // Bind and open popup of a marker in map.
  openPopup: function(marker, group) {
    // Currently there are no way to open a binded popup
    // so we need to re-bind it then use openPopup method
    let popup = `<strong>${marker.name}</strong><br>
                 Lat: ${marker.lat}<br>
                 Lon: ${marker.lon}`;
    if (marker.ele !== null) {
      popup += `<br>Elevation: ${marker.ele} m`;
    }

    L.marker([marker.lat, marker.lon]).addTo(group)
      .bindPopup(popup)
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
