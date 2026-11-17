"""Blender 4.3 offline conversion of licensed source meshes, not primitive models.
blender -b -t 2 --disable-autoexec --python tools/prepare-m812-viewmodel.py -- <sources>
Requires the CC0 arms source in <sources>/arms (from the M811 fetch tool).
"""
import bpy,sys,math
import numpy as np
from pathlib import Path
from mathutils import Matrix,Vector
src=Path(sys.argv[sys.argv.index('--')+1]);out=Path('public/assets/models')
texout=Path('public/assets/textures/m812');texout.mkdir(parents=True,exist_ok=True)
def image(path,noncolor=False):
 i=bpy.data.images.load(str(path),check_existing=True)
 if noncolor:i.colorspace_settings.name='Non-Color'
 return i
def pbr(name,color,metal,rough,diffuse=None,normal=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if diffuse:
  t=n.new('ShaderNodeTexImage');t.image=diffuse;l.new(t.outputs['Color'],p.inputs['Base Color'])
 if normal:
  t=n.new('ShaderNodeTexImage');t.image=normal;b=n.new('ShaderNodeNormalMap');b.inputs['Strength'].default_value=.5;l.new(t.outputs['Color'],b.inputs['Color']);l.new(b.outputs['Normal'],p.inputs['Normal'])
 return m
def woven(name,color,size=512):
 rng=np.random.default_rng(812);y,x=np.mgrid[0:size,0:size]
 noise=rng.normal(0,.012,(size,size));weave=((x%6<3)^(y%6<3))*.045
 pixels=np.ones((size,size,4),dtype=np.float32)
 for c,v in enumerate(color):pixels[:,:,c]=np.clip(v*(1+noise+weave),0,1)
 i=bpy.data.images.new(name,width=size,height=size,alpha=False);i.pixels.foreach_set(pixels.ravel());i.filepath_raw=str(texout/(name+'.png'));i.file_format='PNG';i.save()
 return i
def bind_pose(rig,body):
 bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
 old=next(m for m in body.modifiers if m.type=='ARMATURE')
 copied=body.modifiers.new('Pose bake','ARMATURE');copied.object=rig
 while body.modifiers.find(copied.name)>body.modifiers.find(old.name):bpy.ops.object.modifier_move_up(modifier=copied.name)
 bpy.ops.object.modifier_apply(modifier=copied.name)
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
 bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
def export(path):
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=True,export_cameras=False,export_lights=False)

# Pixel32 Beretta 92: real UV mapped receiver, barrel, safety, sights, grip and trigger.
bpy.ops.wm.open_mainfile(filepath=str(src/'textured-pistol/pistol.blend'),load_ui=False,use_scripts=False)
diffuse=image(src/'textured-pistol/diffuse.png');diffuse.name='Beretta92 diffuse — Pixel32'
steel=pbr('Phosphated steel',(.2,.21,.22),.82,.39,diffuse)
rubber=pbr('Checkered polymer grip',(.05,.05,.05),0,.83,diffuse)
meshes=[o for o in bpy.data.objects if o.type=='MESH' and len(o.data.vertices)]
worlds={o.name:o.matrix_world.copy() for o in meshes}
groups={'Slide':[],'Frame':[],'Trigger':[],'Magazine':[],'Hammer':[]}
for o in meshes:
 name=o.name;world=worlds[name]
 for v in o.data.vertices:
  q=world@v.co;v.co=Vector((-q.z*.067*1.3,(1.02-q.x)*.067,(q.y+.23)*.067))
 o.parent=None;o.matrix_world=Matrix.Identity(4)
 o.data.materials.clear();o.data.materials.append(rubber if name=='Cube.008' else steel)
 for p in o.data.polygons:p.use_smooth=True
 category='Slide' if name in ['Cube.003','Cube.009'] else 'Magazine' if name=='Cube.007' else 'Trigger' if name=='Cube.005' else 'Hammer' if name=='Circle.001' else 'Frame'
 groups[category].append(o)
for o in list(bpy.data.objects):
 if o not in meshes:bpy.data.objects.remove(o,do_unlink=True)
