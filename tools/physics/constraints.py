"""Constraint solving (distance rods, hinge/point joints, fixed anchors).

Constraints are solved iteratively inside the sub-step loop using position
correction (Baumgarte stabilization) and velocity correction, so joints behave
like rigid rods/pivots without a full constraint solver.

Constraint dicts look like:
    {
        'type': 'distance' | 'hinge' | 'fixed' | 'slider',
        'target_a': str,
        'target_b': str | None,   # None means pinned to the world
        'distance': float,
        'pivot_a': (x, y, z),
        'pivot_b': (x, y, z),
        'axis': (x, y, z),
    }
"""

import math

_EPS = 1e-8


def _body_position(b):
    return (b["px"], b["py"], b["pz"])


def _apply_position(b, delta):
    b["px"] += delta[0]
    b["py"] += delta[1]
    b["pz"] += delta[2]


def _apply_velocity(b, delta):
    b["vx"] += delta[0]
    b["vy"] += delta[1]
    b["vz"] += delta[2]


def _apply_impulse(a, b, impulse):
    """Apply equal and opposite impulse to both bodies (world-anchored world pivot)."""
    a["vx"] += a["inv_mass"] * impulse[0]
    a["vy"] += a["inv_mass"] * impulse[1]
    a["vz"] += a["inv_mass"] * impulse[2]
    if b is not None:
        b["vx"] -= b["inv_mass"] * impulse[0]
        b["vy"] -= b["inv_mass"] * impulse[1]
        b["vz"] -= b["inv_mass"] * impulse[2]


def _world_anchor(b, pivot):
    """Anchor point in world coordinates (body position + local pivot)."""
    if pivot:
        return (b["px"] + pivot[0], b["py"] + pivot[1], b["pz"] + pivot[2])
    return _body_position(b)


def solve_distance(a, b, target_dist, pivot_a, pivot_b):
    """Solve a distance (rod) constraint between two anchored points."""
    pa = _world_anchor(a, pivot_a) if a else None
    pb = _world_anchor(b, pivot_b) if b else None
    if a is None and b is None:
        return

    # World anchor for (possible) static end
    if a is None:
        pa = pivot_a if pivot_a else (0.0, 0.0, 0.0)
    if b is None:
        pb = pivot_b if pivot_b else (0.0, 0.0, 0.0)

    dx = pb[0] - pa[0]
    dy = pb[1] - pa[1]
    dz = pb[2] - pa[2]
    dist = math.sqrt(dx * dx + dy * dy + dz * dz)
    if dist < _EPS:
        return

    nx, ny, nz = dx / dist, dy / dist, dz / dist
    err = dist - target_dist

    inv_sum = (a["inv_mass"] if a else 0) + (b["inv_mass"] if b else 0)
    if inv_sum < _EPS:
        return

    # Position correction (split between the two bodies)
    movement = (err / inv_sum) * 0.8
    m_a = movement * (a["inv_mass"] if a else 0)
    m_b = movement * (b["inv_mass"] if b else 0)
    if a:
        _apply_position(a, (nx * m_a, ny * m_a, nz * m_a))
    if b:
        _apply_position(b, (-nx * m_b, -ny * m_b, -nz * m_b))

    # Velocity correction: project relative velocity along the rod axis to zero
    rel_vx = (a["vx"] if a else 0) - (b["vx"] if b else 0)
    rel_vy = (a["vy"] if a else 0) - (b["vy"] if b else 0)
    rel_vz = (a["vz"] if a else 0) - (b["vz"] if b else 0)
    vel_along_n = rel_vx * nx + rel_vy * ny + rel_vz * nz
    impulse_mag = -vel_along_n / inv_sum
    ix, iy, iz = impulse_mag * nx, impulse_mag * ny, impulse_mag * nz
    _apply_impulse(a, b, (ix, iy, iz))


def solve_hinge(a, b, pivot_a, pivot_b, axis=None):
    """Point / hinge joint: keep the two anchor points coincident (dist ~ 0)."""
    solve_distance(a, b, 0.0, pivot_a, pivot_b)


def solve_fixed(a, b, pivot_a, pivot_b):
    """Fixed / weld joint: keep positions locked, kill relative velocity."""
    if a is None and b is None:
        return
    pa = _world_anchor(a, pivot_a) if a else pivot_a or (0, 0, 0)
    pb = _world_anchor(b, pivot_b) if b else pivot_b or (0, 0, 0)

    dx = pa[0] - pb[0]
    dy = pa[1] - pb[1]
    dz = pa[2] - pb[2]

    inv_sum = (a["inv_mass"] if a else 0) + (b["inv_mass"] if b else 0)
    if inv_sum < _EPS:
        return

    corr = 0.9
    m_a = (a["inv_mass"] if a else 0) / inv_sum * corr
    m_b = (b["inv_mass"] if b else 0) / inv_sum * corr
    if a:
        _apply_position(a, (-dx * m_a, -dy * m_a, -dz * m_a))
    if b:
        _apply_position(b, (dx * m_b, dy * m_b, dz * m_b))

    rel_vx = (a["vx"] if a else 0) - (b["vx"] if b else 0)
    rel_vy = (a["vy"] if a else 0) - (b["vy"] if b else 0)
    rel_vz = (a["vz"] if a else 0) - (b["vz"] if b else 0)
    vel_along = rel_vx * dx + rel_vy * dy + rel_vz * dz
    if abs(vel_along) > _EPS:
        impulse_mag = -vel_along / inv_sum
        _apply_impulse(a, b, (impulse_mag * dx, impulse_mag * dy, impulse_mag * dz))


def solve_constraints(constraints, bodies, iterations=3):
    """Solve all constraints with a few iterations for stability."""
    by_id = {b["id"]: b for b in bodies}

    for _ in range(max(1, iterations)):
        for con in constraints:
            a = by_id.get(con.get("target_a"))
            # If target_b is None -> world anchor
            b = by_id.get(con["target_b"]) if con.get("target_b") else None

            ctype = con.get("type", "distance")
            pivot_a = con.get("pivot_a")
            pivot_b = con.get("pivot_b")

            if a is None and b is None:
                continue

            if ctype == "hinge" or ctype == "revolute" or ctype == "point":
                solve_hinge(a, b, pivot_a, pivot_b, con.get("axis"))
            elif ctype == "fixed":
                solve_fixed(a, b, pivot_a, pivot_b)
            elif ctype == "slider":
                # A slider is currently approximated by a distance rod along its axis.
                solve_distance(a, b, con.get("distance", 0.0), pivot_a, pivot_b)
            else:  # distance
                solve_distance(a, b, con.get("distance", 0.0), pivot_a, pivot_b)