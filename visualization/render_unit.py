"""One command to build, verify, render and annotate a unit.

    python3 render_unit.py U01                 # final quality
    python3 render_unit.py U01 --preview       # quick low-res check

Needs:  Blender as a Python module (`pip install bpy`) in the interpreter given by
        $RS_BLENDER_PY (default: current python), and Pillow with raqm (Arabic text).
"""
import argparse
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("unit")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--samples", type=int, default=None)
    a = ap.parse_args()
    out = os.path.join(HERE, "output", a.unit + ("_preview" if a.preview else ""))
    samples = a.samples or (32 if a.preview else 160)
    percent = 25 if a.preview else 100
    bpy_python = os.environ.get("RS_BLENDER_PY", sys.executable)
    subprocess.run([bpy_python, "-I", os.path.join(HERE, "scripts", "build_unit.py"), "--unit", a.unit,
                    "--out", out, "--samples", str(samples), "--percent", str(percent)], check=True)
    subprocess.run([sys.executable, os.path.join(HERE, "scripts", "annotate.py"), "--dir", out, "--id", a.unit],
                   check=True)
    print("Done ->", out)


if __name__ == "__main__":
    main()