root=bpy.data.objects.new('M9',None);bpy.context.collection.objects.link(root)
for name,objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=objects[0];o.name=name;o.parent=root
 # Tight bevels/split weighted normals preserve the source's machined planes.
 mod=o.modifiers.new('Machined bevels','BEVEL');mod.width=.00035;mod.segments=2;mod.limit_method='ANGLE'
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=mod.name)
for name,point in [('RearSight',(0,-.0153,.0803)),('FrontSight',(0,.1646,.0858)),('Muzzle',(0,.177,.074))]:
 marker=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(marker);marker.parent=root;marker.location=point
export(out/'weapons/m9-service.glb')

# Anatomical CC0 source; new wrist orientation aligns knuckle row along the grip.
bpy.ops.wm.open_mainfile(filepath=str(src/'arms/FPS ARMS RIG 1.blend'),load_ui=False,use_scripts=False)
if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');body=next(o for o in bpy.data.objects if o.type=='MESH')
for o in list(bpy.data.objects):
 if o not in [rig,body]:bpy.data.objects.remove(o,do_unlink=True)
rig.animation_data_clear()
root=bpy.data.objects.new('OperatorArms',None);bpy.context.collection.objects.link(root)
root.matrix_world=Matrix.Translation((0,-.30,-.22))@Matrix.Scale(.075,4)
old=rig.matrix_world.copy();rig.parent=root;rig.matrix_parent_inverse=Matrix.Identity(4);rig.matrix_basis=old
bpy.context.view_layer.update()
for side,sign in [('R',1),('L',-1)]:
 target=Vector((.026 if side=='R' else -.039,-.065 if side=='R' else -.043,-.010 if side=='R' else -.020))
 control=rig.pose.bones['hand.'+side+'.control'];mat=control.matrix.copy();mat.translation=rig.matrix_world.inverted()@target;control.matrix=mat
 bpy.context.view_layer.update()
 x=Vector((0,0,sign));y=Vector((0,1,0));z=x.cross(y)
 rotation=Matrix((x,y,z)).transposed().to_4x4()
 rig.pose.bones['hand.'+side].matrix=rig.matrix_world.inverted()@Matrix.Translation(target)@rotation@Matrix.Scale(.075,4)
 for finger in ['pinky','ring','middle','index']:
  for joint,angle in [(1,.72),(2,.70),(3,.38)]:
   b=rig.pose.bones[f'f_{finger}.{joint:02d}.{side}'];b.rotation_mode='XYZ'
   b.rotation_euler.x=angle if not(finger=='index' and side=='R') else [.12,.6,.5][joint-1]
 for j in [1,2,3]:
  b=rig.pose.bones[f'thumb.{j:02d}.{side}'];b.rotation_mode='XYZ';b.rotation_euler.x=.12 if j==1 else .25
bpy.context.view_layer.update()
# Lift the trigger metacarpal toward the guard, with an actual joint rotation.
bone=rig.pose.bones['palm_index.R'];world=rig.matrix_world@bone.matrix;pivot=world.translation.copy()
bone.matrix=rig.matrix_world.inverted()@Matrix.Translation(pivot)@Matrix.Rotation(.3,4,'X')@Matrix.Translation(-pivot)@world
bpy.context.view_layer.update()
# PBR glove/sleeve/reinforcement regions retain anatomical skin weights and UVs.
cloth=pbr('Ranger textile',(.16,.19,.15),0,.94,woven('ranger-weave',(.16,.19,.15)))
glove=pbr('Tactical glove textile',(.075,.085,.07),0,.88,woven('glove-weave',(.075,.085,.07)))
reinforcement=pbr('Glove knuckle leather',(.055,.062,.05),0,.58,woven('glove-leather',(.055,.062,.05)))
body.data.materials.clear()
for m in [cloth,glove,reinforcement]:body.data.materials.append(m)
names={g.index:g.name for g in body.vertex_groups}
for poly in body.data.polygons:
 hand=0;knuckle=0
 for i in poly.vertices:
  for g in body.data.vertices[i].groups:
   name=names.get(g.group,'')
   if any(t in name for t in ['hand.','palm_','f_','thumb.']):hand+=g.weight
   if 'f_' in name and '.01.' in name:knuckle+=g.weight
 poly.material_index=2 if knuckle/len(poly.vertices)>.65 else 1 if hand/len(poly.vertices)>.32 else 0
 poly.use_smooth=True
