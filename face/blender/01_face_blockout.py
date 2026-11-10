# Blender 4.x — Face blockout starter
# Run: Blender > Scripting > Open > Run Script
# Put the three reference JPG files in the repository root or update REF_DIR.
import bpy, math, os
from mathutils import Vector

# ---------- CONFIG ----------
REF_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REFS = {
    "Front": "20261110_221139.jpg",
    "ThreeQuarter": "20261110_221314.jpg",
    "Profile": "20261110_221347.jpg",
}
# Proportions are an initial neutral blockout, not a finished likeness.
# Units are arbitrary; face height is roughly 2.0.
# ----------------------------

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def make_mesh(name, verts, faces, material=None):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.clear()
    if material: mesh.materials.append(material)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj

def mat(name, color, rough=0.72):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.roughness = rough
    return m

skin = mat("Blockout | neutral clay", (0.34, 0.22, 0.17))
dark = mat("Blockout | feature guide", (0.075, 0.055, 0.05))

# Head surface built from horizontal elliptical sections.
# Front faces toward -Y; top is +Z.
rings = [
    (-1.02, 0.08, 0.12), (-0.94, 0.28, 0.34),
    (-0.78, 0.43, 0.47), (-0.53, 0.51, 0.53),
    (-0.22, 0.57, 0.56), (0.12, 0.59, 0.56),
    (0.43, 0.56, 0.53), (0.68, 0.48, 0.46),
    (0.87, 0.32, 0.34), (0.98, 0.08, 0.12)
]
N = 48
verts, faces = [], []
for z, rx, ry in rings:
    for i in range(N):
        a = 2*math.pi*i/N
        verts.append((rx*math.cos(a), ry*math.sin(a), z))
for r in range(len(rings)-1):
    for i in range(N):
        a = r*N+i
        b = r*N+(i+1)%N
        c = (r+1)*N+(i+1)%N
        d = (r+1)*N+i
        faces.append((a,b,c,d))
faces.append(tuple(range(N-1,-1,-1)))
faces.append(tuple((len(rings)-1)*N+i for i in range(N)))
head = make_mesh("HEAD_BLOCKOUT | refine against photos", verts, faces, skin)
for p in head.data.polygons: p.use_smooth = True
sub = head.modifiers.new("Surface smoothing", "SUBSURF")
sub.levels = 2
head["NOTE"] = "Starting volume only. Adjust silhouette and facial proportions against all three reference views."

def uv_sphere(name, loc, scale, material=skin, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth = True
    return o

# Nose bridge and tip, intentionally separate for early proportion edits.
nose = uv_sphere("NOSE_BLOCKOUT | bridge", (0, -0.535, -0.02), (0.105, 0.14, 0.27))
tip = uv_sphere("NOSE_BLOCKOUT | tip", (0, -0.65, -0.22), (0.145, 0.13, 0.105))
# Ear volumes.
for side, label in [(-1,"L"),(1,"R")]:
    uv_sphere("EAR_BLOCKOUT_"+label, (side*0.565, 0.015, -0.02), (0.115,0.14,0.235))
# Eye placement guides, not final eyeballs or eyelids.
for side, label in [(-1,"L"),(1,"R")]:
    uv_sphere("EYE_GUIDE_"+label, (side*0.225,-0.505,0.19), (0.105,0.055,0.075), dark)
# Mouth volume guide.
uv_sphere("MOUTH_GUIDE", (0,-0.535,-0.48), (0.19,0.045,0.055), dark)

# Reference images as image empties, visible in orthographic views.
def add_reference(key, filename, loc, rot, display_size):
    path = os.path.join(REF_DIR, filename)
    if not os.path.exists(path):
        print("Reference missing:", path)
        return
    try:
        img = bpy.data.images.load(path, check_existing=True)
        bpy.ops.object.empty_add(type='IMAGE', location=loc, rotation=rot)
        ref = bpy.context.object
        ref.name = "REFERENCE_" + key
        ref.data = img
        ref.empty_display_size = display_size
        ref.empty_image_side = 'FRONT'
        ref.color[3] = 0.75
        ref.empty_image_depth = 'BACK'
    except Exception as e:
        print("Could not load reference", key, e)

# Front image plane sits behind the head; profile/three-quarter can be toggled in Outliner.
add_reference("FRONT", REFS["Front"], (0, 0.72, 0), (math.radians(90),0,0), 2.0)
# Side reference arranged on the right side for right orthographic view.
add_reference("PROFILE", REFS["Profile"], (0.78, 0, 0), (math.radians(90),0,math.radians(90)), 2.0)
# Three-quarter is kept as an image reference object for manual positioning.
add_reference("THREE_QUARTER", REFS["ThreeQuarter"], (-0.78, 0, 0), (math.radians(90),0,math.radians(-90)), 2.0)

# Camera and lighting for a quick clay preview.
bpy.ops.object.light_add(type='AREA', location=(2.8,-4.0,3.2))
key = bpy.context.object; key.name="Preview_Key"; key.data.energy=450; key.data.shape='DISK'; key.data.size=4
bpy.ops.object.camera_add(location=(2.8,-5.8,0.45))
cam = bpy.context.object; cam.name="Preview_Camera"
direction = Vector((0,-0.02,0)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z','Y').to_euler()
cam.data.lens = 55
scene = bpy.context.scene; scene.camera = cam
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 900; scene.render.resolution_y = 900; scene.render.resolution_percentage = 100
scene.world.color = (0.12,0.12,0.12)

# Organize scene.
for name in ["01_HEAD_BLOCKOUT","02_FEATURE_GUIDES","03_PHOTO_REFERENCES","04_PREVIEW"]:
    col = bpy.data.collections.new(name); scene.collection.children.link(col)
for obj in list(scene.objects):
    if obj.type == 'MESH':
        target = "01_HEAD_BLOCKOUT" if obj == head else "02_FEATURE_GUIDES"
    elif obj.type == 'EMPTY':
        target = "03_PHOTO_REFERENCES"
    else:
        target = "04_PREVIEW"
    for c in list(obj.users_collection): c.objects.unlink(obj)
    scene.collection[target].objects.link(obj)

bpy.ops.object.select_all(action='DESELECT')
head.select_set(True); bpy.context.view_layer.objects.active = head
print("Face blockout scene created. This is a proportion-study base, not a final likeness.")
