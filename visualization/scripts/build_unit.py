"""Build, verify and render one Ravel Storage unit in Blender (bpy).

Usage (Blender's Python, e.g. `pip install bpy`):
    python -I build_unit.py --unit U01 --out ../output/U01 [--samples 256] [--percent 100]

Coordinate system (meters, real world):
    x = across the unit (left -> right as seen from the corridor)
    y = into the unit (y = 0 is the inner face of the front wall)
    z = up (z = 0 is the floor)
Interior clear space of the unit = x in [-W/2, W/2], y in [0, D], z in [0, wall height].
"""
import argparse
import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import materials as M  # noqa: E402

ROOT = os.path.dirname(HERE)


def load(name):
    with open(os.path.join(ROOT, "config", name), encoding="utf-8") as f:
        return json.load(f)


# ----------------------------------------------------------------------------- helpers
def box(name, x0, x1, y0, y1, z0, z1, mat, role="structure", parent=None):
    """Axis aligned box with exact vertex coordinates (no scaling tricks)."""
    xs, ys, zs = sorted((x0, x1)), sorted((y0, y1)), sorted((z0, z1))
    v = [(xs[i], ys[j], zs[k]) for i in (0, 1) for j in (0, 1) for k in (0, 1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.update()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    ob["role"] = role
    bpy.context.scene.collection.objects.link(ob)
    if parent is not None:
        ob.parent = parent
    return ob


def cyl(name, x, y, z0, z1, r, mat, role="hardware", parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=r, depth=z1 - z0,
                                        location=(x, y, (z0 + z1) / 2))
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    ob["role"] = role
    if parent is not None:
        ob.parent = parent
    return ob


def rivet_mesh(mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.0045)
    ob = bpy.context.active_object
    ob.scale = (1, 0.45, 1)
    bpy.ops.object.transform_apply(scale=True)
    me = ob.data
    me.materials.append(mat)
    bpy.data.objects.remove(ob)
    return me


def place_rivet(me, x, y, z, rot_z=0.0):
    ob = bpy.data.objects.new("rivet", me)
    ob.location = (x, y, z)
    ob.rotation_euler = (0, 0, rot_z)
    ob["role"] = "hardware"
    bpy.context.scene.collection.objects.link(ob)
    return ob


def world_bbox(ob):
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return ([min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)])


# ----------------------------------------------------------------------------- door
def build_door(cx, fac, mats, t, open_deg, is_target, rivet_me):
    """Door frame + leaf for a unit whose door is centred at x = cx.
    Leaf hinges on the right jamb and swings outward into the corridor."""
    d = fac["door"]
    ow, oh, fp = d["clear_width_m"], d["clear_height_m"], d["frame_profile_width_m"]
    g, steel, panel, brass = mats["galv"], mats["steel"], mats["panel"], mats["brass"]
    yf0, yf1 = -t - 0.015, 0.015               # frame depth (wraps the panel edge)
    tag = "U" if is_target else f"N{cx:+.2f}"
    box(f"{tag}_jamb_L", cx - ow / 2 - fp, cx - ow / 2, yf0, yf1, 0, oh + fp, g, "trim")
    box(f"{tag}_jamb_R", cx + ow / 2, cx + ow / 2 + fp, yf0, yf1, 0, oh + fp, g, "trim")
    box(f"{tag}_header", cx - ow / 2, cx + ow / 2, yf0, yf1, oh, oh + fp, g, "trim")
    for side in (-1, 1):
        x = cx + side * (ow / 2 + fp / 2)
        z = 0.12
        while z < oh:
            place_rivet(rivet_me, x, yf0 - 0.0005, z)
            z += 0.30
    # ---- leaf (built closed in local coordinates around the hinge axis, then rotated)
    hx, hy = cx + ow / 2 + 0.012, yf0 - 0.025          # hinge axis position
    hinge = bpy.data.objects.new(f"{tag}_hinge_axis", None)
    bpy.context.scene.collection.objects.link(hinge)
    hinge.location = (hx, hy, 0)
    lw, lh, lt = ow + 0.03, oh + 0.012, 0.04
    lx0, lx1 = -lw, 0.0                                 # leaf extends to the left of the hinge
    ly0, ly1 = -lt / 2, lt / 2
    box(f"{tag}_leaf", lx0, lx1, ly0, ly1, 0.006, lh, panel, "door", hinge)
    s = 0.045                                            # galvanized edge frame on the face
    for nm, a in (("L", (lx0, lx0 + s, 0.006, lh)), ("R", (lx1 - s, lx1, 0.006, lh)),
                  ("B", (lx0 + s, lx1 - s, 0.006, 0.006 + s)), ("T", (lx0 + s, lx1 - s, lh - s, lh))):
        box(f"{tag}_leafedge_{nm}", a[0], a[1], ly0 - 0.0015, ly0, a[2], a[3], g, "door", hinge)
    for i, z in enumerate((0.22, oh / 2, oh - 0.22)):    # stainless butt hinges
        box(f"{tag}_hingeplate_{i}", -0.05, 0.03, ly0 - 0.003, ly0 - 0.0015, z - 0.05, z + 0.05,
            steel, "hardware", hinge)
        cyl(f"{tag}_knuckle_{i}", 0.0, ly0 - 0.006, z - 0.05, z + 0.05, 0.0065, steel, "hardware", hinge)
    zl = 1.10                                             # hasp + padlock height
    box(f"{tag}_hasp", lx0 + 0.01, lx0 + 0.11, ly0 - 0.004, ly0 - 0.0015, zl - 0.03, zl + 0.03,
        steel, "hardware", hinge)
    hinge.rotation_euler = (0, 0, math.radians(open_deg))
    # staple on the left jamb (stays on the frame)
    box(f"{tag}_staple", cx - ow / 2 - fp - 0.012, cx - ow / 2 - fp + 0.03, yf0 - 0.012, yf0,
        zl - 0.035, zl + 0.035, steel, "hardware")
    if open_deg < 1:
        bx = cx - ow / 2 - fp + 0.0
        box(f"{tag}_padlock", bx - 0.025, bx + 0.025, yf0 - 0.06, yf0 - 0.035, zl - 0.10, zl - 0.045,
            brass, "hardware")
        box(f"{tag}_shackle", bx - 0.015, bx + 0.015, yf0 - 0.052, yf0 - 0.043, zl - 0.045, zl + 0.0,
            steel, "hardware")


# ----------------------------------------------------------------------------- scene
def build(unit, fac, cam_cfg):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    mats = M.build_all(fac["colors_srgb"])
    rivet_me = rivet_mesh(mats["galv"])

    W, D = unit["width_m"], unit["depth_m"]
    H = unit["wall_height_m"]
    t = fac["wall_panel_thickness_m"]
    cap = fac["top_cap_height_m"]
    Hp = H - cap
    d = fac["door"]
    fo = d["clear_width_m"] / 2 + d["frame_profile_width_m"]    # frame outer half-width
    fh = d["clear_height_m"] + d["frame_profile_width_m"]       # frame outer height
    pitch = W + t
    n_side = 2                                                  # neighbours on each side
    xs = [i * pitch for i in range(-n_side, n_side + 1)]
    g = mats["galv"]

    # floor (concrete slab, top at z = 0)
    box("floor_slab", -12, 12, -8, 14, -0.15, 0, mats["concrete"], "structure")

    # side walls (shared between neighbouring units) and back walls
    for k in range(-n_side, n_side + 2):
        xw = -W / 2 + k * pitch                                 # inner face of the right wall of unit k-1
        name = "wall_left" if k == 0 else ("wall_right" if k == 1 else f"wall_side_{k}")
        box(name, xw - t, xw, 0, D, 0, Hp, mats["panel"])
        box(f"cap_side_{k}", xw - t - 0.002, xw + 0.002, 0.0025, D - 0.0025, Hp, H, g, "trim")
    x_min, x_max = -W / 2 - n_side * pitch - t, W / 2 + n_side * pitch + t
    box("wall_back", x_min, x_max, D, D + t, 0, Hp, mats["panel"])
    box("cap_back", x_min, x_max, D - 0.002, D + t + 0.002, Hp, H, g, "trim")

    # front façade with one door opening per unit
    edges = [x_min] + sum([[cx - fo, cx + fo] for cx in xs], []) + [x_max]
    for i in range(0, len(edges), 2):
        box(f"facade_{i // 2}", edges[i], edges[i + 1], -t, 0, 0, Hp, mats["panel"])
    for i, cx in enumerate(xs):
        box(f"facade_over_{i}", cx - fo, cx + fo, -t, 0, fh, Hp, mats["panel"])
    box("cap_front", x_min, x_max, -t - 0.002, 0.002, Hp, H, g, "trim")

    for cx in xs:
        target = abs(cx) < 1e-9
        build_door(cx, fac, mats, t, d["open_angle_deg"] if target else 0.0, target, rivet_me)

    # galvanized interior trims of the target unit (as in the real photo)
    tr, sk, leg = fac["trim"]["galvanized_thickness_m"], fac["trim"]["skirting_height_m"], fac["trim"]["corner_angle_leg_m"]
    xl, xr = -W / 2, W / 2
    zc0, zc1 = sk + 0.0005, Hp - 0.0455                         # corner angles sit between skirting and top track
    for cx_, cy_, sx, sy in ((xl, D, 1, -1), (xr, D, -1, -1)):
        box(f"corner_a_{cx_:+.2f}", cx_, cx_ + sx * tr, cy_ - 0.0005 * 0 + sy * tr, cy_ + sy * leg, zc0, zc1, g, "trim")
        box(f"corner_b_{cx_:+.2f}", cx_ + sx * tr, cx_ + sx * leg, cy_, cy_ + sy * tr, zc0, zc1, g, "trim")
    box("skirt_back", xl + tr, xr - tr, D - tr, D, 0, sk, g, "trim")
    box("skirt_left", xl, xl + tr, 0.016, D, 0, sk, g, "trim")
    box("skirt_right", xr - tr, xr, 0.016, D, 0, sk, g, "trim")
    box("toptrack_back", xl + tr, xr - tr, D - tr, D, Hp - 0.045, Hp, g, "trim")
    box("toptrack_left", xl, xl + tr, 0.016, D, Hp - 0.045, Hp, g, "trim")
    box("toptrack_right", xr - tr, xr, 0.016, D, Hp - 0.045, Hp, g, "trim")
    for x in (xl + 0.004, xr - 0.004):                              # rivets on corner angles
        for z in [0.15 + 0.35 * i for i in range(int(Hp / 0.35))]:
            place_rivet(rivet_me, x + (0.002 if x < 0 else -0.002), D - leg / 2 - 0.004, z, math.pi / 2)

    # warehouse shell (background only, never measured)
    box("wh_back", -12, 12, 13, 13.3, 0, 8, mats["warehouse"], "background")
    box("wh_left", -12.3, -12, -8, 14, 0, 8, mats["warehouse"], "background")
    box("wh_right", 12, 12.3, -8, 14, 0, 8, mats["warehouse"], "background")
    box("wh_front", -12, 12, -8.3, -8, 0, 8, mats["warehouse"], "background")
    box("wh_roof", -12.3, 12.3, -8.3, 14, 8, 8.2, mats["warehouse"], "background")
    for yb in range(-6, 14, 3):
        box(f"wh_beam_{yb}", -12, 12, yb, yb + 0.2, 7.5, 7.9, mats["beam"], "background")

    # lighting: corridor ceiling strips (front-left of the unit, like the photo) + high-bay fill
    for i, x in enumerate((-3.0, -0.6, 1.8, 4.2)):
        bpy.ops.object.light_add(type="AREA", location=(x, -1.0, 3.6))
        L = bpy.context.active_object
        L.name = f"corridor_light_{i}"
        L.data.shape = "RECTANGLE"
        L.data.size, L.data.size_y = (0.6, 0.04) if i == 1 else (1.2, 0.08)
        L.data.energy = 120 if i == 1 else 45
        L.data.color = (1.0, 0.97, 0.92)
        L["role"] = "light"
    for i, (x, y) in enumerate(((-4, 1), (4, 1), (0, 6), (-4, 9), (4, 9))):
        bpy.ops.object.light_add(type="AREA", location=(x, y, 7.2))
        L = bpy.context.active_object
        L.name = f"highbay_{i}"
        L.data.shape = "DISK"
        L.data.size = 0.6
        L.data.energy = 250
        L["role"] = "light"
    world = bpy.data.worlds.new("RS_World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.025, 0.026, 0.028, 1)
    sc.world = world

    # ---------------------------------------------------------------- camera
    h, dist = cam_cfg["eye_height_m"], cam_cfg["distance_from_facade_m"]
    f = cam_cfg["focal_length_mm_ff_equiv"]
    cw, ch = cam_cfg["clean_width_px"], cam_cfg["clean_height_px"]
    vrange_clean = 36.0 / f                                   # slope range of the long (vertical) side
    px_per_slope = ch / vrange_clean
    s_bot = -h / dist - cam_cfg["floor_margin_slope"]          # corridor floor at the façade is in view
    s_top_clean = s_bot + vrange_clean
    D_back = dist + t + D
    s_top_ann = (unit["allowed_height_m"] + cam_cfg["annotated_extra_top_m_above_allowed"] - h) / D_back
    tall_h = max(ch, int(math.ceil((s_top_ann - s_bot) * px_per_slope)))
    s_top_tall = s_bot + tall_h / px_per_slope
    vrange_tall = s_top_tall - s_bot
    cam_data = bpy.data.cameras.new("RS_Camera")
    cam_data.lens = f
    cam_data.sensor_fit = "VERTICAL"
    cam_data.sensor_height = vrange_tall * f
    cam_data.shift_y = ((s_top_tall + s_bot) / 2) / vrange_tall
    cam = bpy.data.objects.new("RS_Camera", cam_data)
    cam.location = (cam_cfg["lateral_offset_m"], -t - dist, h)
    cam.rotation_euler = (math.radians(90), 0, 0)               # level: verticals stay vertical
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = cw, tall_h

    camera_info = {
        "position_m": list(cam.location), "level": True, "focal_mm_ff_equiv": f,
        "vertical_fov_clean_deg": math.degrees(2 * math.atan(vrange_clean / 2)),
        "horizontal_fov_deg": math.degrees(2 * math.atan(vrange_clean * cw / ch / 2)),
        "tall_height_px": tall_h, "clean_crop_rows": [tall_h - ch, tall_h],
        "slope_bottom": s_bot, "slope_top_clean": s_top_clean, "slope_top_tall": s_top_tall,
    }
    return {"W": W, "D": D, "H": H, "t": t, "camera": camera_info}


# ----------------------------------------------------------------------------- QA
def verify(unit, geo):
    ob = bpy.data.objects
    tol = 1e-6
    left = world_bbox(ob["wall_left"]); right = world_bbox(ob["wall_right"])
    back = world_bbox(ob["wall_back"])
    front_faces = [world_bbox(o)[1][1] for o in ob if o.name.startswith("facade_")]
    caps = [world_bbox(o)[1][2] for o in ob if o.name.startswith("cap_")]
    width = right[0][0] - left[1][0]
    depth = back[0][1] - max(front_faces)
    wall_h = max(caps)
    interior = (-geo["W"] / 2 + 0.02, geo["W"] / 2 - 0.02, 0.02, geo["D"] - 0.02, 0.02, geo["H"])
    intruders = []
    for o in ob:
        if o.type != "MESH" or o.get("role") in ("structure", "trim", "background"):
            continue
        lo, hi = world_bbox(o)
        if (lo[0] < interior[1] and hi[0] > interior[0] and lo[1] < interior[3] and hi[1] > interior[2]
                and lo[2] < interior[5] and hi[2] > interior[4]):
            intruders.append(o.name)
    checks = {
        "width_m": round(width, 6), "depth_m": round(depth, 6), "wall_height_m": round(wall_h, 6),
        "area_m2": round(width * depth, 6),
        "width_ok": abs(width - unit["width_m"]) < tol,
        "depth_ok": abs(depth - unit["depth_m"]) < tol,
        "wall_height_ok": abs(wall_h - unit["wall_height_m"]) < tol,
        "area_ok": abs(width * depth - unit["area_m2"]) < tol,
        "square_ok": (abs(width - depth) < tol) if abs(unit["width_m"] - unit["depth_m"]) < tol else None,
        "empty_ok": len(intruders) == 0, "objects_inside_unit": intruders,
    }
    checks["all_ok"] = all(v for k, v in checks.items() if k.endswith("_ok") and v is not None)
    return checks


def annotation_points(unit, geo):
    """3D anchor points of the measurement arrows, projected to pixels of the tall frame."""
    sc = bpy.context.scene
    W, D, A = geo["W"], geo["D"], unit["allowed_height_m"]
    z = 0.004
    pts3 = {
        "width_a": (-W / 2, D - 0.002, 0.40), "width_b": (W / 2, D - 0.002, 0.40),
        "depth_a": (W / 2 - 0.16, 0.0, z), "depth_b": (W / 2 - 0.16, D, z),
        "height_a": (-W / 2 + 0.06, D - 0.06, 0.0), "height_b": (-W / 2 + 0.06, D - 0.06, A),
        "wall_top_ref": (-W / 2 + 0.06, D - 0.06, geo["H"]),
    }
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    out = {}
    for k, p in pts3.items():
        v = world_to_camera_view(sc, sc.camera, Vector(p))
        out[k] = {"xyz_m": list(p), "px": [v.x * rx, (1 - v.y) * ry], "depth": v.z}
    return out


def render(path, samples, percent):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.cycles.glossy_bounces = 3
    sc.cycles.transmission_bounces = 0
    sc.cycles.adaptive_threshold = 0.02
    sc.render.resolution_percentage = percent
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = 0.35
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--unit", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--samples", type=int, default=256)
    ap.add_argument("--percent", type=int, default=100)
    ap.add_argument("--no-render", action="store_true")
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
    unit = next(u for u in load("units.json")["units"] if u["id"] == a.unit)
    fac, cam_cfg = load("facility.json"), load("camera.json")
    os.makedirs(a.out, exist_ok=True)

    geo = build(unit, fac, cam_cfg)
    bpy.context.view_layer.update()          # make world matrices (camera, rotated door) current
    qa = verify(unit, geo)
    ann = annotation_points(unit, geo)
    report = {"unit": unit, "geometry_check": qa, "camera": geo["camera"], "annotation_points": ann}
    with open(os.path.join(a.out, "verification.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=2)
    print("QA:", json.dumps(qa))
    if not qa["all_ok"]:
        raise SystemExit("Geometry verification FAILED - not rendering.")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(a.out, f"{a.unit}.blend"), compress=True)
    if not a.no_render:
        render(os.path.join(a.out, "render_tall.png"), a.samples, a.percent)


if __name__ == "__main__":
    main()
