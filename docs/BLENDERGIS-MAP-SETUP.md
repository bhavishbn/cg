# Real Chamonix valley map and BlenderGIS handoff

I selected the Chamonix valley from Les Houches through Chamonix to Argentière, France. The playable area is approximately 17.9 × 20 km (6.77–7.01° E, 45.87–46.05° N).

## App data

- 3,043 OSM-derived highway features are clipped to the play area and rendered as drivable road strips.
- A 3,780 × 4,096 Esri World Imagery export is draped over the terrain.
- Elevation is sampled onto a 769 × 833 grid from z13 Tilezen Terrarium tiles. The app uses metre scale for height and samples the same grid for vehicle ground contact.
- The downloaded elevation composite is regional. Tilezen's data source notes identify EU-DEM layers for Europe, and the game grid resamples that source rather than adding elevation detail.

Runtime files are `public/data/chamonix-valley-roads.json`, `public/data/chamonix-valley-terrain.json`, and `public/data/chamonix-valley-imagery.jpg`.

## BlenderGIS files

Open [the valley scene](../incoming/blendergis/Chamonix-Valley-BlenderGIS.blend) to view the terrain and real mapped roads. The companion `chamonix-valley-roads.osm` and `chamonix-terrain-tilezen.asc` files can be imported as vector and raster sources in BlenderGIS.

BlenderGIS 2.2.14 is installed but its dependency check does not initialize in this Blender environment: Blender's Python lacks GDAL, pyProj, and Pillow, and the add-on cannot download its FreeImage dependency here. The scene and source files are prepared, though live BlenderGIS web fetch controls could not be run.

## Data credits

- © OpenStreetMap contributors, ODbL, via the [Esri OSM Highways Europe feature layer](https://services-eu1.arcgis.com/zci5bUiJ8olAal7N/ArcGIS/rest/services/OSM_Highways_EU/FeatureServer).
- Esri World Imagery: sources Esri, Maxar, Earthstar Geographics, and the GIS User Community.
- Tilezen Terrain Tiles; Copernicus data and information funded by the European Union — EU-DEM layers.

The UI keeps road, imagery, and terrain attribution visible.
