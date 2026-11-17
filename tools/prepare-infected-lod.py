import bpy,sys
from pathlib import Path
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(sys.argv[sys.argv.index('--')+1])/'zombie.glb'))
mesh=next(o for o in bpy.data.objects if o.type=='MESH' and len(o.data.vertices)>100)
bpy.context.view_layer.objects.active=mesh
mod=mesh.modifiers.new('Web LOD','DECIMATE');mod.ratio=.36
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True)
for o in bpy.data.objects:
 if o.type=='ARMATURE':o.select_set(True)
bpy.ops.export_scene.gltf(filepath='public/assets/models/characters/infected-lod.glb',export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
