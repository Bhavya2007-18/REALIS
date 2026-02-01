
import numpy as np
import time

class MainSolver:
    """
    Base class for solvers.
    Mirrors Exudyn's MainSolver / CSolver logic.
    """
    def __init__(self):
        self.mbs = None # Linked MainSystem
        self.simulationSettings = {
            'timeIntegration': {
                'numberOfSteps': 100,
                'endTime': 1.0,
                'startTime': 0.0,
                'verboseMode': 1
            },
            'solutionSettings': {
                'writeSolutionToFile': False
            }
        }
    
    def InitializeSolver(self, mbs, simulationSettings):
        self.mbs = mbs
        self.simulationSettings.update(simulationSettings)
        # Ensure system is assembled
        if not self.mbs.is_assembled:
            self.mbs.Assemble()
            
    def Solve(self):
        raise NotImplementedError("Solve must be implemented by derived class")
