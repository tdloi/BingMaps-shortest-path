import { Coordinate, Coordinates, HaversineFormula as calculateDistant } from './coordinates.js';
import { Graph } from './graph.js';
import { Marker } from './marker.js';

"use strict";

const $ = document.querySelector.bind(document);

// Store all passed coordinates data and its relationship (adjacency)
// also elevation value in case loading from API
let C = new Coordinates();

let markerGroup = new L.featureGroup();

let shortestPathGroup = new L.featureGroup();
shortestPathGroup.addTo(map);

// Only need two coordinate to find shortest path between them, so
// this value is used to keep track of which coordinate chooses by user
let SELECTED = [];
// Use to decide whether or not loading  missing elevation from OpenElevation
// API, default acction will be false and exclude all coordinates don't have
// elevation value
let LOAD_ELEVATION_FROM_API = false;
// List (array) of coordinates get from textarea input
// it's empty on load because there are no data yet,
// will be updated by listening `change` event
let COORDINATES_LIST;

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
  let ele = null;
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
  $('.selection__list').innerHTML = "";
  markerGroup.clearLayers();

  let listValidMarkerLabels = [];
  let listInvalidMarkerLabels = [];

  const ElevationFilterValue = $('.coordinates__elevation').valueAsNumber || 0;

  // In case there are no elevation values from input, ignore it completely
  // but if it is, only ignore coordinates don't have
  const noElevationProvided = COORDINATES_LIST
                                .map( value => convertRawStringToCoordinate(value)[1])
                                .filter(value => value !== null)
                                .length === 0;

  for (let rawString of COORDINATES_LIST) {
    let c = new Coordinate( ...convertRawStringToCoordinate(rawString) );
    // Make a list marker combine of valid and invalid marker
    // to keep track of label
    let listMarkerLabels = listValidMarkerLabels.concat(listInvalidMarkerLabels)
                              .map(value => +value);

    let index = listMarkerLabels.length === 0 ? 0 : Math.max( ...listMarkerLabels );
    c.label = index + 1;

    if (c.isValid()) {

      if (c.ele === null && LOAD_ELEVATION_FROM_API) {
          let xhr = new XMLHttpRequest();
          xhr.open('GET', `https://api.open-elevation.com/api/v1/lookup?locations=${c.lat},${c.lon}`);
          xhr.onload = function() {
            if (this.readyState === 4 && this.status === 200) {
              c.ele = new String(JSON.parse(this.responseText).results[0].elevation);
            }
            if (C.isExisted(c)) c.label = +C.findCoordinate(c);

            const ignoreNullEle = c.ele === null && noElevationProvided;

            const isValidEle = ignoreNullEle || c.ele >= ElevationFilterValue;

            if (isValidEle && listValidMarkerLabels.includes(c.label) === false)
              listValidMarkerLabels.push(c.label);
            else if (listInvalidMarkerLabels.includes(c.label) === false)
              listInvalidMarkerLabels.push(c.label);

            addCoordinate(c);
          };
          xhr.send();
      }
      else {
        if (C.isExisted(c)) c.label = +C.findCoordinate(c);

        const ignoreNullEle = c.ele === null && noElevationProvided;

        const isValidEle = ignoreNullEle || c.ele >= ElevationFilterValue;

        if (isValidEle && listValidMarkerLabels.includes(c.label) === false)
          listValidMarkerLabels.push(c.label);
        else if (listInvalidMarkerLabels.includes(c.label) === false)
          listInvalidMarkerLabels.push(c.label);

        addCoordinate(c);
      }

    }
  }

  loadAdjacency(listValidMarkerLabels, radius);
  syncCoordinateList();

  // Draw polyline between each marker of map
  for (let marker of listValidMarkerLabels) {
    if (marker !== undefined) {
      drawAdjacency( marker,
                     Object.keys(C.list[marker].neighbors) );
    }
  }

  function addCoordinate(c) {
    $('.selection__list').innerHTML += `
      <p class="selection__items" data-src="${c.label}">${c.name}</p>
    `;
    C.addCoordinate(c);

    Marker.addToMap(c, markerGroup);
    Marker.panTo(c);
  }
}

