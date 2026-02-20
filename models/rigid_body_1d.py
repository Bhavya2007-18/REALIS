"""
models/rigid_body_1d.py — Force-Field-Driven 1-D Rigid Body
============================================================

A minimal, solver-agnostic rigid-body model whose dynamics are fully
determined by an **injected force field**.  The model owns no integration
logic; it only computes **derivatives** and **energies** for a given state.

State-Space Formulation
-----------------------
The continuous-time dynamics of a point mass moving in one dimension
under a single external force F are described by the first-order
state-space system:

    state vector   q = [x, v]ᵀ

    dq/dt = f(q, t)

where:
    ẋ = v                 (1)  kinematic identity
    v̇ = F / m             (2)  Newton's second law

Because this model uses a conservative ``UniformGravityField``, F is
obtained by calling ``field.force(mass)``, which returns −m·g.
Substituting:

    v̇ = (−m·g) / m = −g

The acceleration is therefore independent of mass (equivalence principle),
but we keep the general form F/m so that the model can later accept any
force field that exposes a ``force(mass)`` method.

How Gravity Is Injected
-----------------------
Gravity is **not** a baked-in constant; it enters through *dependency
injection*.  The constructor receives a ``gravity_field`` object that
satisfies the following protocol:

    gravity_field.force(mass)  →  float   (net gravitational force)
    gravity_field.potential_energy(mass, height)  →  float

This decoupling gives three benefits:

1. **Testability** — tests can inject a zero-gravity or custom field.
2. **Reusability** — the model works with any planet's gravity.
3. **Separation of concerns** — the model never knows the numeric value
   of *g*; it only asks the field for a force.

Invariant Framework
-------------------
Following the REALIS ``EnergySource`` contract (see
``engine/core/invariant.hpp``), the model exposes:

    kinetic_energy(state)    = ½ m v²
    potential_energy(state)  = m g h        (delegated to the field)
    total_energy(state)      = KE + PE

Because gravity is conservative, total mechanical energy is an exact
invariant of the continuous system.  Any numerical drift detected by an
external monitor therefore measures *integrator* error, not model error.

Assumptions
-----------
1. Point-mass approximation — no rotational DOFs.
2. 1-D vertical motion — position = height along y-axis.
3. Uniform, conservative gravitational field.
4. No dissipation (friction, drag, damping).
5. No external work other than gravity.

Constraints
-----------
* No integration logic — the caller (solver) advances the state.
* No simulation loop.
* No hidden constants — g comes from the injected field.
* Derivatives are independent of timestep.

Example
-------
>>> from core.gravity import UniformGravityField
>>> field = UniformGravityField(g=9.81)
>>> body  = RigidBody1D(mass=2.0, gravity_field=field)
>>> state = (10.0, 0.0)                # x=10 m, v=0 m/s
>>> body.derivatives(state, t=0.0)
(0.0, -9.81)
>>> body.total_energy(state)
196.2
"""

from __future__ import annotations

from typing import Tuple

# Type alias for the 1-D state vector [position, velocity].
State1D = Tuple[float, float]


class RigidBody1D:
    """A 1-D rigid body driven by an injected gravitational field.

    Parameters
    ----------
    mass : float
        Body mass (must be positive).
    gravity_field : object
        Any object exposing ``force(mass) → float`` and
        ``potential_energy(mass, height) → float``.
        The canonical implementation is
        :class:`core.gravity.UniformGravityField`.

    Raises
    ------
    ValueError
        If *mass* is not positive.
    TypeError
        If *mass* is not a real number or *gravity_field* lacks the
        required interface.
    """

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    def __init__(self, mass: float, gravity_field: object) -> None:
        # ---- validate mass ----
        if not isinstance(mass, (int, float)):
            raise TypeError(
                f"Mass must be a real number, got {type(mass).__name__}"
            )
        if mass <= 0:
            raise ValueError(f"Mass must be positive, got {mass}")

        # ---- validate gravity field interface ----
        if not callable(getattr(gravity_field, "force", None)):
            raise TypeError(
                "gravity_field must expose a callable 'force(mass)' method"
            )
        if not callable(getattr(gravity_field, "potential_energy", None)):
            raise TypeError(
                "gravity_field must expose a callable "
                "'potential_energy(mass, height)' method"
            )

        self._mass: float = float(mass)
        self._gravity_field = gravity_field

    # ------------------------------------------------------------------
    # Read-only properties
    # ------------------------------------------------------------------

    @property
    def mass(self) -> float:
        """Body mass (read-only)."""
        return self._mass

    @property
    def gravity_field(self) -> object:
        """The injected gravitational field (read-only)."""
        return self._gravity_field

    # ------------------------------------------------------------------
    # Equations of motion
    # ------------------------------------------------------------------

    def derivatives(self, state: State1D, t: float) -> State1D:
        """Return the time-derivatives of the state vector.

        This is the right-hand side of the ODE system:

            ẋ = v
            v̇ = F(m) / m

        Parameters
        ----------
        state : (float, float)
            Current state ``(position, velocity)``.
        t : float
            Current time.  Unused for a time-invariant field, but kept
            in the signature so that any standard ODE solver
            (``scipy.integrate.odeint``, etc.) can call this directly.

        Returns
        -------
        (float, float)
            ``(dx_dt, dv_dt)`` — the state derivatives.

        Notes
        -----
        * The force is obtained from the injected field, **not** from a
          hardcoded constant.
        * The derivatives are independent of any timestep Δt.
        """
        position, velocity = state

        # ẋ  = v   (kinematic identity)
        dx_dt: float = velocity

        # v̇  = F / m   (Newton II)
        force: float = self._gravity_field.force(self._mass)
        dv_dt: float = force / self._mass

        return (dx_dt, dv_dt)

    # ------------------------------------------------------------------
    # Invariant framework — energy accounting
    # ------------------------------------------------------------------

    def kinetic_energy(self, state: State1D) -> float:
        """Kinetic energy: KE = ½ m v².

        Parameters
        ----------
        state : (float, float)
            ``(position, velocity)``.

        Returns
        -------
        float
            Kinetic energy (always ≥ 0).
        """
        _, velocity = state
        return 0.5 * self._mass * velocity * velocity

    def potential_energy(self, state: State1D) -> float:
        """Gravitational potential energy: PE = m g h.

        Delegates to the injected gravity field so that the numeric
        value of *g* is never duplicated inside the model.

        Parameters
        ----------
        state : (float, float)
            ``(position, velocity)``.  Only position (= height) is used.

        Returns
        -------
        float
            Potential energy relative to h = 0.
        """
        position, _ = state
        return self._gravity_field.potential_energy(self._mass, position)

    def total_energy(self, state: State1D) -> float:
        """Total mechanical energy: E = KE + PE.

        Because the gravitational field is conservative and no
        dissipation is modelled, E is an exact invariant of the
        continuous system.  Any drift observed during simulation is
        attributable to the integrator, not the model.

        Parameters
        ----------
        state : (float, float)
            ``(position, velocity)``.

        Returns
        -------
        float
            Total mechanical energy.
        """
        return self.kinetic_energy(state) + self.potential_energy(state)

    # ------------------------------------------------------------------
    # Dunder helpers
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"mass={self._mass!r}, "
            f"gravity_field={self._gravity_field!r})"
        )
