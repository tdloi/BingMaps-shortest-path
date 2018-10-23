"use strict";

const main = document.querySelector('.main');
const selection = document.querySelector('.selection');
const selectionList = document.querySelector('.selection__list');
const loading = document.querySelector('.loading');

let shortestPathGroup = new L.featureGroup();
let listSelection = [];


function random(min, max) {
  return (Math.random()*(max-min) + min).toFixed(2);
}


function convertDataToCoordinate(raw) {
  // Each string includes: Coordinate name, Elevation, Latitude, Lontitude
  // seperated by a space, so to avoid space in name, we need get
  // lat and lon first then get elevation, if elevation is not available
  // it will be load from api later
  raw = raw.split(' ');
  let [lat, lon] = raw.splice(-2, 2);
  return new Coordinate(undefined, raw.join(' '), 0, lat, lon);
}


function processData() {
  const radius = function() {
    let r = document.querySelector('.coordinates__radius');
    if (r.value === "") {
      r.value = random(10, 100);
    }
    return +r.value;
  }();

  C.list = {}; // Clear list coordinate
  // Clear list of selection and all of highlighted items
  listSelection = [];
  document.querySelectorAll('.selection__items--selected').forEach((target) => {
    target.classList.remove('selection__items--selected');
  });
  selectionList.innerHTML = "";


  let listCoordinates = document.querySelector('.coordinates__list').value
                          .replace(/\t/g, ' ')
                          .split('\n').filter( value => value !== "" );
  let listMarker = [];

  document.querySelector('.loading__total').innerText = listCoordinates.length;

  // if this value is 0, elevation will not be load from Elevation Public API
  let ElevationFilterValue = document.querySelector('.coordinates__elevation').valueAsNumber || 0;

  // Keep track of current loaded coordinates
  // do not use coordinate label since there is duplicate coordinate
  // results in number of loaded coordinate may be not equal to total coordinate
  // need to be loaded
  let currentLoading = document.querySelector('.loading__current');
  currentLoading.innerText = ""; // Reset value from previous load

  for (let rawCoordinate of listCoordinates) {
    let c = convertDataToCoordinate(rawCoordinate);
    let index = listMarker.length === 0 ? 0 : listMarker[listMarker.length - 1];
    c.label = index + 1;
    currentLoading.innerText = +currentLoading.innerText + 1;

    if (c.isValid()) {
      if (ElevationFilterValue > 0) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', `https://api.open-elevation.com/api/v1/lookup?locations=${c.lat},${c.lon}`, false);
        xhr.onload = function() {
          if (this.readyState === 4 && this.status === 200) {
            c.ele = JSON.parse(this.responseText).results[0].elevation;
          }
        };
        xhr.send();
      }

      if (c.ele !== undefined && c.ele >= ElevationFilterValue) {
        if (C.isExisted(c)) c.label = +C.findCoordinate(c);
        if (listMarker.includes(c.label) === false) {
          listMarker.push(c.label);
        }
        selectionList.innerHTML += `
          <p class="selection__items" data-src="${c.label}">${c.name}</p>
        `;
        C.addCoordinate(c);
      }
    }
  }


  let _markers = [...listMarker];
  // Nested lopp through all coordinate in list, then check distant
  // between two coordinate if their distant smaller than radius,
  // they will be treated as adjency vertice
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

  // Draw polyline between each marker of map
  for (let marker of listMarker) {
    if (marker !== undefined) {
      drawPolyline( marker,
                    Object.keys(C.list[marker].neighbors) );
    }
  }

  shortestPathGroup.addTo(map);
}


