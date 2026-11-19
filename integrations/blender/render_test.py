# Headless Blender test: storage-box scene, still PNG + 48-frame animation.
# Usage: blender -b -P render_test.py -- <out_dir>
import bpy, sys, math, os
out = sys.argv[sys.argv.index("--")+1] if "--" in sys.argv else "/tmp"
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
sc.render.resolution_x, sc.render.resolution_y = 1080, 1080
sc.render.resolution_percentage = 50
def mat(name, rgb, rough=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    return m
bpy.ops.mesh.primitive_plane_add(size=20); bpy.context.object.data.materials.append(mat("floor",(0.9,0.9,0.92),0.8))
boxes=[]
for i,(x,y,z) in enumerate([(-1.2,0,0.5),(0,0,0.5),(1.2,0,0.5),(-0.6,0,1.5),(0.6,0,1.5),(0,0,2.5)]):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x,y,z)); o=bpy.context.object
    bpy.ops.object.modifier_add(type='BEVEL'); o.modifiers["Bevel"].width=0.05
    o.data.materials.append(mat(f"box{i}",(0.55,0.38,0.2) if i%2 else (0.0,0.35,0.6),0.6)); boxes.append(o)
bpy.ops.object.light_add(type='AREA', location=(3,-4,6)); L=bpy.context.object; L.data.energy=800; L.data.size=5
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[1].default_value=0.6
bpy.ops.object.empty_add(location=(0,0,1.2)); tgt=bpy.context.object
bpy.ops.object.camera_add(); cam=bpy.context.object; sc.camera=cam
c=cam.constraints.new('TRACK_TO'); c.target=tgt; c.track_axis='TRACK_NEGATIVE_Z'; c.up_axis='UP_Y'
bpy.ops.object.empty_add(location=(0,0,0)); rig=bpy.context.object; cam.parent=rig; cam.location=(0,-7,3)
sc.frame_start, sc.frame_end = 1, 48
rig.rotation_euler=(0,0,0); rig.keyframe_insert("rotation_euler", frame=1)
rig.rotation_euler=(0,0,math.radians(90)); rig.keyframe_insert("rotation_euler", frame=48)
sc.frame_set(1); sc.render.image_settings.file_format='PNG'
sc.render.filepath=os.path.join(out,"blender_still.png"); bpy.ops.render.render(write_still=True)
sc.cycles.samples=8; sc.render.filepath=os.path.join(out,"frames","f_"); bpy.ops.render.render(animation=True)
print("BLENDER_TEST_OK")