function loadAdjacency(listValidMarkerLabels, radius) {
  let _markers = [...listValidMarkerLabels];
  // Nested lopp through all coordinate in list, then check distant
  // between two coordinate if their distant smaller than radius,
  // they will be treated as adjency vertice
  while(_markers.length > 0) {
    let c = _markers.pop();
    for (let coordinate of _markers) {
      let c1 = C.list[c];
      let c2 = C.list[coordinate];
      if ( calculateDistant(c1, c2) <= radius )
        C.addNeighbor(c1, c2);
    }
  }
}

function syncCoordinateList() {
  const listCoordinateLabels = Object.keys(C.list);
  // update list input so that we can export it later
  if (listCoordinateLabels.length === 0) return;

  let outputString = "";
  for ( let label of listCoordinateLabels ) {
    let m = C.list[label];
    let ele = m.ele || "";
    m = [m.name, ele, m.lat, m.lon];

    outputString += m.join(' ');
    outputString += '\n';
  }

  $('.coordinates__list').value = outputString.trim();
}

function proceedDrawingShortestPath(c1, c2) {
  // Draw a polyline demonstrate shortest path
  // between coordinate c1 and c2

  let _map = {}; // Default input of Graph object
                 // a list of object with key is coordinate label and
                 // value is an object contains adjacent vertice
                 // { "1" : { "2", "3", "4" } }
  const listLabel = Object.keys(C.list)
                      .map(key => parseInt(key, 10));
  for (let marker of listLabel) {
    _map[marker] = C.list[marker].neighbors;
  }

  const g = new Graph(_map);
  const path = g.findShortestPath(c1, c2);

  if (path === null) {
    $('.selection__error').innerHTML = "No shortest path found";
    return;
  }
  else {
    $('.selection__error').innerHTML = "";
  }

  drawShortestPath(path);
}

function drawAdjacency(marker, neighbors, color='#0e6dd7', group=markerGroup) {
  // draw polyline between a marker and all of its neightbors (adjacency)
  // neightbors contains list of coordinates label in C can query through C.list[label]
  // it will map neightbors array into latlongs multi-dimension array formats
  let latlons = neighbors.map(
    neighborMarker => [
      [C.list[marker].lat, C.list[marker].lon],
      [C.list[neighborMarker].lat, C.list[neighborMarker].lon]
    ]
  );
  Marker.drawPolyline(latlons, color, group);
}

function drawShortestPath(path) {
  shortestPathGroup.clearLayers();
  // `path` is an array of labels lie on the shortest path from coordinate x to y
  // returned from Graph.findShortestPath

  // map all label in `path` with its next on the senquence
  // to pass to Marker.drawPolyline
  let latlons = path.map( function(currrentLabel, i, arr) {
    const nextLabel = arr[i + 1];
    if (nextLabel === undefined) return [];

    return [
      [C.list[currrentLabel].lat, C.list[currrentLabel].lon],
      [C.list[nextLabel].lat, C.list[nextLabel].lon]
    ];
  });
  Marker.drawPolyline(latlons, 'red', shortestPathGroup);
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

    // check if elevation value is missing in any of coordinate data
    // and show confirm box if it is
    let ElevationArray =  COORDINATES_LIST
                            .map( value => convertRawStringToCoordinate(value)[1])
                            .filter(value => value !== null);
    // if there are no elevation value from coordinate, ignore this it continues
    // proceed data
    if (ElevationArray.length !== COORDINATES_LIST.length
        && ElevationArray.length !== 0) {
      hideElement(this);
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

$('.elevation-action').addEventListener('click', function chooseLoadingElevation(e){
  const src = e.target.dataset.src;

  if (!src) return;

  LOAD_ELEVATION_FROM_API = !!src;
  hideElement(this);
  processData();
});


$('.selection').addEventListener('click', function selectionButtonAction(e){
  const action = e.target.dataset.action;
  if (!action) return;

  hideElement(this);
  showElement('.main');
  shortestPathGroup.clearLayers();

  if (action === 'back') {
    SELECTED = [];
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
      proceedDrawingShortestPath([...SELECTED]);
    }

  }
});


$('.export-csv').addEventListener('click', function exportCSV() {
  let data = "data:text/csv;charset=utf-8,";
  for (let value of COORDINATES_LIST) {
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

    // trigger event to force reload COORDINATE_LIST values
    $('textarea').dispatchEvent(new Event('change'));
  };

  reader.readAsText(selectedFile);

});


$('textarea').addEventListener('change', function assignValueForCoordinateList() {
  COORDINATES_LIST = $('.coordinates__list').value
                          .replace(/\t/g, ' ')
                          .split('\n')
                          .filter(value => value !== "");
});
