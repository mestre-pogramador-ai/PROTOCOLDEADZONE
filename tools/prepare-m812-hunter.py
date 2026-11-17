"""Licensed Rosswet source -> normalized, in-place hunter with skinned LOD.
The Pixelhouse worker is prepared by prepare-m812-worker.py instead.
Run in Blender 4.3, -- <source-dir>. No new AI/damage/physics behaviour.
"""
import bpy,sys,math
import numpy as np
from pathlib import Path
from mathutils import Matrix,Vector
src=Path(sys.argv[sys.argv.index('--')+1]);out=Path('public/assets/models/characters')
def pbr(name,diffuse,normal=None,specular=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.84
 i=bpy.data.images.load(str(diffuse),check_existing=True);t=n.new('ShaderNodeTexImage');t.image=i;l.new(t.outputs['Color'],p.inputs['Base Color'])
 if normal:
  i=bpy.data.images.load(str(normal),check_existing=True);i.colorspace_settings.name='Non-Color';t=n.new('ShaderNodeTexImage');t.image=i
  b=n.new('ShaderNodeNormalMap');b.inputs['Strength'].default_value=.65;l.new(t.outputs['Color'],b.inputs['Color']);l.new(b.outputs['Normal'],p.inputs['Normal'])
 if specular:
  i=bpy.data.images.load(str(specular),check_existing=True);size=tuple(i.size);a=np.array(i.pixels[:],dtype=np.float32).reshape(size[1],size[0],4)
  rough=np.clip(1-a[:,:,:3].mean(axis=2)*.65,.42,.94);a[:,:,:3]=rough[:,:,None]
  texture=bpy.data.images.new(name+' roughness',width=size[0],height=size[1],alpha=False);texture.colorspace_settings.name='Non-Color';texture.pixels.foreach_set(a.ravel())
  t=n.new('ShaderNodeTexImage');t.image=texture;l.new(t.outputs['Color'],p.inputs['Roughness'])
 return m
def action_for(rig):
 if rig.animation_data.action:return rig.animation_data.action
 return next(s.action for t in rig.animation_data.nla_tracks for s in t.strips)
def evaluated_vertices(body):
 e=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh();vs=[e.matrix_world@v.co for v in m.vertices];e.to_mesh_clear();return vs
def export(path,rig,body,actions,head,top,rootbone,width=1):
 # Preserve vertical animation while removing planar motion in world space.
 rig.animation_data.action=actions[0];bpy.context.scene.frame_set(int(actions[0].frame_range[0]));bpy.context.view_layer.update()
 basis=rig.matrix_world.to_3x3()@rig.data.bones[rootbone].matrix_local.to_3x3();inverse=basis.inverted()
 reference=basis@rig.pose.bones[rootbone].location
 for action in actions:
  curves={c.array_index:c for c in action.fcurves if c.data_path==f'pose.bones["{rootbone}"].location'}
  if len(curves)!=3:continue
  samples=[]
  for frame in range(int(action.frame_range[0]),int(action.frame_range[1])+1):
   point=basis@Vector([curves[i].evaluate(frame) for i in range(3)])
   if action.name!='Death':point.x=reference.x;point.y=reference.y
   samples.append((frame,inverse@point))
  for axis,c in curves.items():
   c.keyframe_points.clear()
   for frame,point in samples:c.keyframe_points.insert(frame,point[axis],options={'FAST'})
   c.update()
 if rig.animation_data:
  rig.animation_data.action=actions[0]
  for t in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(t)
 bpy.context.scene.frame_set(int(actions[0].frame_range[0]));bpy.context.view_layer.update()
 vertices=evaluated_vertices(body);floor=min(v.z for v in vertices)
 h=(rig.matrix_world@rig.pose.bones[head].head+rig.matrix_world@rig.pose.bones[top].head)*.5
 factor=1.78/(h.z-floor)
 transform=Matrix.Translation((-h.x*factor,-h.y*factor,-floor*factor))@Matrix.Scale(factor,4)
 worlds={o:o.matrix_world.copy() for o in [rig,body]}
 # Keep the skinned mesh under its animated armature. Sibling parenting breaks
 # imported FBX object animation and the exporter's bind-space assumptions.
 body.parent=rig;body.matrix_parent_inverse=Matrix.Identity(4)
 body.matrix_basis=worlds[rig].inverted()@worlds[body]
 root=bpy.data.objects.new('InfectedAsset',None);bpy.context.collection.objects.link(root);root.matrix_world=Matrix.Diagonal((width,1,1,1))@transform
 rig.parent=root;rig.matrix_parent_inverse=Matrix.Identity(4);rig.matrix_basis=worlds[rig]
 # Standardized bone names for presentation tests/retarget, remap action paths too.
 for old,new in [(head,'Head'),(top,'HeadTop_End'),(rootbone,'Hips')]:
  rig.data.bones[old].name=new
  for o in bpy.data.objects:
   if o.type=='MESH' and old in o.vertex_groups:o.vertex_groups[old].name=new
  for a in actions:
   for c in a.fcurves:c.data_path=c.data_path.replace('"'+old+'"','"'+new+'"')
 body.name='LOD0';body.data.name='Detailed humanoid'
 for p in body.data.polygons:p.use_smooth=True
 low=body.copy();low.data=body.data.copy();bpy.context.collection.objects.link(low);low.name='LOD1';low.parent=body.parent;low.matrix_basis=body.matrix_basis.copy()
 bpy.context.view_layer.objects.active=low;mod=low.modifiers.new('Distance LOD','DECIMATE');mod.ratio=.5
 while low.modifiers.find(mod.name)>0:bpy.ops.object.modifier_move_up(modifier=mod.name)
 bpy.ops.object.modifier_apply(modifier=mod.name)
 rig.animation_data.action=actions[0]
 for a in list(bpy.data.actions):
  if a not in actions:bpy.data.actions.remove(a)
 for a in actions:a.use_fake_user=True
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_cameras=False,export_lights=False)
 print('EXPORTED',path,'scale',factor,'head',list(h),'floor',floor)

bpy.ops.wm.open_mainfile(filepath=str(src/'zombie-thin/new_thin_zombie.blend'),load_ui=False,use_scripts=False)
if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');body=next(o for o in bpy.data.objects if o.type=='MESH' and len(o.vertex_groups))
for o in list(bpy.data.objects):
 if o not in [rig,body]:bpy.data.objects.remove(o,do_unlink=True)
chosen={'idle':'Idle','walk':'Walk','run':'Run','attack1_l':'Attack','hurt':'Hurt','dead1':'Death'};actions=[]
for old,new in chosen.items():a=bpy.data.actions[old];a.name=new;actions.append(a)
material=pbr('Deteriorated tissue',src/'zombie-thin/new_thin_zombie.png');body.data.materials.clear();body.data.materials.append(material)
for p in body.data.polygons:p.material_index=0
# Tip marker preserves the actual source head direction; it is not a hitbox.
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
head=rig.data.edit_bones['head'];tip=rig.data.edit_bones.new('HeadTip');tip.head=head.tail;tip.tail=head.tail+Vector((0,0,.02));tip.parent=head
bpy.ops.object.mode_set(mode='OBJECT')
export(out/'infected-hunter.glb',rig,body,actions,'head','HeadTip','hips')
