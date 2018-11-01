export const Marker = {
  /**
   * Add a marker to FeatureGroup then add it to map
   * @param {Coordinate} marker An instance of Coordinate class
   * @param {FeatureGroup} group featureGroup which marker belongs to
   */
  addToMap: function(marker, group) {
    L.marker([marker.lat, marker.lon]).addTo(group)
      .bindPopup(`<strong>${marker.name}</strong><br>
                  Elevation: ${marker.ele} m <br>
                  ${marker.lat}, ${marker.lon}`);
    group.addTo(map);
  },

  /**
   * Bind and open popup of a marker in map.
   * @param {Coordinate} marker An instance of Coordinate class
   * @param {FeatureGroup} group featureGroup which marker belongs to
   */
  openPopup: function (marker, group) {
    // Currently there are no way to open a binded popup
    // so we need to re-bind it then use openPopup method
    L.marker([marker.lat, marker.lon]).addTo(group)
      .bindPopup(`<strong>${marker.name}</strong><br>
                  Elevation: ${marker.ele} m <br>
                  ${marker.lat}, ${marker.lon}`)
      .openPopup();
  },

  panTo: function (marker) {
    map.panTo(new L.LatLng(marker.lat, marker.lon));
  },
};
