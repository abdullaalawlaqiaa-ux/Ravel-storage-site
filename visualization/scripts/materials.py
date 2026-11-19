"""Physically based materials for Ravel Storage units (Blender / Cycles).

All materials use world-space coordinates so texture scale is in real meters
and identical on every unit size.
"""
import bpy


def _srgb_to_linear(c):
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c)


def _new(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m, nt, bsdf


def _noise(nt, scale, detail=6.0, rough=0.6, pos=None):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    if pos is not None:
        nt.links.new(pos, n.inputs["Vector"])
    return n


def _ramp(nt, src, c0, c1, p0=0.3, p1=0.7):
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position = p0
    r.color_ramp.elements[1].position = p1
    r.color_ramp.elements[0].color = (*c0, 1)
    r.color_ramp.elements[1].color = (*c1, 1)
    nt.links.new(src, r.inputs["Fac"])
    return r


def _maprange(nt, src, lo, hi):
    m = nt.nodes.new("ShaderNodeMapRange")
    m.inputs["To Min"].default_value = lo
    m.inputs["To Max"].default_value = hi
    nt.links.new(src, m.inputs["Value"])
    return m


def wall_panel(colors):
    """Insulated sandwich panel: off-white, satin, with fine vertical micro-ribs."""
    m, nt, b = _new("RS_WallPanel")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs["Vector"])
    # walls are axis aligned: horizontal coordinate along the wall = x + y
    add = nt.nodes.new("ShaderNodeMath"); add.operation = "ADD"
    nt.links.new(sep.outputs["X"], add.inputs[0]); nt.links.new(sep.outputs["Y"], add.inputs[1])
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 6.2831853 / 0.10   # rib every 10 cm
    nt.links.new(add.outputs[0], mul.inputs[0])
    sin = nt.nodes.new("ShaderNodeMath"); sin.operation = "SINE"
    nt.links.new(mul.outputs[0], sin.inputs[0])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.18
    bump.inputs["Distance"].default_value = 0.0006
    nt.links.new(sin.outputs[0], bump.inputs["Height"])
    # very subtle large-scale tone variation (real panels are not perfectly uniform)
    n = _noise(nt, 1.5, 3, 0.5, geo.outputs["Position"])
    base = _srgb_to_linear(colors["panel"])
    darker = tuple(x * 0.95 for x in base)
    r = _ramp(nt, n.outputs["Fac"], darker, base, 0.35, 0.65)
    nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def galvanized(colors):
    """Hot-dip galvanized steel: metallic, mottled spangle, varying roughness."""
    m, nt, b = _new("RS_Galvanized")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    n1 = _noise(nt, 18.0, 8, 0.65, geo.outputs["Position"])
    n2 = _noise(nt, 140.0, 4, 0.5, geo.outputs["Position"])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "FLOAT"
    mix.inputs[0].default_value = 0.35
    nt.links.new(n1.outputs["Fac"], mix.inputs[2]); nt.links.new(n2.outputs["Fac"], mix.inputs[3])
    r = _ramp(nt, mix.outputs[0], _srgb_to_linear(colors["galvanized_dark"]),
              _srgb_to_linear(colors["galvanized_light"]), 0.2, 0.8)
    nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    rough = _maprange(nt, mix.outputs[0], 0.30, 0.42)
    nt.links.new(rough.outputs["Result"], b.inputs["Roughness"])
    b.inputs["Metallic"].default_value = 1.0
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.0003
    nt.links.new(n2.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def concrete(colors):
    """Power-floated grey concrete, matte with mottling (as in the real unit photo)."""
    m, nt, b = _new("RS_Concrete")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    n1 = _noise(nt, 1.2, 6, 0.6, geo.outputs["Position"])
    n2 = _noise(nt, 9.0, 8, 0.7, geo.outputs["Position"])
    n3 = _noise(nt, 250.0, 2, 0.5, geo.outputs["Position"])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "FLOAT"
    mix.inputs[0].default_value = 0.55
    nt.links.new(n1.outputs["Fac"], mix.inputs[2]); nt.links.new(n2.outputs["Fac"], mix.inputs[3])
    r = _ramp(nt, mix.outputs[0], _srgb_to_linear(colors["concrete_dark"]),
              _srgb_to_linear(colors["concrete_light"]), 0.3, 0.7)
    nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    rough = _maprange(nt, n2.outputs["Fac"], 0.55, 0.85)
    nt.links.new(rough.outputs["Result"], b.inputs["Roughness"])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.0005
    nt.links.new(n3.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def simple(name, srgb, metallic=0.0, roughness=0.5):
    m, nt, b = _new(name)
    b.inputs["Base Color"].default_value = (*_srgb_to_linear(srgb), 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    return m


def emission(name, strength, srgb=(1, 1, 1)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*_srgb_to_linear(srgb), 1)
    e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs[0], out.inputs["Surface"])
    return m


def build_all(colors):
    return {
        "panel": wall_panel(colors),
        "galv": galvanized(colors),
        "concrete": concrete(colors),
        "steel": simple("RS_StainlessSteel", (0.80, 0.80, 0.81), 1.0, 0.32),
        "brass": simple("RS_Brass", (0.80, 0.62, 0.30), 1.0, 0.3),
        "warehouse": simple("RS_WarehouseShell", (0.55, 0.56, 0.58), 0.0, 0.7),
        "beam": simple("RS_SteelBeam", (0.42, 0.44, 0.47), 0.6, 0.45),
        "tube": emission("RS_LightTube", 18.0, (1.0, 0.98, 0.95)),
    }
