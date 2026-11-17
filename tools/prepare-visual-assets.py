"""Run with Blender 4.3: blender -b --python tools/prepare-visual-assets.py -- <source-dir>.
Uses original licensed meshes, not primitive substitutes. Source URLs/licenses in manifest.
"""
import bpy,sys,math,os
import numpy as np
from mathutils import Matrix,Vector
from pathlib import Path
source=Path(sys.argv[sys.argv.index('--')+1]);out=Path('public/assets/models')
def surface_texture(name,color):
 size=256
 rng=np.random.default_rng(81)
 y,x=np.mgrid[0:size,0:size]
 weave=((x%4<2)^(y%4<2))*.025
 noise=rng.normal(0,.018,(size,size))
 variation=np.clip(1+noise+weave,.7,1.2)
 pixels=np.ones((size,size,4),dtype=np.float32)
 for channel,value in enumerate(color):pixels[:,:,channel]=np.clip(value*variation,0,1)
 image=bpy.data.images.new(name,width=size,height=size,alpha=False)
 image.pixels.foreach_set(pixels.ravel());image.filepath_raw=str(Path('public/assets/textures')/(name+'.png'));image.file_format='PNG';image.save()
 return image
def material(name,color,metal=0,rough=.75):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=surface_texture(name.lower().replace(' ','-'),color)
 m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
 return m
