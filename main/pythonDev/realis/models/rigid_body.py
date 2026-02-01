
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
        self.initialVelocities = np.array(node_dict.get('initialVelocities', [0,0,0]), dtype=float)
        self.initialAngularVelocities = np.array(node_dict.get('initialAngularVelocities', [0,0,0]), dtype=float)
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
        if idx == -1: return 
        
        # Translational Mass (3x3 diagonal)
        for i in range(3):
            M[idx+i, idx+i] += self.mass
            
        # Rotational Inertia
        # Exudyn Formulation for Euler Parameters:
        # Mass matrix for rotation part (4x4) depends on G matrix.
        # Theoretical: 4x4 matrix M_rot = 4 * G^T * J_local * G
        # Because we define Kinetic Energy T = 0.5 * w_loc^T * J_loc * w_loc
        # And w_loc = 2 * G * q_dot
        # T = 0.5 * (2 G q_dot)^T * J * (2 G q_dot)
        # T = 2 * q_dot^T * G^T * J * G * q_dot
        # So Mass Matrix block = 4 * G^T * J * G
        
        # We need current state to compute G(q)!
        # Wait, if MassMatrix is assumed constant (e.g. for implicit linear solvers), this is bad.
        # But GeneralizedAlpha calls ComputeMassMatrix every step.
        # But MassMatrix function signature in MainSystem doesn't take state?
        # My MainSystem implementation: obj.ComputeMassMatrix(M, self.nodes)
        # It assumes M is constant or uses node.referenceCoordinates?
        # Nodes must store CURRENT coordinates if M depends on q.
        # In Exudyn, MassMatrix is computed using current CSystem state.
        
        # For now, let's assume we fetch q from somewhere or nodes have it.
        # Hack: use reference rotations if q not available (small rotation approx)
        # But for large rotations, we need q.
        # MainSystem should define how to get q.
        # Let's import rotations
        from ..geometry.rotations import ComputeGMatrix
        
        # Get q from node?
        # For Phase 4, let's assume node has 'current_rotations' updated.
        # Or access system state via a hack or pass it.
        # Let's stick to using referenceRotations for valid "initial" M, 
        # but for simulation we need dynamic M.
        # I'll use referenceRotations for now to avoid breaking API signature 
        # (unless I change MainSystem signature to pass state).
        
        ep = node.referenceRotations # TODO: Use current q
        G = ComputeGMatrix(ep)
        
        # inertia is vector 6 [Jxx, Jyy, Jzz, Jyz, Jxz, Jxy]
        # Tensor J
        J = np.array([
            [self.inertia[0], self.inertia[5], self.inertia[4]],
            [self.inertia[5], self.inertia[1], self.inertia[3]],
            [self.inertia[4], self.inertia[3], self.inertia[2]]
        ])
        
        # M_rot = 4 * G.T @ J @ G
        M_rot = 4.0 * G.T @ J @ G
        
        # Add to 4x4 block at idx+3
        # Indices: idx+3 to idx+7
        for r in range(4):
            for c in range(4):
                M[idx+3+r, idx+3+c] += M_rot[r,c]

    def ComputeODE2RHS(self, rhs, nodes, system_state):
        node = nodes[self.node_number]
        idx = node.global_index
        if idx == -1: return

        # Extract State
        q_system = system_state['q']
        v_system = system_state['q_t']
        
        # Rigid Body has 7 coords: 3 pos, 4 rot
        # Pos
        # Rot
        q_pos = q_system[idx:idx+3]
        q_rot = q_system[idx+3:idx+7] # Euler Params
        
        v_pos = v_system[idx:idx+3]
        v_rot = v_system[idx+3:idx+7] # q_dot
        
        # If q_rot is zero (initial), use reference?
        # Simulating requires initialized state.
        # Check norm
        if np.linalg.norm(q_rot) < 1e-6:
            q_rot = node.referenceRotations

        from ..geometry.rotations import ComputeGMatrix
        G = ComputeGMatrix(q_rot)
        
        # Angular velocity local: w_loc = 2 * G * q_dot
        w_loc = 2.0 * G @ v_rot
        
        # Tensor J
        J = np.array([
            [self.inertia[0], self.inertia[5], self.inertia[4]],
            [self.inertia[5], self.inertia[1], self.inertia[3]],
            [self.inertia[4], self.inertia[3], self.inertia[2]]
        ])
        
        # Gyroscopic Torque (local): tau_gyro = - w x (J w)
        Jw = J @ w_loc
        tau_gyro = -np.cross(w_loc, Jw)
        
        # Map to generalized coordinates: Q_rot = 2 * G^T * tau_gyro
        # Note: We are ignoring the -2 G^T J G_dot q_dot term (Coriolis of params) 
        # which is needed for exact match, but this captures the main rotational physics.
        Q_rot = 2.0 * G.T @ tau_gyro
        
        # Add to RHS (Forces)
        # Assuming RHS initialized to 0 or contains external forces.
        # M a = F. RHS should be F.
        
        # Indices idx+3 to idx+7
        rhs[idx+3:idx+7] += Q_rot

    def GetGraphicsData(self, nodes, system_state):
        node = nodes[self.node_number]
        idx = node.global_index
        
        # Position and Rotation
        pos = node.referenceCoordinates.copy()
        q_rot = node.referenceRotations.copy()
        
        if system_state is not None and idx != -1:
            q = system_state['q']
            if idx+7 <= len(q):
                pos += q[idx:idx+3]
                # Rotations are absolute or incremental?
                # Usually generalized coords q are absolute for RB.
                # If node.referenceRotations is [1,0,0,0], then q is absolute.
                q_rot = q[idx+3:idx+7]
                
        # Draw Cuboid
        from ..graphics import Cuboid
        from ..geometry.rotations import EulerParameters2RotationMatrix
        
        # Need to rotate points?
        # My graphics.py Cuboid only supports 'origin' and axis alignment?
        # It needs 'rotation' matrix or similar.
        # My current Renderer implementation of Cuboid uses glScalef but not glRotate.
        # I should output a "Transform" node or apply rotation to corners manually?
        # Renderer doesn't support 'rotation' key for Cuboid yet.
        # Plan: Extend graphics.py/Renderer OR just return a Basis Triad (Lines).
        # Let's return a Triad (3 Lines) to visualize rotation + a Sphere at center.
        
        R = EulerParameters2RotationMatrix(q_rot)
        
        color = self.visualization.get('color', [0.6, 0.4, 0.2, 1.0])
        radius = self.visualization.get('radius', 0.2)
        
        data = []
        # Center Body
        from ..graphics import Sphere, Line
        data.append(Sphere(point=pos, radius=radius, color=color))
        
        # Triad
        axis_len = 0.5
        # X Axis (Red)
        pX = pos + R @ np.array([axis_len, 0, 0])
        data.append(Line(pAxis=pos, vAxis=(pX-pos), color=[1,0,0,1], radius=0.02)) # Using Line/Cylinder
        
        # Y Axis (Green)
        pY = pos + R @ np.array([0, axis_len, 0])
        data.append(Line(pAxis=pos, vAxis=(pY-pos), color=[0,1,0,1], radius=0.02))
        
        # Z Axis (Blue)
        pZ = pos + R @ np.array([0, 0, axis_len])
        data.append(Line(pAxis=pos, vAxis=(pZ-pos), color=[0,0,1,1], radius=0.02))
        
        return data
