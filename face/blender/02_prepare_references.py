# ORBE & ONIX | Prepare face photo references
# Blender 4.5 LTS
# Save your .blend file in the project folder first.
# Put the three JPGs in a subfolder named "references" beside the .blend file.
# Then run this script from Blender > Scripting > Run Script.

import bpy
import os
import math

# Photos expected in: <blend folder>/references/
PHOTO_FILES = {
    "FRONT": "20261110_221139.jpg",
    "THREE_QUARTER": "20261110_221314.jpg",
    "PROFILE": "20261110_221347.jpg",
}

if not bpy.data.filepath:
    raise RuntimeError("Save the Blender project first (File > Save As), then run this script again.")

project_dir = os.path.dirname(bpy.data.filepath)
reference_dir = os.path.join(project_dir, "references")

missing = [name for name in PHOTO_FILES.values()
           if not os.path.isfile(os.path.join(reference_dir, name))]
if missing:
    raise RuntimeError(
        "Photos missing in: " + reference_dir + "\nMissing: " + ", ".join(missing) +
        "\nCreate the 'references' folder and copy the three JPG files into it."
    )

# Create or reuse a dedicated collection. Do not delete the user's other objects.
collection_name = "03_PHOTO_REFERENCES"
refs_collection = bpy.data.collections.get(collection_name)
if refs_collection is None:
    refs_collection = bpy.data.collections.new(collection_name)
    bpy.context.scene.collection.children.link(refs_collection)

# Remove only references created by this script, so rerunning is safe.
for obj in list(refs_collection.objects):
    if obj.name.startswith("OO_REF_"):
        bpy.data.objects.remove(obj, do_unlink=True)

def add_ref(label, filename, location, rotation, size):
    path = os.path.join(reference_dir, filename)
    image = bpy.data.images.load(path, check_existing=True)
    image.pack()
    empty = bpy.data.objects.new("OO_REF_" + label, None)
    empty.empty_display_type = 'IMAGE'
    empty.data = image
    empty.empty_display_size = size
    empty.empty_image_depth = 'BACK'
    empty.empty_image_side = 'DOUBLE_SIDED'
    empty.color[3] = 0.72
    empty.location = location
    empty.rotation_euler = rotation
    refs_collection.objects.link(empty)
    empty.hide_select = False
    return empty

# Blender front view looks toward -Y. Image plane is parallel to X/Z.
front = add_ref("FRONT", PHOTO_FILES["FRONT"],
                (0.0, 0.78, 0.0), (math.radians(90), 0, 0), 2.0)

# Right-side orthographic view: image plane parallel to Y/Z.
profile = add_ref("PROFILE", PHOTO_FILES["PROFILE"],
                  (0.78, 0.0, 0.0), (math.radians(90), 0, math.radians(90)), 2.0)

# Three-quarter reference is kept off to the left, available to toggle in Outliner.
threeq = add_ref("THREE_QUARTER", PHOTO_FILES["THREE_QUARTER"],
                 (-1.15, 0.0, 0.0), (math.radians(90), 0, math.radians(-90)), 2.0)

# Set a useful front orthographic viewport.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            space.region_3d.view_perspective = 'ORTHO'
            space.region_3d.view_rotation = (math.sqrt(0.5), math.sqrt(0.5), 0, 0)
            space.region_3d.view_location = (0, 0, 0)
            space.region_3d.view_distance = 3.2
            space.overlay.show_floor = True
            space.shading.type = 'SOLID'

# Select the front reference for easy adjustment if needed.
bpy.ops.object.select_all(action='DESELECT')
front.select_set(True)
bpy.context.view_layer.objects.active = front

print("ORBE & ONIX: three photo references loaded, double-sided, and packed.")
print("Front: Numpad 1 | Profile: Numpad 3 | Top: Numpad 7")
print("Toggle OO_REF_THREE_QUARTER in the Outliner when needed.")
