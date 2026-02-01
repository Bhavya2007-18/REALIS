
import numpy as np

class NodeRigidBody:
    """
    Backend representation of a Rigid Body Node.
    Uses 3 Pos + 4 Euler Parameters = 7 Coordinates?
    Or 3 Pos + 3 Lie Group parameters?
    Exudyn uses Euler Parameters (4) + 3 Pos = 7 coordinates for NodeRigidBodyEP.
    Let's align with Exudyn: 7 coordinates.
    """
    def __init__(self, node_dict):
        self.referenceCoordinates = np.array(node_dict['referenceCoordinates'], dtype=float)
        self.referenceRotations = np.array(node_dict['referenceRotations'], dtype=float)
        self.global_index = -1
    
    def GetNumberOfCoordinates(self):
        # 3 Position + 4 Rotation (Euler Params) = 7
        # Note: Solvers usually treat this as 6 DOF + 1 constraint or use special integrator.
        # For simplicity in Generalized Alpha with constraints, we might stick to 7.
        # Or standard 3+3 if using Lie Group int.
        # Let's say 7 for now to support quaternions.
        return 7

class ObjectRigidBody:
    """
    Backend representation of a Rigid Body Object.
    """
    def __init__(self, object_dict):
        self.mass = object_dict['physicsMass']
        self.inertia = np.array(object_dict['physicsInertia']) # vector of 6
        self.node_number = object_dict['nodeNumber']
        self.name = object_dict.get('name', '')
        
    def ComputeMassMatrix(self, M, nodes):
        node = nodes[self.node_number]
        idx = node.global_index
        
        # Translational Mass (3x3 diagonal)
        for i in range(3):
            M[idx+i, idx+i] += self.mass
            
        # Rotational Inertia (4x4? No, 3x3 effectively but mapped to 4x4 via G matrix)
        # This gets complicated with Euler Parameters.
        # For phase 2, let's just allocate the space. Logic comes in Phase 4 (Physics).
        pass

    def ComputeODE2RHS(self, rhs, nodes, system_state):
        # Apply gyroscopic forces etc.
        pass
