import { Coordinate, Coordinates, HaversineFormula } from './coordinates.js';
import { Graph } from './graph.js';
import { Marker } from './marker.js';

"use strict";

let C = new Coordinates();

const COORDINATE = {
  elevation: document.querySelector('.coordinates__elevation'),
  elevationNullAction: document.querySelector('.coordinates__elevation__action'),

  list: document.querySelector('.coordinates__list'),

  main: document.querySelector('.main'),
  loading:  document.querySelector('.loading'),

  selection: document.querySelector('.selection'),
  selectionList: document.querySelector('.selection__list'),
};

const button = {
  proceed: document.querySelector('.main__button__proceed'),
  clear: document.querySelector('.main__button__clear'),
  back: document.querySelector('.main__button__back'),
  new: document.querySelector('.main__button__new'),
  cancel: document.querySelector('.main__button__cancel'),
  eleSelection: document.querySelector('.elevation-action'),
  export: document.querySelector('.export-csv'),
};


let shortestPathGroup = new L.featureGroup();
let markerGroup = new L.featureGroup();

let listSelection = [];


function random(min, max) {
  return (Math.random()*(max-min) + min).toFixed(2);
}


function convertRawStringToCoordinate(raw) {
  // Each string includes: Coordinate name, Elevation, Latitude, Lontitude
  // seperated by a space, so to avoid space in name, we need get
  // lat and lon first then get elevation
  raw = raw.split(' ');
  let [lat, lon] = raw.splice(-2, 2);
  // Check if elevation is missing, then check if its value is a number
  // if not, assume it is a part of coordinate name
  let ele = -Infinity;
  if (raw.length > 2 &&
      typeof +raw[raw.length + 1] === 'number') {
    ele = raw.pop();
  }
  return [raw.join(' '), ele, lat, lon];
}


function processData() {
  const radius = function() {
    let r = document.querySelector('.coordinates__radius');
    if (r.value === "") {
      r.value = random(10, 100);
    }
    return +r.value;
  }();

  // clear data before process
  C.list = {};
  COORDINATE.selectionList.innerHTML = "";
  markerGroup.clearLayers();


  let listCoordinates = COORDINATE.list.value
                          .replace(/\t/g, ' ')
                          .split('\n').filter( value => value !== "" );
  let listMarker = [];

  document.querySelector('.loading__total').innerText = listCoordinates.length;


  let ElevationFilterValue = COORDINATE.elevation.valueAsNumber || -Infinity;

  // Keep track of current loaded coordinates
  // do not use coordinate label since there is duplicate coordinate
  // results in number of loaded coordinate may be not equal to total coordinate
  // need to be loaded
  let currentLoading = document.querySelector('.loading__current');
  currentLoading.innerText = ""; // Reset value from previous load

  for (let rawString of listCoordinates) {
    let c = new Coordinate( ...convertRawStringToCoordinate(rawString) );

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
        COORDINATE.selectionList.innerHTML += `
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

  for (let marker of listMarker) {
    Marker.addToMap(C.list[marker], markerGroup);
    Marker.panTo(C.list[marker]);
  }

  // update list input so that we can export it later
  if (Object.keys(C.list).length > 0) {
    let _outputString = "\n";
    for ( let m of Object.keys(C.list) ) {
      m = C.list[m];
      let ele = m.ele === -Infinity ? "" : m.ele;
      m = [m.name, ele, m.lat, m.lon];

      _outputString += m.join(' ');
      _outputString += '\n';
    }
    COORDINATE.list.value = _outputString;
  }

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



function drawPolyline(marker, neighbors, color='#0e6dd7', group=markerGroup) {
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


(function readFileInput(){
  let file = document.getElementById('csv-file');
  file.onchange = function() {
    const selectedFile = file.files[0];
    const reader = new FileReader();

    reader.onload = function(fi) {
      // Each column from csv file is seperated by comma
      // We need to replace it with space so that we can filter it later
      COORDINATE.list.value = fi.target.result.replace(/,/g, ' ');
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
  COORDINATE.list.value = "";
}


function getTotalTime(secondPerCoordinate) {
  let list = COORDINATE.list.value
                .split('\n').filter( value => value !== "" );
  return convertTime(list.length * secondPerCoordinate);


  function convertTime(totalSecond) {
    // Convert second to hour, minus, second
    let hour = parseInt(totalSecond / 3600);
    totalSecond = totalSecond - hour*3600;
    let minus = parseInt(totalSecond/60);
    let second = totalSecond - minus*60;

    return [hour, minus, second];
  }
}

button.eleSelection.addEventListener('click', function(e){
  if (!e.target.classList.contains('items')) return;

  COORDINATE.elevationNullAction.value = e.target.dataset.action;
  closeElevationActionMenu(e.target);
});

button.cancel.addEventListener('click', function() {
  closeElevationActionMenu(this);
});

function closeElevationActionMenu(self) {
  self.parentNode.hidden = true;
  self.parentNode.previousElementSibling.hidden = false;
}

button.clear.addEventListener('click', clearInput);

button.proceed.addEventListener('click', function(){
  // Validate input using HTML5 Constraint validation API
  const radius = document.querySelector('.coordinates__radius');
  const elevation = document.querySelector('.coordinates__elevation');
  const list = COORDINATE.list;
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
    COORDINATE.loading.hidden = false;
    COORDINATE.main.hidden = true;
    processData();
    COORDINATE.loading.hidden = true;
    COORDINATE.selection.hidden = false;
  }
});

button.back.addEventListener('click', function(){
  COORDINATE.selection.hidden = true;
  COORDINATE.main.hidden = false;
  shortestPathGroup.clearLayers();
  listSelection = [];
});

button.new.addEventListener('click', function(){
  COORDINATE.selection.hidden = true;
  COORDINATE.main.hidden = false;
  clearInput();
  markerGroup.clearLayers();
  shortestPathGroup.clearLayers();
});


COORDINATE.selection.addEventListener('click', function selectItem(e) {
  let label = e.target.dataset.src;
  // Click on selection item gap or selected item
  if (!label || e.target.classList.contains('selection__items--selected')) return;

  let marker = C.list[label];
  Marker.openPopup(marker, markerGroup);
  Marker.panTo(marker);

  if (e.target.classList.contains('selection__items')) {
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

  }
});


button.export.addEventListener('click', function() {
  let list = COORDINATE.list.value.split('\n').filter(value => value !== "");
  let data = "data:text/csv;charset=utf-8,";
  for (let value of list) {
    value = convertRawStringToCoordinate(value);
    if (value[1] === -Infinity) value[1] = "";

    data += value.join(',');
    data += '\r\n';
  }
  this.href = encodeURI(data);
});
