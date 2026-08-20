"""Collision detection and impulse resolution for the REALIS physics engine.

Uses swept AABB overlap tests between pairs of bodies. When bodies overlap we
compute a contact normal and penetration depth, then apply an impulse response
scaled by restitution and dampened by friction.

All coordinates are world-space. Bodies are dicts with the following shape:

    {
        'id', 'mass', 'inv_mass', 'is_static',
        'px', 'py', 'pz', 'vx', 'vy', 'vz',
        'geo_type',            # 'sphere' | 'box' | 'cylinder' | ...
        'radius',              # sphere only
        'half_x', 'half_y', 'half_z',   # box only
        'restitution',
    }

Returns a list of contact dicts:
    { 'a', 'b', 'normal': (nx, ny, nz), 'depth': float, 'point': (x, y, z) }
"""

import math

_EPS = 1e-8


def _aabb_overlap(a, b):
    return not (
        a["px"] + a["half_x"] <= b["px"] - b["half_x"] or
        a["px"] - a["half_x"] >= b["px"] + b["half_x"] or
        a["py"] + a["half_y"] <= b["py"] - b["half_y"] or
        a["py"] - a["half_y"] >= b["py"] + b["half_y"] or
        a["pz"] + a["half_z"] <= b["pz"] - b["half_z"] or
        a["pz"] - a["half_z"] >= b["pz"] + b["half_z"]
    )


def _sphere_aabb_radius(body):
    """Effective half-extents for a sphere treated as an AABB for collision."""
    r = body.get("radius", 0) or 0
    return r, r, r


def _half_extents(body):
    if body["geo_type"] == "sphere":
        rx, ry, rz = _sphere_aabb_radius(body)
    else:
        rx = body.get("half_x", 0) or 0
        ry = body.get("half_y", 0) or 0
        rz = body.get("half_z", 0) or 0
    return rx, ry, rz


def _penetration_depth(a, b, axis):
    """Axis-aligned penetration depth on one axis; positive means overlap."""
    ha, hb = _half_extents(a)[axis], _half_extents(b)[axis]
    if axis == 0:
        return (ha + hb) - abs(a["px"] - b["px"])
    if axis == 1:
        return (ha + hb) - abs(a["py"] - b["py"])
    return (ha + hb) - abs(a["pz"] - b["pz"])


def _contact_normal(a, b, axis):
    """Outward normal from b towards a along the given axis."""
    if axis == 0:
        n = 1.0 if a["px"] > b["px"] else -1.0
        return (n, 0.0, 0.0)
    if axis == 1:
        n = 1.0 if a["py"] > b["py"] else -1.0
        return (0.0, n, 0.0)
    n = 1.0 if a["pz"] > b["pz"] else -1.0
    return (0.0, 0.0, n)


def _contact_point(a, b, normal):
    nx, ny, nz = normal
    cx = (a["px"] + b["px"]) / 2.0
    cy = (a["py"] + b["py"]) / 2.0
    cz = (a["pz"] + b["pz"]) / 2.0
    return (cx, cy, cz)


def detect_collisions(bodies):
    """Return a list of contact dicts for all overlapping body pairs."""
    contacts = []
    n = len(bodies)
    for i in range(n):
        a = bodies[i]
        for j in range(i + 1, n):
            b = bodies[j]
            if a["is_static"] and b["is_static"]:
                continue
            if not _aabb_overlap(a, b):
                continue

            # Compute extents on the primary axes
            axs = _half_extents(a)
            bxs = _half_extents(b)
            if axs[0] == 0 and axs[1] == 0 and axs[2] == 0:
                continue

            # Pick the axis with the smallest penetration
            depths = [
                (0, _penetration_depth(a, b, 0)),
                (1, _penetration_depth(a, b, 1)),
                (2, _penetration_depth(a, b, 2)),
            ]
            depths = [d for d in depths if d[1] >= 0]
            if not depths:
                continue

            axis, depth = min(depths, key=lambda d: d[1])
            normal = _contact_normal(a, b, axis)
            point = _contact_point(a, b, normal)

            contacts.append({
                "a": a["id"],
                "b": b["id"],
                "normal": normal,
                "depth": depth,
                "point": point,
            })

            _resolve_contact(a, b, normal, depth)
    return contacts


def _resolve_contact(a, b, normal, depth):
    """Apply positional correction and velocity impulse for one contact."""
    nx, ny, nz = normal
    inv_a = a["inv_mass"]
    inv_b = b["inv_mass"]
    inv_sum = inv_a + inv_b
    if inv_sum < _EPS:
        return

    # Relative velocity along normal
    rvx = a["vx"] - b["vx"]
    rvy = a["vy"] - b["vy"]
    rvz = a["vz"] - b["vz"]
    vel_along_normal = rvx * nx + rvy * ny + rvz * nz
    if vel_along_normal > 0:
        return  # separating

    e = min(a.get("restitution", 0.3) or 0, b.get("restitution", 0.3) or 0)
    j = -(1 + e) * vel_along_normal / inv_sum
    jx, jy, jz = j * nx, j * ny, j * nz

    a["vx"] += inv_a * jx
    a["vy"] += inv_a * jy
    a["vz"] += inv_a * jz
    b["vx"] -= inv_b * jx
    b["vy"] -= inv_b * jy
    b["vz"] -= inv_b * jz

    # Friction (tangential impulse, simple Coulomb)
    tx = rvx - vel_along_normal * nx
    ty = rvy - vel_along_normal * ny
    tz = rvz - vel_along_normal * nz
    t_len = math.sqrt(tx * tx + ty * ty + tz * tz)
    if t_len > _EPS:
        mu = min(a.get("friction", 0.3) or 0, b.get("friction", 0.3) or 0)
        jt = -t_len / inv_sum
        jt = max(-mu * abs(j), min(mu * abs(j), jt))
        tx, ty, tz = tx / t_len * jt, ty / t_len * jt, tz / t_len * jt
        a["vx"] += inv_a * tx
        a["vy"] += inv_a * ty
        a["vz"] += inv_a * tz
        b["vx"] -= inv_b * tx
        b["vy"] -= inv_b * ty
        b["vz"] -= inv_b * tz

    # Positional correction (Baumgarte, simplified)
    slop = 0.005
    correction = max(depth - slop, 0.0) / inv_sum * 0.2
    if correction > 0:
        cx, cy, cz = nx * correction, ny * correction, nz * correction
        a["px"] += inv_a * cx
        a["py"] += inv_a * cy
        a["pz"] += inv_a * cz
        b["px"] -= inv_b * cx
        b["py"] -= inv_b * cy
        b["pz"] -= inv_b * cz
