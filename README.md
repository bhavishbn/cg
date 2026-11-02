# APEX RACING — Stage 1

A browser racing simulator set on real roads through the Chamonix valley, from Les Houches to Argentière. The game uses OpenStreetMap highway geometry, Esri World Imagery satellite coverage, and real elevation data from Tilezen Terrain Tiles. Terrain and road geometry are bundled locally for driving.

## Run it

```sh
npm install
npm run dev
```

Open the local URL Vite prints. `npm run build` produces a deployable bundle.

## Drive

Click **Take the wheel**, then use **W/A/S/D** or arrow keys. **Space** applies the handbrake; **C** cycles chase/cockpit/rear/top cameras; **P** or **Escape** pauses; **R** resets; **M** mutes the engine tone.

## Real map

The playable area covers roughly 17.9 × 20 km from Les Houches to Argentière (bbox 6.77–7.01° E, 45.87–46.05° N). The map contains 3,043 current OSM-derived highway features clipped to the area, a 3,780 × 4,096 Esri World Imagery basemap, and a 769 × 833 elevation grid sampled from Tilezen Terrarium tiles. Elevation is kept in real metre scale and the game surface follows those heights. The terrain source is a regional blend; for France, Tilezen documents EU-DEM layers in its source set. The grid is resampled and does not add precision beyond its elevation source.

The app uses local files in `public/data/` and requests no map service while running. The BlenderGIS project and importable OSM/ASCII elevation files are in `incoming/blendergis/`.

## Credits

- Road data: © OpenStreetMap contributors, ODbL, provided through Esri’s OSM Highways Europe layer.
- Satellite imagery: sources Esri, Maxar, Earthstar Geographics, and the GIS User Community.
- Terrain: Tilezen Terrain Tiles; Europe terrain uses Copernicus EU-DEM layers.
- Bugatti Chiron 2017 model by Bob Kimani (Kimz Auto), supplied by the project owner.

## Project layout

```text
src/main.js                loads local map assets and connects HUD to game
src/core/Game.js           renderer, scene, update loop
src/core/CameraManager.js  smooth chase and cockpit views
src/world/MapRoads.js      real valley terrain, roads, and ground sampling
src/vehicles/VehicleController.js
src/ui/MapPreview.js       satellite road map and live car marker
public/data/               runtime map data and imagery
incoming/blendergis/       Blender scene plus OSM and DEM handoff files
```

Race sessions, selectable cars, opponents, checkpoints, rigid-body physics, weather, detailed audio, and results are later stages.
