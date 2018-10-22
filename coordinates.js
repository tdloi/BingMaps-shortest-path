class Coordinates {
  constructor(list = {}) {
    this.list = list;
  }

  addCoordinate(c) {
    if (this.list[c.label] === undefined) {
      if (c.name === undefined) c.name = c.label;
      this.list[c.label] = {
        "label": c.label,
        "name": c.name,
        "ele": c.ele,
        "lat": c.lat,
        "lon": c.lon,
        "neighbors": {},
      };
    }
  }

  addNeighbor(c1, c2) {
    let listNeighbors = Object.keys(this.list[c1.label].neighbors);
    if (listNeighbors.includes(c2.label) === false) {
      let distance = HaversineFormula(c1, c2);
      this.list[c1.label].neighbors[c2.label] = distance;
      this.list[c2.label].neighbors[c1.label] = distance;
    }
  }

  isExisted(c) {
    let listCoordinates = Object.keys(this.list);
    for (let coordinate of listCoordinates) {
      if (this.list[coordinate].lat === c.lat &&
          this.list[coordinate].lon === c.lon) {
        return true;
      }
    }
    return false;
  }

  findCoordinate(c) {
    let listCoordinates = Object.keys(this.list);
    for (let coordinate of listCoordinates) {
      if (this.list[coordinate].lat === c.lat &&
          this.list[coordinate].lon === c.lon) {
        return coordinate;
      }
    }
  }

}

class Coordinate {
  constructor(label, name, ele, lat, lon) {
    this.label = label;
    this.name = name;
    this.ele = ele;
    this.lat = lat;
    this.lon = lon;
  }

  isValid() {
    if (typeof(+this.lat) !== "number" || typeof(+this.lon) !== "number") return false;
    if (this.lat <= 0  || this.lat > 90) return false;
    if (this.lon <= 90 || this.lon > 180) return false;

    return true;
  }
}

function HaversineFormula(c1, c2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(c2.lat - c1.lat);
  const dLon = deg2rad(c2.lon - c1.lon);
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(deg2rad(c1.lat)) * Math.cos(deg2rad(c2.lat)) *
    Math.sin(dLon/2) ** 2
    ;
  const c = Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return 2 * R * c;

  function deg2rad(deg) {
    return deg * (Math.PI/180);
  }
}
