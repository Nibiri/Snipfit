"""Runs GarmentCode inside Pyodide. Loaded by gc.worker.ts."""
import sys, types, time, json

# GarmentCode imports these at module level but we only need pattern JSON/SVG.
# cairosvg (PNG/PDF export) and psutil have no Pyodide build, matplotlib is heavy.
for _name in ("cairosvg", "psutil"):
    sys.modules.setdefault(_name, types.ModuleType(_name))
_mpl = types.ModuleType("matplotlib")
_plt = types.ModuleType("matplotlib.pyplot")
_mpl.pyplot = _plt
sys.modules.setdefault("matplotlib", _mpl)
sys.modules.setdefault("matplotlib.pyplot", _plt)

import yaml

_t = time.time()
from assets.garment_programs.meta_garment import MetaGarment
from assets.bodies.body_params import BodyParameters
IMPORT_MS = round((time.time() - _t) * 1000)


def generate(design_name: str, body_name: str) -> str:
    t = time.time()
    body = BodyParameters(f"assets/bodies/{body_name}.yaml")
    with open(f"assets/design_params/{design_name}.yaml") as f:
        design = yaml.safe_load(f)["design"]
    garment = MetaGarment(design_name, body, design)
    pattern = garment.assembly()
    gen_ms = round((time.time() - t) * 1000)
    svg = None
    try:
        svg = pattern.get_svg("/tmp/pattern.svg", with_text=True, view_ids=False, flat=True).tostring()
    except Exception as e:  # SVG is a nice-to-have
        svg = f"<!-- svg failed: {e} -->"
    spec = pattern.spec
    return json.dumps({
        "importMs": IMPORT_MS,
        "generateMs": gen_ms,
        "panels": sorted(spec["pattern"]["panels"].keys()),
        "stitches": len(spec["pattern"]["stitches"]),
        "selfIntersecting": bool(garment.is_self_intersecting()),
        "spec": spec,
        "svg": svg,
    })
