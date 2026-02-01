import numpy as np
from solvers.rk4 import step as rk4_step
from interface.exporter import SimulationExporter

# Import Models
from models.mass_springs import DampedOscillator
from models.pendulums import SimplePendulum, DoublePendulum
from models.rotational import RollingDisk

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
        # theta in degrees for UI convenience? Or radians. Let's assume input is radians or we convert.
        # Let's stick to radians for the core.
        return RollingDisk(
            mass=float(params.get("mass", 1.0)),
            radius=float(params.get("radius", 0.5)),
            theta=float(params.get("theta", np.pi/6))
        )
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
    state0 = config.get("state0", [1.0, 0.0]) # Default 1D
    # Ensure state is list/array of floats
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
    state = tuple(state0) # Solvers expect tuple/array
    
    # Run
    for _ in range(steps):
        try:
            e = system.total_energy(state)
        except:
            e = 0.0
        exporter.record_step(t, state, energy=e)
        state = rk4_step(state, t, dt, system.derivatives, None)
        t += dt
        
    exporter.record_step(t, state)
    
    return exporter.save()
