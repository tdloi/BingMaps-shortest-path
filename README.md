# Simple shortest path application

A simple application use Dijkstra algorithm to find the shortest path between two coordinates (as the crow flies) from list of coordinates then display it on map.

## Overview
App receives a list of coordinates and a radius:
+ If the distance between two coordinates (calculate by [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)) lower than radius, they will be treated as adjacency of each other.
+ Coordinates represent vertice of a Graph and a path between them is edge.

## Usage
- Go to https://tdloi.github.io/simple-shortest-path
- Input a list of coordinates, each line contains three values: coordinate names, latitude and lontitude.

*Note*: If radius is not resented, a random value will be generated.


## License
Source code of this project is licensed under [MIT license](LICENSE)