function drawShortestPath(c1, c2) {
  // Draw a polyline demonstrate shortest path
  // between coordinate c1 and c2

  let _map = {}; // Default input of Graph object
                 // a list of object with key is coordinate label and
                 // value is an object contains adjacent vertice
                 // { "1" : { "2", "3", "4" } }
  for (let marker of Object.keys(C.list)
                      .map(key => parseInt(key, 10))) {
    _map[marker] = C.list[marker].neighbors;
  }

  let g = new Graph(_map);
  let path = g.findShortestPath(c1, c2);
  shortestPathGroup.clearLayers();

  if (path === null) {
    document.querySelector('.selection__error').innerHTML = `
      No shortest path found
    `;
    return;
  } else {
    document.querySelector('.selection__error').innerHTML = "";
  }
  for (let marker of path) {
    let index = path.indexOf(marker);
    if (index === path.length - 1) return;
    drawPolyline(
      marker,
      [path[index + 1]],
      'red',
      shortestPathGroup
    );
  }
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

function drawPolyline(marker, neighbors, color='blue', group=markerGroup) {
  // draw polyline between a marker and all of its neightbors
  // neightbors contains list of coordinates label in C
  let latlngs = neighbors.map(
    neighborMarker => [
      [C.list[marker].lat, C.list[marker].lon],
      [C.list[neighborMarker].lat, C.list[neighborMarker].lon]
    ]
  );

  L.polyline(latlngs, {color: color}).addTo(group);
}


function panToMarker(lat, lon) {
  map.panTo(new L.LatLng(lat, lon));
}


function openPopup(label) {
  // Bind and open popup of a marker in map
  // Currently there are no way to open a binded popup
  // so we need to re-bind it then use openPopup method
  let marker = C.list[label];
  L.marker([marker.lat, marker.lon]).addTo(markerGroup)
    .bindPopup(`<strong>${marker.name}</strong><br>
                Elevation: ${marker.ele} m <br>
                ${marker.lat}, ${marker.lon}`)
    .openPopup();
}


(function readFileInput(){
  let file = document.getElementById('csv-file');
  file.onchange = function() {
    const selectedFile = file.files[0];
    const reader = new FileReader();

    reader.onload = function(fi) {
      let listCoordinates = document.querySelector('.coordinates__list');
      // Each column from csv file is seperated by comma
      // We need to replace it with space so that we can filter it later
      listCoordinates.value = fi.target.result.replace(/,/g, ' ');
    };

    reader.readAsText(selectedFile);
  };
})();

function clearInput() {
  document.querySelectorAll('input').forEach(
    node => node.value = ""
  );
  document.querySelectorAll('.error').forEach(
    node => node.innerText = ""
  );
  document.querySelector('.coordinates__list').value = "";
}

function convertTime(totalSecond) {
  // Convert second to hour, minus, second
  let hour = parseInt(totalSecond / 3600);
  totalSecond = totalSecond - hour*3600;
  let minus = parseInt(totalSecond/60);
  let second = totalSecond - minus*60;

  return [hour, minus, second];
}


function getTotalTime(secondPerCoordinate) {
  let listCoordinates = document.querySelector('.coordinates__list').value
                            .split('\n').filter( value => value !== "" );
  let totalTime = listCoordinates.length * secondPerCoordinate;
  return convertTime(totalTime);
}


main.addEventListener('click', function(event) {
  let target = event.target;
  if (target.classList.contains('main__button__clear')) {
    clearInput();
  } else if (target.classList.contains('main__button__proceed')) {
    // Validate input using HTML5 Constraint validation API
    const radius = document.querySelector('.coordinates__radius');
    const elevation = document.querySelector('.coordinates__elevation');
    const list = document.querySelector('.coordinates__list');
    if (radius.validity.valid === false ||
        list.validity.valid === false ||
        elevation.validity === false) {
        document.querySelector('.coordinates__radius__error').innerText = radius.validationMessage;
        document.querySelector('.coordinates__elevation__error').innerText = elevation.validationMessage;
        document.querySelector('.coordinates__list__error').innerText = list.validationMessage;
    } else {
      let ElevationFilterValue = document.querySelector('.coordinates__elevation').valueAsNumber || 0;
      let [hour, minus, second] = getTotalTime(25);
      let time = `${hour}h ${minus}m ${second}s`;
      if (ElevationFilterValue > 0 &&
          !window.confirm("Elevation will be loaded from Open Elevation API\n"+
                           "It will take time on the first time.\n" +
                           "Estimated time: " +  time + "\n" +
                           "Do you want to continue?")) {
          return;
      }
      loading.hidden = false;
      main.hidden = true;
      processData();
      loading.hidden = true;
      selection.hidden = false;
    }
  }
});

selection.addEventListener('click', function button(event) {
  let target = event.target;
  if (target.classList.contains('main__button__back')) {
    selection.hidden = true;
    main.hidden = false;
    shortestPathGroup.clearLayers();
  } else if (target.classList.contains('main__button__new')) {
    selection.hidden = true;
    main.hidden = false;
    clearInput();
    markerGroup.clearLayers();
    shortestPathGroup.clearLayers();
  }
});

selection.addEventListener('click', function select(e) {
  let label = e.target.dataset.src;
  if (!label) return;

  openPopup(label);
  let lat = C.list[label].lat,
      lon = C.list[label].lon;

  if (e.target.classList.contains('selection__items--selected')) {
    panToMarker(lat, lon);
  } else if (e.target.classList.contains('selection__items')) {
    e.target.classList.add('selection__items--selected');
    listSelection.push(label);

    if (listSelection.length === 3) {
      let popLabel = listSelection.shift();
      document.querySelectorAll('.selection__items--selected').forEach((target) => {
        if (target.dataset.src === popLabel) {
          target.classList.remove('selection__items--selected');
        }
      });
    }
    if (listSelection.length === 2) {
      let [c1, c2] = listSelection;
      drawShortestPath(c1, c2);
    }
    panToMarker(lat, lon);
  }
});
