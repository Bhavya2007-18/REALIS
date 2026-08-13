"""Main simulation loop for the REALIS Python physics engine.

Integrates bodies with gravity and forces, resolves collisions and
constraints each sub-step, and builds a list of SimulationFrame-compatible
dicts (`{time, states:[...], contacts:[...]}`) plus energy tracking.

The engine takes plain dicts for objects/constraints so it stays decoupled
from FastAPI/Pydantic models and can be unit-tested directly.
"""

import math

from .collision import detect_collisions
from .constraints import solve_constraints
from .energy import compute_energy, energy_summary


def _normalize_object(obj):
    """Convert a SimulationRequest-style object dict into an internal body dict."""
    geo = obj.get("geometry", {}).get("position", {})
    dim = obj.get("geometry", {}).get("dimensions", {})
    pos = obj.get("position", {})
    gtype = obj["geometry"].get("type", "box") if obj.get("geometry") else obj.get("type", "box")

    px = geo.get("x", pos.get("x", 0))
    py = geo.get("y", pos.get("y", 0))
    pz = geo.get("z", pos.get("z", 0))

    vx = obj["physics"].get("initial_velocity", {}).get("x", 0)
    vy = obj["physics"].get("initial_velocity", {}).get("y", 0)
    vz = obj["physics"].get("initial_velocity", {}).get("z", 0)
    wx = obj["physics"].get("initial_angular_velocity", {}).get("x", 0)
    wy = obj["physics"].get("initial_angular_velocity", {}).get("y", 0)
    wz = obj["physics"].get("initial_angular_velocity", {}).get("z", 0)

    mass = float(obj["physics"].get("mass", 1.0))
    is_static = bool(obj["physics"].get("is_static", False))
    restitution = float(obj["physics"].get("restitution", 0.3))
    friction = float(obj["physics"].get("friction", 0.3))

    radius = float(dim.get("x", 0.5)) if gtype == "sphere" else 0.0
    half_x = float(dim.get("x", 1.0)) * 0.5
    half_y = float(dim.get("y", 1.0)) * 0.5
    half_z = float(dim.get("z", 1.0)) * 0.5

    return {
        "id": obj["id"],
        "px": px, "py": py, "pz": pz,
        "vx": vx, "vy": vy, "vz": vz,
        "wx": wx, "wy": wy, "wz": wz,
        "rx": 0.0, "ry": 0.0, "rz": 0.0,
        "mass": mass,
        "inv_mass": 0.0 if is_static or mass <= 0.001 else 1.0 / mass,
        "is_static": is_static,
        "restitution": restitution,
        "friction": friction,
        "geo_type": gtype,
        "radius": radius,
        "half_x": half_x, "half_y": half_y, "half_z": half_z,
    }


def _normalize_constraint(con):
    def to_tuple(v):
        if v is None:
            return None
        if isinstance(v, (list, tuple)):
            return tuple(float(x) for x in v[:3])
        if isinstance(v, dict):
            return (float(v.get("x", 0)), float(v.get("y", 0)), float(v.get("z", 0)))
        return None

    return {
        "id": con.get("id", ""),
        "type": con.get("type", "distance"),
        "target_a": con.get("target_a"),
        "target_b": con.get("target_b"),
        "distance": con.get("distance", 0.0),
        "pivot_a": to_tuple(con.get("pivot_a")),
        "pivot_b": to_tuple(con.get("pivot_b")),
        "axis": to_tuple(con.get("axis")),
    }


