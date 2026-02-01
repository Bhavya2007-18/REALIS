import json
import os
import time
import numpy as np

class SimulationExporter:
    def __init__(self, system_name="Simulation"):
        self.metadata = {
            "system": system_name,
            "timestamp": time.time(),
            "solver": "Unknown",
            "dt": 0.0
        }
        self.time_history = []
        self.state_history = []
        self.energy_history = []
        
        # Ensure export directory exists
        self.export_dir = os.path.join(os.getcwd(), "exports")
        os.makedirs(self.export_dir, exist_ok=True)

    def set_metadata(self, solver, dt):
        self.metadata["solver"] = solver
        self.metadata["dt"] = dt

    def record_step(self, t, state, energy=None):
        self.time_history.append(float(t))
        # Convert numpy types to float for JSON serialization
        if hasattr(state, '__len__'):
             self.state_history.append([float(x) for x in state])
        else:
             self.state_history.append(float(state))
             
        if energy is not None:
            self.energy_history.append(float(energy))

    def save(self, filename=None):
        if filename is None:
            # Auto-generate filename based on timestamp
            filename = f"run_{int(self.metadata['timestamp'])}.json"
            
        filepath = os.path.join(self.export_dir, filename)
        
        data = {
            "metadata": self.metadata,
            "data": {
                "time": self.time_history,
                "states": self.state_history,
                "energy": self.energy_history
            }
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
            
        print(f"Exported simulation data to: {filepath}")
        return filepath
