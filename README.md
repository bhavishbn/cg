# APEX RACING — Stage 1

A playable desktop-browser mountain driving foundation using real Chamonix, France OpenStreetMap roads and Copernicus GLO-90 elevation data, rendered as a Three.js terrain and drivable road network. The map extracts are bundled locally so the game does not make map-data requests when it starts.

## Run it

Install a current Node.js LTS release, then run these commands in this folder:

```sh
npm install
npm run dev
```

Open the local URL Vite prints. To produce a deployable bundle, run `npm run build`.

## Play

Click **Take the wheel**, then use **W/A/S/D** or arrow keys. **Space** applies the handbrake; **C** switches chase/cockpit view; **P** or **Escape** pauses; **R** resets; **M** mutes the generated engine tone. Pressing C before driving also previews camera views.

## Structure

```text
index.html                 application shell and HUD
src/main.js                UI-to-game wiring
src/style.css              responsive motorsport interface
src/core/Game.js            renderer, scene, update loop
src/core/CameraManager.js   smooth chase and cockpit views
src/world/Environment.js    lighting and scene composition
src/world/Track.js          closed spline circuit and markings
src/world/MapRoads.js       local projection, real road meshes and DEM terrain
src/world/Forest.js         instanced procedural pines
src/world/Mountains.js      procedural mountain silhouettes
src/vehicles/CarFactory.js  procedural sports-car assembly
src/vehicles/VehicleController.js
src/ui/InputManager.js      keyboard controls
src/ui/MapPreview.js        live OpenStreetMap overview with car marker
src/audio/AudioManager.js   synthesized engine tone
```

## Real map data

The current local extract covers the Chamonix town center near 45.923° N, 6.869° E (about 1.5 × 2.2 km). It contains 767 mapped streets and paths. OpenStreetMap latitude/longitude coordinates are projected into a local east/north meter grid, and each mapped way becomes a width-scaled 3D road strip. Elevations come from the Copernicus DEM GLO-90 through Open-Meteo's Elevation API at 90 m resolution and form a triangulated 3D terrain surface. An Esri World Imagery aerial basemap is draped over this terrain, and the live inset uses the same imagery with OpenStreetMap road overlays. Files are in `public/data/`. The map, streets, imagery, and elevation are real; vegetation and the car remain procedural. Expanding this initial map patch to the entire valley is a straightforward data-coverage extension.

Map attribution is shown in the game UI: imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community; © OpenStreetMap contributors, licensed under the ODbL; and elevation data © Copernicus DEM via Open-Meteo. [Esri World Imagery details](https://doc.arcgis.com/en/data-appliance/2024/maps/world-imagery.htm) · [OpenStreetMap copyright and license](https://www.openstreetmap.org/copyright) · [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api).

## Stage 1 graphics notes

Three.js stores objects in a scene graph. Each car part is a child mesh of the car root, so changing the root translation or rotation moves the complete vehicle while the wheel pivots remain independently animated. The renderer transforms these world coordinates through the camera view matrix and a perspective projection matrix; perspective makes distant scenery appear smaller. A directional light approximates sunlight, the shadow map stores depth from the light's view, and exponential fog blends distant geometry into the sky color. The circuit centerline is a closed Catmull–Rom spline. Sampling its points and tangents creates a ribbon mesh whose cross section is perpendicular to the direction of travel. Repeated pines use instanced meshes to draw many trees with fewer GPU draw calls.

Vehicle motion in this foundation milestone uses a simple longitudinal model: `v += (engineForce − brakeForce − drag) × dt`, then `position += forward × v × dt`. Steering changes yaw, with reduced steering at higher speed and a configurable grip reduction while the handbrake is held. This provides smooth, continuous motion, but does not yet simulate tires, suspension, or rigid-body collisions. Those belong in the dedicated physics milestone.

## Current milestone / next work

Stage 1 includes the WebGL scene, real Chamonix road network and DEM terrain, instanced forest, procedural vehicle, chase/cockpit cameras, continuous driving controls, and speed/RPM display. Race sessions, selectable cars, opponents, checkpoints, Rapier physics, weather, detailed audio, and results are subsequent stages.
