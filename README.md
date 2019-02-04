# Simple shortest path application

A simple application use Dijkstra algorithm to find the shortest path between two coordinates (as the crow flies) from list of coordinates then display it on map.

## Overview
App receives a list of coordinates, a radius and an elevation filter values
+ If the distance between two coordinates (calculate by [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)) lower radius, they will be treated as adjacency of each other.
+ If elevation of a coordinate is lower than elevation filter value,  it will be excluded from map

## Usage
- Go to https://tdloi.github.io/simple-shortest-path
- Input a list of coordinates, each line contains four values: coordinate names, elevation, latitude and lontitude.

*Note*:
+ If radius is not resented, a random value will be generated.
+ If no elevation are provided, elevation filter value will be ignored.
+ If there is a missing elevation value from coordinates list input, a prompt will display to ask for confirmation of loading elevation from [OpenElevation](https://open-elevation.com/) API

## License
Source code of this project is licensed under [MIT license](LICENSE)
