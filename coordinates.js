class Coordinates {
  constructor(list = {}) {
    this.list = list;
  }

  addPairCoordinate(c1, c2) {
    if (this.list[c1.label] === undefined) {
      this.list[c1.label] = {
        "lat": c1.lat,
        "lon": c1.lon,
        "neighbor": [],
      };
    }
    if (this.list[c2.label] === undefined) {
      this.list[c2.label] = {
        "lat": c2.lat,
        "lon": c2.lon,
        "neighbor": [],
      };
    }
    if (this.list[c1.label].neighbor.includes(c2.label) === false) {
      this.list[c1.label].neighbor.push(c2.label);
      this.list[c2.label].neighbor.push(c1.label);
    }
  }

  static distance(c1, c2) {
    return HaversineFormula(c1.lat, c1.lon, c2.lat, c2.lon);
  }

}

class Coordinate {
  contructor(label, lat, lon) {
    this.label = label;
    this.lat = lat;
    this.lon = lon;
  }
}

function HaversineFormula(lat1, lon1, lat2, lon2) {
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
    return deg * (Math.PI/180);
  }
}
