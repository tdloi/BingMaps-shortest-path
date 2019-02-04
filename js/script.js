import { Coordinate, Coordinates, HaversineFormula } from './coordinates.js';
import { Graph } from './graph.js';
import { Marker } from './marker.js';

"use strict";

const $ = document.querySelector.bind(document);

let C = new Coordinates();

const COORDINATE = {
  elevation: $('.coordinates__elevation'),
  list: $('.coordinates__list'),
  main: $('.main'),
  selection: $('.selection'),
  selectionList: $('.selection__list'),
};


let shortestPathGroup = new L.featureGroup();
shortestPathGroup.addTo(map);

let markerGroup = new L.featureGroup();

// Only need two coordinate to find shortest path between them, so
// this value is used to keep track of which coordinate chooses by user
let SELECTED = [];
// Use to save chosen action for missing elevation values
// action: MIN - MAX (of all elevation) - API (load from OpenElevationAPI)
let MISSING_ELEVATION_LOAD_SRC = undefined;

function random(min, max) {
  return (Math.random()*(max-min) + min).toFixed(2);
}

// Helper function to toggle element
// accept input with either elementSelector (as string)
// or element (as object)
function toggleElement(element, hideElement) {
  if (typeof element === 'object') { // pass DOM node
    element.hidden = hideElement;
  }
  else {
    $(element).hidden = hideElement;
  }
}
function showElement(elementSelector) {
  toggleElement(elementSelector, false);
}
function hideElement(elementSelector) {
  toggleElement(elementSelector, true);
}


function convertRawStringToCoordinate(raw) {
  // Each string includes: Coordinate name, Elevation, Latitude, Lontitude
  // seperated by a space, so to avoid space in name, we need get
  // lat and lon first then get elevation
  raw = raw.split(' ').filter(
    value => value !== ""
  );
  let [lat, lon] = raw.splice(-2, 2);
  // Check if elevation is missing, then check if its value is a number
  // if not, assume it is a part of coordinate name
  let ele = -Infinity;
  if (raw.length >= 2 &&
      typeof +raw[raw.length - 1] === 'number') {
    ele = raw.pop();
  }
  return [raw.join(' '), ele, lat, lon];
}


