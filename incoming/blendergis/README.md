# Chamonix–Argentière real map pack

Selected area: the Chamonix valley from Les Houches to Argentière, France. The playable bbox is 6.77–7.01° E, 45.87–46.05° N, approximately 17.9 × 20 km.

## Included assets

- `Chamonix-Valley-BlenderGIS.blend` — 640,577-vertex elevation mesh, draped satellite imagery, OSM road meshes, and a valley overview camera.
- `chamonix-valley-roads.osm` — clipped OSM highway geometry for BlenderGIS.
- `chamonix-terrain-tilezen.asc` — 769 × 577 geographic ASCII DEM for BlenderGIS raster import.
- `public/data/chamonix-valley-roads.json` — 3,043 OSM-derived highway features for the game.
- `public/data/chamonix-valley-terrain.json` — 769 × 833 elevations sampled from z13 Tilezen Terrarium tiles.
- `public/data/chamonix-valley-imagery.jpg` — 3,780 × 4,096 Esri World Imagery covering the same bbox.

The app draws drivable road strips over the terrain mesh and samples the DEM for vehicle ground contact. The 19–24 m game grid is a resampling of the underlying regional elevation source; it is not survey-grade road elevation.

## BlenderGIS dependency status

BlenderGIS 2.2.14 is present in Blender 5.2, but this local install cannot complete its dependency check because GDAL, pyProj, and Pillow are missing from Blender's Python. Its first-run check also tries to download FreeImage while this environment's DNS access to that dependency is unavailable. The supplied `.blend`, `.osm`, and `.asc` files are already prepared; BlenderGIS can be used to edit/import the source layers once its dependencies initialize.

## Sources and attribution

- OSM roads via the [Esri OSM Highways Europe feature layer](https://services-eu1.arcgis.com/zci5bUiJ8olAal7N/ArcGIS/rest/services/OSM_Highways_EU/FeatureServer); © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL.
- [Esri World Imagery](https://doc.arcgis.com/en/data-appliance/2024/maps/world-imagery.htm): sources Esri, Maxar, Earthstar Geographics, and the GIS User Community.
- [Tilezen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/); required regional credit: Copernicus data and information funded by the European Union — EU-DEM layers.
- Terrain tile data sources and resolution notes: [Tilezen source documentation](https://github.com/tilezen/joerd/blob/master/docs/data-sources.md).
