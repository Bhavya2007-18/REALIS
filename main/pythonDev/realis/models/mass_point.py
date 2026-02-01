
import numpy as np
from ..graphics import Sphere

class NodePoint:
    def __init__(self, node_dict):
        self.referenceCoordinates = np.array(node_dict['referenceCoordinates'], dtype=float)
        self.global_index = -1 
    
    def GetNumberOfCoordinates(self):
        return 3

class ObjectMassPoint:
    def __init__(self, object_dict):
        self.mass = object_dict['physicsMass']
        self.node_number = object_dict['nodeNumber']
        self.name = object_dict.get('name', '')
        # Simple visualization settings (e.g. radius from checks?)
        self.visualization = object_dict.get('visualization', {})
        
    def ComputeMassMatrix(self, M, nodes):
        node = nodes[self.node_number]
        idx = node.global_index
        if idx == -1: return
        M[idx, idx] += self.mass
        M[idx+1, idx+1] += self.mass
        M[idx+2, idx+2] += self.mass

    def ComputeODE2RHS(self, rhs, nodes, system_state):
        pass

    def GetGraphicsData(self, nodes, system_state):
        node = nodes[self.node_number]
        idx = node.global_index
        
        # Current Position
        pos = node.referenceCoordinates.copy()
        if system_state is not None and idx != -1:
            q = system_state['q']
            # Safety check on len(q) vs idx
            if idx+3 <= len(q):
                pos += q[idx:idx+3]
        
        # Defaults
        radius = self.visualization.get('radius', 0.1)
        color = self.visualization.get('color', [0.2, 0.6, 1.0, 1.0])
        
        return Sphere(point=pos, radius=radius, color=color)