# Actual Beretta mesh: source is X-forward, oversized FBX-derived coordinates.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source/'pistol.glb'))
meshes=[o for o in bpy.data.objects if o.type=='MESH']
# Capture every world transform before detaching/scaling the parent Frame.
# Otherwise its children lose the source's 100x FBX scale while being converted.
worlds={o.name:o.matrix_world.copy() for o in meshes}
transform=Matrix.Scale(.1,4)@Matrix.Rotation(-math.pi/2,4,'Z')
metal=material('Worn parkerized steel',(.12,.135,.145),.85,.36)
grip=material('Grip polymer',(.025,.032,.033),0,.78)
barrel=material('Barrel steel',(.2,.22,.24),.9,.28)
for o in meshes:
 world=worlds[o.name]
 for v in o.data.vertices:v.co=transform@world@v.co
 o.parent=None;o.matrix_world=Matrix.Identity(4)
 for idx,old in enumerate(o.data.materials):
  o.data.materials[idx]=grip if 'Black' in old.name else metal if 'Main' in old.name else barrel
 o.name={'9mmBeretta':'Frame','Slide':'Slide','Trigger':'Trigger','Hammer':'Hammer'}.get(o.name,o.name)
 # Light bevels retain the original mesh silhouette instead of rebuilding it from boxes.
 bevel=o.modifiers.new('Machined edges','BEVEL');bevel.width=.0006;bevel.segments=2
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
 # UVs for local generated fine-wear textures, exported with the actual model.
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
# Authored magazine insert: chamfered profile, inside the existing pistol grip at rest.
profile=[(-.010,-.014),(.010,-.014),(.013,-.010),(.013,.010),(.010,.014),(-.010,.014),(-.013,.010),(-.013,-.010)]
verts=[(x,y,z) for z in [-.061,.025] for x,y in profile]
faces=[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
mesh=bpy.data.meshes.new('Magazine shell');mesh.from_pydata(verts,[],faces);mesh.update()
mag=bpy.data.objects.new('Magazine',mesh);bpy.context.collection.objects.link(mag);mesh.materials.append(grip)
# Preserve baseline visual pose and attach all parts under a named node.
root=bpy.data.objects.new('M9',None);bpy.context.collection.objects.link(root)
for o in [*meshes,mag]:o.parent=root
bpy.ops.export_scene.gltf(filepath=str(out/'weapons/m9.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False)

# CC0 anatomical FPS arms. Pose author IK controls in metric weapon coordinates.
bpy.ops.wm.open_mainfile(filepath=str(source/'arms/FPS ARMS RIG 1.blend'))
if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
body=next(o for o in bpy.data.objects if o.type=='MESH')
for o in list(bpy.data.objects):
 if o not in [rig,body]:bpy.data.objects.remove(o,do_unlink=True)
rig.animation_data_clear()
root=bpy.data.objects.new('FPSArms',None);bpy.context.collection.objects.link(root)
root.matrix_world=Matrix.Translation((0,-.35,-.20))@Matrix.Scale(.1,4)
old=rig.matrix_world.copy();rig.parent=root;rig.matrix_parent_inverse=Matrix.Identity(4);rig.matrix_basis=old
bpy.context.view_layer.update()
for side,sign in [('R',1),('L',-1)]:
 target=Vector((.047*sign,-.012 if side=='R' else -.035,-.105 if side=='R' else -.098))
 control=rig.pose.bones['hand.'+side+'.control']
 mat=control.matrix.copy();mat.translation=rig.matrix_world.inverted()@target;control.matrix=mat
 bpy.context.view_layer.update()
 # Palm long axis points upward; dorsal normal points outward, fingers curl inward.
 x=Vector((0,sign,0));y=Vector((0,0,1));z=x.cross(y)
 rot=Matrix((x,y,z)).transposed().to_4x4()
 hand=rig.pose.bones['hand.'+side]
 hand.matrix=rig.matrix_world.inverted()@Matrix.Translation(target)@rot@Matrix.Scale(.1,4)
 for finger,angle in [('pinky',-1.15),('ring',-1.1),('middle',-1.0),('index',-.2 if side=='R' else -1.05)]:
  b=rig.pose.bones['f_'+finger+'.01.'+side];b.rotation_mode='XYZ';b.rotation_euler.x=angle
 b=rig.pose.bones['thumb.02.'+side];b.rotation_mode='XYZ';b.rotation_euler.x=-.6
bpy.context.view_layer.update()
# Keep the trigger finger forward, along the frame, rather than pointing upward.
finger=rig.pose.bones['f_index.01.R']
world=rig.matrix_world@finger.matrix
pivot=world.translation.copy()
finger.matrix=rig.matrix_world.inverted()@Matrix.Translation(pivot)@Matrix.Rotation(-1.35,4,'X')@Matrix.Translation(-pivot)@world
bpy.context.view_layer.update()
# Assign glove and sleeve regions from actual skin weights, preserving anatomy/rig.
glove=material('Tactical glove',(.065,.075,.065),0,.76)
sleeve=material('Olive sleeve',(.18,.20,.15),0,.91)
body.data.materials.clear();body.data.materials.append(sleeve);body.data.materials.append(glove)
names={g.index:g.name for g in body.vertex_groups}
for poly in body.data.polygons:
 hand_weight=0
 for i in poly.vertices:
  for g in body.data.vertices[i].groups:
   if any(term in names.get(g.group,'') for term in ['hand.','palm_','f_','thumb.']):hand_weight+=g.weight
 poly.material_index=1 if hand_weight/len(poly.vertices)>.35 else 0
# Bake evaluated pose as rest pose with deformed mesh, retaining true finger bones.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
for mod in list(body.modifiers):
 if mod.type=='ARMATURE':
  copied=body.modifiers.new('Pose bake','ARMATURE');copied.object=rig
  bpy.ops.object.modifier_move_up(modifier=copied.name)
  bpy.ops.object.modifier_apply(modifier=copied.name)
  break
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
rig.name='ArmRig';body.name='GlovedArms'
# Keep inner glove vertices outside a conservative pistol-grip envelope at rest.
# This is mesh adaptation, not gameplay collision or a changed hit volume.
bpy.context.view_layer.update()
inverse=body.matrix_world.inverted()
bounds=[(-.018,.018),(-.045,.03),(-.068,.03)]
projected=0
for v in body.data.vertices:
 point=body.matrix_world@v.co
 if all(low<point[i]<high for i,(low,high) in enumerate(bounds)):
  candidates=[(point[i]-low,i,low-.001) for i,(low,high) in enumerate(bounds)]+[(high-point[i],i,high+.001) for i,(low,high) in enumerate(bounds)]
  _,axis,value=min(candidates);point[axis]=value;v.co=inverse@point;projected+=1
print('GRIP_CLEARANCE_VERTICES',projected)
# Bake a normalized support-hand reload through the original IK, preserving elbow/wrist continuity.
rig.animation_data_create()
action=bpy.data.actions.new('SupportReload');rig.animation_data.action=action
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=0;scene.frame_end=30
control=rig.pose.bones['hand.L.control'];rest=control.matrix.copy()
for frame,travel in [(0,0),(4,0),(11,1),(18,1),(27,0),(30,0)]:
 scene.frame_set(frame)
 mat=rest.copy();offset=rig.matrix_world.inverted().to_3x3()@Vector((-.025*travel,0,-.17*travel));mat.translation=rest.translation+offset;control.matrix=mat
 control.keyframe_insert(data_path='location',frame=frame)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.nla.bake(frame_start=0,frame_end=30,step=1,only_selected=False,visual_keying=True,clear_constraints=True,use_current_action=True,bake_types={'POSE'})
rig.animation_data.action.name='SupportReload'
for a in list(bpy.data.actions):
 if a!=rig.animation_data.action:bpy.data.actions.remove(a)
scene.frame_set(0)
bpy.ops.export_scene.gltf(filepath=str(out/'viewmodels/tactical-arms.glb'),export_format='GLB',export_animations=True,export_cameras=False,export_lights=False)
