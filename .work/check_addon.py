import bpy, addon_utils, sys
mods=[]
for m in addon_utils.modules(refresh=True):
    if 'gis' in m.__name__.lower(): mods.append((m.__name__,m.__file__))
print('GIS_MODULES',mods)
print('BLENDER',bpy.app.version_string)
