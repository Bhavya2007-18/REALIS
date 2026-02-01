import numpy as np
from solvers.rk4 import step as rk4_step
from interface.exporter import SimulationExporter

# Import Models
from models.mass_springs import DampedOscillator
from models.pendulums import SimplePendulum, DoublePendulum
from models.rotational import RollingDisk
from models.nbody import NBody1D
from models.collision import solve_1d_collision

def create_system(type_name, params):
    """Factory for systems based on type string and params dict."""
    if type_name == "mass_spring":
        return DampedOscillator(
            k=float(params.get("k", 10.0)),
            m=float(params.get("m", 1.0)),
            c=float(params.get("c", 0.0))
        )
    elif type_name == "simple_pendulum":
        return SimplePendulum(
            length=float(params.get("length", 1.0)),
            mass=float(params.get("mass", 1.0)),
            damping=float(params.get("damping", 0.0))
        )
    elif type_name == "double_pendulum":
        return DoublePendulum(
            L1=float(params.get("L1", 1.0)),
            L2=float(params.get("L2", 1.0)),
            m1=float(params.get("m1", 1.0)),
            m2=float(params.get("m2", 1.0))
        )
    elif type_name == "rolling_disk":
        return RollingDisk(
            mass=float(params.get("mass", 1.0)),
            radius=float(params.get("radius", 0.5)),
            theta=float(params.get("theta", np.pi/6))
        )
    elif type_name == "nbody_1d":
        # params: masses=[...], positions=[...], restitution=1.0
        masses = params.get("masses", [1.0, 1.0])
        pos = params.get("positions", [0.0, 2.0])
        e = float(params.get("restitution", 1.0))
        return NBody1D(masses, pos, radius=0.1, restitution=e)
        
    else:
        raise ValueError(f"Unknown system type: {type_name}")

def run_simulation(config):
    """
    Runs a simulation from a config dictionary.
    Returns the path to the exported file.
    """
    model_type = config.get("model", "mass_spring")
    params = config.get("params", {})
    
    # Initial State
    state0 = config.get("state0", [1.0, 0.0])
    
    # NBody special case: state is dependent on masses if not provided?
    # Actually, for NBody, user provides masses/positions in params.
    # State should be built from that if not provided explicitly.
    if model_type == "nbody_1d" and not state0:
         # Construct state [x0, 0, x1, 0 ...]
         sys_tmp = create_system(model_type, params)
         state0 = []
         for p in sys_tmp.positions:
             state0.append(p)
             state0.append(0.0) # v=0
    
    state0 = [float(x) for x in state0]
    
    dt = float(config.get("dt", 0.01))
    steps = int(config.get("steps", 1000))
    
    system = create_system(model_type, params)
    
    # Setup Exporter
    exporter = SimulationExporter(system_name=f"Custom {model_type}")
    exporter.set_metadata("RK4", dt)
    exporter.metadata["system_type"] = system.system_type
    exporter.metadata["user_params"] = params
    
    t = 0.0
    state = tuple(state0) 
    
    # Collision buffer to prevent double-resolving in same step?
    # Simplest approach: Check overlap after step, resolve, update state.
    
    for _ in range(steps):
        try:
            e = system.total_energy(state)
        except:
            e = 0.0
        exporter.record_step(t, state, energy=e)
        
        # Integration Step
        state = rk4_step(state, t, dt, system.derivatives, None)
        t += dt
        
        # Post-Step Collision Resolution (Discrete Event)
        if hasattr(system, "get_particles"):
            particles = system.get_particles(state)
            # Naive O(N^2) or sorted line sweep O(N log N). N is small.
            # Check neighbors only (assuming 1D ordered? No, particles can swap).
            # Sort by position
            particles.sort(key=lambda p: p["x"])
            
            # Convert tuple to mutable list to apply impulse
            state_list = list(state)
            
            for i in range(len(particles) - 1):
                p1 = particles[i]
                p2 = particles[i+1]
                
                # Check overlap (dist < r1 + r2)
                dist = p2["x"] - p1["x"]
                if dist < (p1["r"] + p2["r"]):
                    # COLLISION DETECTED
                    # 1. Resolve Velocity (Newton's Restitution)
                    v1 = p1["v"]
                    v2 = p2["v"]
                    
                    # Only resolve if moving towards each other
                    if v1 > v2: 
                        v1n, v2n, dE = solve_1d_collision(
                            p1["m"], p2["m"], v1, v2, system.e
                        )
                        
                        # Apply
                        idx1_v = 2 * p1["id"] + 1
                        idx2_v = 2 * p2["id"] + 1
                        state_list[idx1_v] = v1n
                        state_list[idx2_v] = v2n
                        
                        # 2. Separate Positions (Anti-tunneling projection)
                        overlap = (p1["r"] + p2["r"]) - dist
                        # Push apart half-half (or mass weighted?)
                        # Simple: move equal amounts
                        correction = overlap / 2.0 + 0.001 # small epsilon
                        
                        idx1_x = 2 * p1["id"]
                        idx2_x = 2 * p2["id"]
                        state_list[idx1_x] -= correction
                        state_list[idx2_x] += correction
            
            state = tuple(state_list)
        
    exporter.record_step(t, state)
    
    return exporter.save()