function processData() {
  showElement('.selection');
  hideElement('.main');

  const radius = function() {
    let r = $('.coordinates__radius');
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
  let listValidMarker = [];
  let listInvalidMarker = [];

  const elevationMissingValue = getElevationMissingValue();

  const ElevationFilterValue = COORDINATE.elevation.valueAsNumber || 0;


  for (let rawString of listCoordinates) {
    let c = new Coordinate( ...convertRawStringToCoordinate(rawString) );
    // Make a list marker conbine of valid and invalid marker
    // to keep track of label
    let listMarker = listValidMarker.concat(listInvalidMarker)
                        .map(value => +value);

    let index = listMarker.length === 0 ? 0 : Math.max( ...listMarker );
    c.label = index + 1;

    if (c.isValid()) {

      if (c.ele === -Infinity &&
          elevationMissingValue === undefined) {
          let xhr = new XMLHttpRequest();
          xhr.open('GET', `https://api.open-elevation.com/api/v1/lookup?locations=${c.lat},${c.lon}`, false);
          xhr.onload = function() {
            if (this.readyState === 4 && this.status === 200) {
              c.ele = JSON.parse(this.responseText).results[0].elevation;

              if (C.isExisted(c)) c.label = +C.findCoordinate(c);
              if (c.ele >= ElevationFilterValue) {
                if (listValidMarker.includes(c.label) === false) {
                  listValidMarker.push(c.label);
                }
                addCoordinate(c);
              } else {
                if (listInvalidMarker.includes(c.label) === false) {
                  listInvalidMarker.push(c.label);
                }
                addCoordinate(c);
              }

            }
          };
          xhr.send();
      }
      else {
        if (c.ele === -Infinity) c.ele = elevationMissingValue;
        if (C.isExisted(c)) c.label = +C.findCoordinate(c);

        if (c.ele >= ElevationFilterValue) {
          if (listValidMarker.includes(c.label) === false) {
            listValidMarker.push(c.label);
          }
          addCoordinate(c);
        } else {
          if (listInvalidMarker.includes(c.label) === false) {
            listInvalidMarker.push(c.label);
          }
          addCoordinate(c);
        }

      }

    }
  }


  let _markers = [...listValidMarker];
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
  for (let marker of listValidMarker) {
    if (marker !== undefined) {
      drawPolyline( marker,
                    Object.keys(C.list[marker].neighbors) );
    }
  }

  function addCoordinate(c, valid=true) {
    COORDINATE.selectionList.innerHTML += `
      <p class="selection__items" data-src="${c.label}">${c.name}</p>
    `;
    C.addCoordinate(c);

    if (valid === true) {
      Marker.addToMap(c, markerGroup);
    } else {
      Marker.addToMap(c, markerGroup, 'red');
    }

    Marker.panTo(c);
  }

  function drawPolylines(marker, listNeighbor, _listInvalidMarker) {
    listNeighbor = listNeighbor.filter(
      neighbor => !_listInvalidMarker.includes(neighbor)
    );
    drawPolyline(marker, listNeighbor);
  }
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
    $('.selection__error').innerHTML = `
      No shortest path found
    `;
    return;
  } else {
    $('.selection__error').innerHTML = "";
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


function getElevationArray() {
  // Get a filtered elevation value array
  let ElevationArray = COORDINATE.list.value.split('\n')
            .filter(value => value !== "")
            .reduce( function (acc, curr) {
                let ele = convertRawStringToCoordinate(curr)[1];
                return acc.concat(ele);
              }, [] )
            .filter(value => value !== -Infinity);
  return ElevationArray;
}

function getElevationMissingValue() {
  let elevationArray = getElevationArray();
  if (MISSING_ELEVATION_LOAD_SRC === 'min') {
    return Math.min(...elevationArray);
  }
  if (MISSING_ELEVATION_LOAD_SRC === 'max') {
    return Math.max(...elevationArray);
  }

  return undefined;
}


$('.main').addEventListener('click', function mainButtonAction(e) {
  // Only button in main section contains data-action
  const action = e.target.dataset.action;
  if (!action) return;

  if (action === 'clear') {
    $('form').reset();
    return;
  }
  if (action === 'proceed') {
    let isInputValid = true;
    // Validate input using HTML5 Constraint validation API
    document.querySelectorAll('input, textarea').forEach(input => {
      if (!input.validity.valid) {
        input.nextElementSibling.innerText = input.validationMessage;
        isInputValid = false;
      }
    });

    if (!isInputValid) return;

    if (MISSING_ELEVATION_LOAD_SRC !== undefined) {
      processData();
      return;
    }

    // check if elevation value is missing in any of coordinate data
    let cdnList = COORDINATE.list.value.split('\n')
                    .filter(value => value !== "");
    let ElevationArray = getElevationArray();

    if (ElevationArray.length !== cdnList.length) {
      hideElement('.main');
      showElement('.elevation-action');
      return;
    }
    processData();
  }
});

$('.elevation-action').addEventListener('click', function close(e){
  const action = e.target.dataset.action;

  if (!action) return;

  if (action === 'close') {
    hideElement(this);
    showElement(this.previousElementSibling); // === main menu
    return;
  }
});

$('.elevation-action').addEventListener('click', function setMissingElevationLoadSrc(e){
  const src = e.target.dataset.src;

  if (!src) return;
  MISSING_ELEVATION_LOAD_SRC = src;

  hideElement(this);
  processData();
});


$('.selection').addEventListener('click', function(e){
  const action = e.target.dataset.action;
  if (!action) return;

  hideElement(this);
  showElement('.main');
  shortestPathGroup.clearLayers();

  if (action === 'back') {
    SELECTED = [];
    MISSING_ELEVATION_LOAD_SRC = undefined;
  }
  if (action === 'new') {
    $('form').reset();
    markerGroup.clearLayers();
  }
});

$('.selection').addEventListener('click', function selectItem(e) {
  let label = e.target.dataset.src;
  // Avoid firing event when clicking on selection item gap or selected item
  if (!label || e.target.classList.contains('selection__items--selected')) return;

  let marker = C.list[label];
  Marker.openPopup(marker, markerGroup);
  Marker.panTo(marker);

  if (e.target.classList.contains('selection__items')) {
    e.target.classList.add('selection__items--selected');
    SELECTED.push(label);

    if (SELECTED.length === 3) {
      let popLabel = SELECTED.shift();
      // Remove selected class from pop label
      document.querySelectorAll('.selection__items--selected').forEach((target) => {
        if (target.dataset.src === popLabel) {
          target.classList.remove('selection__items--selected');
        }
      });
    }

    if (SELECTED.length === 2) {
      let [c1, c2] = SELECTED;
      drawShortestPath(c1, c2);
    }

  }
});


$('.export-csv').addEventListener('click', function exportCSV() {
  let list = $('.coordinates__list').value.split('\n')
                .filter(value => value !== "");
  let data = "data:text/csv;charset=utf-8,";
  for (let value of list) {
    value = convertRawStringToCoordinate(value);
    if (value[1] === -Infinity) value[1] = "";

    data += value.join(',');
    data += '\r\n';
  }
  this.href = encodeURI(data);
});

$('#csv-file').addEventListener('change', function readContentIntoInputList() {
  const selectedFile = this.files[0];
  const reader = new FileReader();

  reader.onload = function(fi) {
    // Each column from csv file is seperated by comma
    // We need to replace it with space so that we can filter it later
    $('.coordinates__list').value = fi.target.result.replace(/,/g, ' ');
  };

  reader.readAsText(selectedFile);
});