def simulate(objects, constraints=None, *, time_step=0.01, duration=2.0,
             gravity=(0, -9.81, 0), point_gravity=None, sub_steps=4,
             air_resistance=0.0):
    """Run the simulation and return a dict with frames + energy info.

    `frames` entries match SimulationFrame: {time, states, contacts}.
    `contacts` entries: {id_a, id_b, point:{x,y,z}}.
    """
    constraints = constraints or []
    bodies = [_normalize_object(o) for o in objects]
    cons = [_normalize_constraint(c) for c in constraints]

    gx, gy, gz = gravity
    dt = float(time_step)
    sub = max(1, int(sub_steps))
    sub_dt = dt / sub

    pg_center = None
    pg_strength = 0.0
    if point_gravity:
        c = point_gravity.get("center", {})
        pg_center = (c.get("x", 0), c.get("y", 0), c.get("z", 0))
        pg_strength = point_gravity.get("strength", 0.0)

    ar = float(air_resistance or 0.0)

    steps = int(duration / dt) + 1
    frames = []
    all_contacts = []
    prev_energy = None
    drift_percent = 0.0

    for step_i in range(steps):
        t = step_i * dt
        frame_contacts = []

        for b in bodies:
            b["fnet_x"], b["fnet_y"], b["fnet_z"] = 0.0, 0.0, 0.0

        for _ in range(sub):
            # 1. Integrate forces
            for b in bodies:
                if b["is_static"]:
                    continue

                if pg_center and pg_strength > 0:
                    dx = pg_center[0] - b["px"]
                    dy = pg_center[1] - b["py"]
                    dz = pg_center[2] - b["pz"]
                    dist_sq = dx * dx + dy * dy + dz * dz
                    dist = math.sqrt(dist_sq) if dist_sq > 0.01 else 0.1
                    force = pg_strength * dist_sq ** -1 if dist_sq > 0.1 else 0.0
                    ax = force * dx / dist / b["mass"]
                    ay = force * dy / dist / b["mass"]
                    az = force * dz / dist / b["mass"]
                else:
                    ax, ay, az = gx, gy, gz

                b["fnet_x"] += ax * b["mass"]
                b["fnet_y"] += ay * b["mass"]
                b["fnet_z"] += az * b["mass"]

                b["vx"] += ax * sub_dt
                b["vy"] += ay * sub_dt
                b["vz"] += az * sub_dt

                # Air resistance (drag scales with velocity)
                if ar > 0:
                    damp = max(0.0, 1.0 - ar * sub_dt)
                    b["vx"] *= damp
                    b["vy"] *= damp
                    b["vz"] *= damp

                # Insane-velocity guard to keep the sim stable
                vmax = 500.0
                for key in ("vx", "vy", "vz"):
                    v = b[key]
                    if v > vmax:
                        b[key] = vmax
                    elif v < -vmax:
                        b[key] = -vmax

                b["px"] += b["vx"] * sub_dt
                b["py"] += b["vy"] * sub_dt
                b["pz"] += b["vz"] * sub_dt

                b["rx"] += b["wx"] * sub_dt
                b["ry"] += b["wy"] * sub_dt
                b["rz"] += b["wz"] * sub_dt

            # 2. Collisions (dynamic-dynamic + dynamic-static)
            contacts = detect_collisions(bodies)
            for c in contacts:
                all_contacts.append(c)

            # 3. Constraints
            if cons:
                solve_constraints(cons, bodies, iterations=3)

        # Record this frame
        states = [{
            "id": b["id"],
            "position": {"x": b["px"], "y": b["py"], "z": b["pz"]},
            "rotation": {"x": b["rx"], "y": b["ry"], "z": b["rz"]},
            "linear_velocity": {"x": b["vx"], "y": b["vy"], "z": b["vz"]},
            "angular_velocity": {"x": b["wx"], "y": b["wy"], "z": b["wz"]},
            "force": {
                "x": b["fnet_x"] / sub,
                "y": b["fnet_y"] / sub,
                "z": b["fnet_z"] / sub,
            },
        } for b in bodies]

        ke, pe, total = compute_energy(bodies, gy)

        # Track energy drift on the last frame
        if step_i == steps - 1:
            if prev_energy and abs(prev_energy) > 1e-9:
                drift_percent = abs(total - prev_energy) / abs(prev_energy) * 100.0
            else:
                drift_percent = 0.0

        frames.append({
            "time": round(t, 6),
            "states": states,
            "contacts": [{
                "id_a": c["a"],
                "id_b": c["b"],
                "point": {"x": round(c["point"][0], 4),
                          "y": round(c["point"][1], 4),
                          "z": round(c["point"][2], 4)},
            } for c in frame_contacts],
        })

    summary = energy_summary(bodies, gy, prev_energy)
    return {
        "frames": frames,
        "energy_drift": round(drift_percent, 4),
        "contacts_count": len(all_contacts),
        "energy": summary,
    }