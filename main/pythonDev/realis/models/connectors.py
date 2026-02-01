
import numpy as np
from numpy.linalg import norm
from ..graphics import Line, Cylinder # Explicit Line function needed or use cylinder? Exudyn has Line.

# Add Line helper if not exists, but let's assume I added Cylinder. 
# Let's check graphics.py content later. I added Cylinder, Sphere, Cuboid.
# Simple Line is often needed. I will use a thin Cylinder or add Line to graphics.py.
# For now, let's use Cylinder.

class ObjectConnectorSpringDamper:
    def __init__(self, object_dict):
        self.k = object_dict['stiffness']
        self.d = object_dict['damping']
        self.node_indices = object_dict['nodeNumbers']
        self.reference_length = 0.0 
        self.visualization = object_dict.get('visualization', {})
        
    def ComputeODE2RHS(self, rhs, nodes, system_state):
        node0 = nodes[self.node_indices[0]]
        node1 = nodes[self.node_indices[1]]
        
        idx0 = node0.global_index
        idx1 = node1.global_index
        
        q = system_state['q']
        v = system_state['q_t']
        
        pos0 = node0.referenceCoordinates + q[idx0:idx0+3]
        pos1 = node1.referenceCoordinates + q[idx1:idx1+3]
        
        vel0 = v[idx0:idx0+3]
        vel1 = v[idx1:idx1+3]
        
        diff_pos = pos1 - pos0
        current_length = norm(diff_pos)
        
        if current_length == 0: return
            
        direction = diff_pos / current_length
        diff_vel = vel1 - vel0
        vel_proj = np.dot(diff_vel, direction)
        
        force_mag = self.k * (current_length - self.reference_length) + self.d * vel_proj
        force_vec = force_mag * direction
        
        rhs[idx0:idx0+3] += force_vec
        rhs[idx1:idx1+3] -= force_vec

    def GetGraphicsData(self, nodes, system_state):
        node0 = nodes[self.node_indices[0]]
        node1 = nodes[self.node_indices[1]]
        
        idx0 = node0.global_index
        idx1 = node1.global_index
        
        pos0 = node0.referenceCoordinates.copy()
        pos1 = node1.referenceCoordinates.copy()
        
        if system_state is not None:
            q = system_state['q']
            if idx0 != -1: pos0 += q[idx0:idx0+3]
            if idx1 != -1: pos1 += q[idx1:idx1+3]
            
        # Draw Cylinder (Spring)
        color = self.visualization.get('color', [0.8, 0.8, 0.8, 1.0])
        radius = self.visualization.get('radius', 0.05)
        
        # Cylinder defined by Axis? 
        # My graphics.py Cylinder: pAxis (start), vAxis (vector), radius
        vAxis = pos1 - pos0
        
        return {
            'type': 'Cylinder',
            'pAxis': pos0,
            'vAxis': vAxis,
            'radius': radius,
            'color': np.array(color)
        }
