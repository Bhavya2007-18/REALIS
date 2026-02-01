
import numpy as np
import realis

def test_rigid_body():
    print("Initializing Rigid Body System...")
    mbs = realis.MainSystem()
    
    # Create Rigid Body Node
    # Initial Rotation: Identity [1,0,0,0]
    # Initial Ang Vel: Spin about Z axis [0,0,5]
    node = realis.NodeRigidBody(name="RBNode", 
                                referenceCoordinates=[0,0,0], 
                                referenceRotations=[1,0,0,0],
                                initialAngularVelocities=[0,0,5.0])
    
    n0 = mbs.AddNode(node.GetDictionary())
    
    # Create Rigid Body Object
    # Inertia: Asymmetric to see Dzhanibekov effect or just nutation?
    # Simple brick: [1, 2, 3] diagonal inertia
    obj = realis.ObjectRigidBody(name="Brick", 
                                 physicsMass=1.0, 
                                 physicsInertia=[1, 2, 3, 0, 0, 0], 
                                 nodeNumber=n0,
                                 visualization={'radius': 0.5, 'color': [0.8, 0.4, 0.2, 1]})
    
    mbs.AddObject(obj.GetDictionary())
    
    print("Assembling...")
    mbs.Assemble()
    
    print("Solving...")
    solver = realis.GeneralizedAlphaSolver()
    # 2 seconds simulation
    solver.InitializeSolver(mbs, {'timeIntegration': {'numberOfSteps': 200, 'endTime': 2.0, 'startTime': 0.0, 'verboseMode': 1}})
    solver.Solve()
    
    state = mbs.GetSystemState()
    print("Final State q (Rot part):", state['q'][3:7])
    
    # Verification:
    # Energy should be conserved (approximately)
    # Check if rotation changed (it should, due to gyroscopic precession if J is asymmetric and axis not principal?)
    # If spinning about Z (principal axis Jzz=3), and Jxx!=Jyy, it should stay stable?
    # If spinning about intermediate axis, it flips.
    # Let's just run it to ensure no crash.

if __name__ == "__main__":
    test_rigid_body()
