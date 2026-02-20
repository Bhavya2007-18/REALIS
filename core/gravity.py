"""
core/gravity.py — Uniform Gravitational Field
==============================================

Provides a **conservative** gravity force field for the REALIS engine.

Why gravity is conservative
---------------------------
A force field F is *conservative* if the work done on a particle moving
between two points depends **only** on those endpoints, never on the path
taken.  Equivalently, the work around every closed path is zero:

    ∮ F · ds = 0

For a uniform gravitational field **F** = −m g ŷ the potential energy is

    U(h) = m g h

so the force is the negative gradient of a scalar potential:

    F = −∇U

This satisfies both conditions above, therefore uniform gravity is
conservative.  Consequently energy (kinetic + potential) is an exact
invariant, which is the foundation for energy-based verification in REALIS.

Assumptions
-----------
1. **Uniform gravitational field** — g does not vary with position.
2. **Constant acceleration** — g is time-independent.
3. **Point-mass approximation** — bodies have no spatial extent; rotational
   effects are ignored.
4. **No air resistance** — the only force considered is gravity.
5. **1D vertical motion** — the field acts along a single axis (taken as
   the *y*-axis by convention).

Constraints
-----------
* No solver / integration / simulation-loop logic lives here.
* No hidden constants — the caller explicitly supplies *g*.
* Gravity does **not** depend on the timestep.

Unit Consistency
----------------
All quantities are assumed to be expressed in a **self-consistent** set of
units.  If the caller uses SI:

    g         →  m / s²
    mass      →  kg
    height    →  m
    force     →  kg · m / s²  =  N
    energy    →  kg · m² / s² =  J

No unit conversion is performed; it is the caller's responsibility to
supply values in compatible units.

Example
-------
>>> field = UniformGravityField(g=9.81)
>>> field.force(mass=2.0)
-19.62
>>> field.potential_energy(mass=2.0, height=5.0)
98.1
"""

from __future__ import annotations


class UniformGravityField:
    """A uniform, conservative gravitational field.

    Parameters
    ----------
    g : float
        Magnitude of gravitational acceleration (positive value).
        For Earth's surface the conventional value is ≈ 9.81 m/s².

    Raises
    ------
    ValueError
        If *g* is negative.
    TypeError
        If *g* is not a real number.

    Notes
    -----
    *  The field is directed **downward** (negative *y*).
    *  ``force`` returns a **signed** scalar: negative means the force
       points in the −y direction.
    *  The class stores no mutable state beyond *g*; instances are
       effectively immutable and safe to share across threads.

    Assumptions
    ~~~~~~~~~~~
    1. Uniform gravitational field  (g is constant in space).
    2. Constant acceleration         (g is constant in time).
    3. Point-mass approximation      (no extent, no rotation).
    4. No air resistance             (gravity is the sole force).
    5. 1D vertical motion            (single-axis, y convention).
    """

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    def __init__(self, g: float) -> None:
        if not isinstance(g, (int, float)):
            raise TypeError(
                f"Gravitational acceleration must be a real number, got {type(g).__name__}"
            )
        if g < 0:
            raise ValueError(
                f"Gravitational acceleration must be non-negative, got {g}"
            )
        self._g: float = float(g)

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    @property
    def g(self) -> float:
        """Magnitude of gravitational acceleration (read-only)."""
        return self._g

    def force(self, mass: float) -> float:
        """Compute the gravitational force on a point mass.

        Parameters
        ----------
        mass : float
            Mass of the body (must be positive).

        Returns
        -------
        float
            The gravitational force.  By sign convention the force is
            **negative** (directed downward along −y):

                F = −m · g

        Raises
        ------
        ValueError
            If *mass* is negative.
        TypeError
            If *mass* is not a real number.

        Assumptions
        ~~~~~~~~~~~
        * Point-mass approximation — no spatial extent.
        * Uniform field — force is independent of position.
        * No dependence on timestep or velocity.
        """
        self._validate_mass(mass)
        return -mass * self._g

    def potential_energy(self, mass: float, height: float) -> float:
        """Compute gravitational potential energy.

        Parameters
        ----------
        mass : float
            Mass of the body (must be positive).
        height : float
            Vertical position relative to the chosen reference level.
            May be negative (below reference).

        Returns
        -------
        float
            Gravitational potential energy:

                U = m · g · h

            This is measured relative to h = 0.

        Raises
        ------
        ValueError
            If *mass* is negative.
        TypeError
            If *mass* or *height* is not a real number.

        Assumptions
        ~~~~~~~~~~~
        * Conservative field — U depends only on height, not on path.
        * Uniform field — g is constant, so U is linear in h.
        * Reference level at h = 0 (caller's choice of origin).
        """
        self._validate_mass(mass)
        if not isinstance(height, (int, float)):
            raise TypeError(
                f"Height must be a real number, got {type(height).__name__}"
            )
        return mass * self._g * float(height)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_mass(mass: float) -> None:
        """Raise if *mass* is not a valid positive real number."""
        if not isinstance(mass, (int, float)):
            raise TypeError(
                f"Mass must be a real number, got {type(mass).__name__}"
            )
        if mass < 0:
            raise ValueError(f"Mass must be non-negative, got {mass}")

    # ------------------------------------------------------------------
    # Dunder helpers
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(g={self._g!r})"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, UniformGravityField):
            return NotImplemented
        return self._g == other._g