bind_pose(rig,body);rig.name='ArmRig';body.name='GlovedArms'
# Fitted reinforcement panels derived from the posed hand surface, with the
# original skin weights. They are not disconnected boxes or solid mitten meshes.
body.data.update();names={g.index:g.name for g in body.vertex_groups};faces=[]
normal_matrix=body.matrix_world.to_3x3().inverted().transposed()
for poly in body.data.polygons:
 centre=body.matrix_world@poly.center;normal=(normal_matrix@poly.normal).normalized()
 weight=0
 for i in poly.vertices:
  for g in body.data.vertices[i].groups:
   name=names.get(g.group,'')
   if ('palm_' in name or ('f_' in name and '.01.' in name)):weight+=g.weight
 if weight/len(poly.vertices)>.65 and normal.x*(1 if centre.x>0 else -1)>.5 and abs(centre.x)>.025:faces.append(poly)
used=sorted({i for p in faces for i in p.vertices});lookup={old:new for new,old in enumerate(used)}
data=bpy.data.meshes.new('Fitted glove panels');data.from_pydata([body.data.vertices[i].co for i in used],[],[[lookup[i] for i in p.vertices] for p in faces]);data.update()
pads=bpy.data.objects.new('GloveReinforcements',data);bpy.context.collection.objects.link(pads);pads.parent=body.parent;pads.matrix_basis=body.matrix_basis.copy()
for g in body.vertex_groups:pads.vertex_groups.new(name=g.name)
for old,new in lookup.items():
 for g in body.data.vertices[old].groups:pads.vertex_groups[g.group].add([new],g.weight,'REPLACE')
 # About 1 mm above the anatomical surface, on the outside of the grasp.
 world=body.matrix_world@data.vertices[new].co;world+=(normal_matrix@body.data.vertices[old].normal).normalized()*.0012;data.vertices[new].co=body.matrix_world.inverted()@world
data.materials.append(reinforcement)
uv=data.uv_layers.new(name='GlovePanelUV')
for newpoly,oldpoly in zip(data.polygons,faces):
 for newloop,oldloop in zip(newpoly.loop_indices,oldpoly.loop_indices):uv.data[newloop].uv=body.data.uv_layers.active.data[oldloop].uv
for p in data.polygons:p.use_smooth=True
mod=pads.modifiers.new('Panel skin','ARMATURE');mod.object=rig
print('GLOVE_PANELS',len(faces))
# No vertex projection against a box: preserve the original hand anatomy.
# Animate support hand through original IK, then bake the deform skeleton.
rig.animation_data_create();action=bpy.data.actions.new('SupportReload');rig.animation_data.action=action
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=0;scene.frame_end=30
control=rig.pose.bones['hand.L.control'];rest=control.matrix.copy()
for frame,travel in [(0,0),(3.6,0),(12,1),(18,1),(27,0),(30,0)]:
 scene.frame_set(int(frame),subframe=frame%1);mat=rest.copy();mat.translation=rest.translation+rig.matrix_world.inverted().to_3x3()@Vector((-.025*travel,-.005*travel,-.13*travel));control.matrix=mat
 control.keyframe_insert(data_path='location',frame=frame)
for curve in action.fcurves:
 for key in curve.keyframe_points:key.handle_left_type=key.handle_right_type='AUTO_CLAMPED'
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.nla.bake(frame_start=0,frame_end=30,step=1,only_selected=False,visual_keying=True,clear_constraints=True,use_current_action=True,bake_types={'POSE'})
rig.animation_data.action.name='SupportReload'
for a in list(bpy.data.actions):
 if a!=rig.animation_data.action:bpy.data.actions.remove(a)
scene.frame_set(0);export(out/'viewmodels/operator-arms.glb')
