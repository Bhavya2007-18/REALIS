
import numpy as np
import realis

def test_mass_spring():
    print("Initializing System...")
    mbs = realis.MainSystem()
    
    # Create Nodes
    # Node 0: Fixed at [0,0,0] via Spring? Or just set mass=0? 
    # Better: Connector between Node0 (Fixed) and Node1 (Moving).
    # But current MassPoint logic doesn't support "Ground".
    # Let's effectively fix Node 0 by not giving it a mass object.
    # Note: MainSystem.ComputeMassMatrix initializes M with 0. 
    # If no mass object adds mass to Node 0 indices, it will be singular.
    # We need a "Ground" or "Constraint".
    # Or just use large mass for Node 0.
    
    node0 = realis.NodePoint(name="Ground", referenceCoordinates=[0,0,0])
    n0 = mbs.AddNode(node0.GetDictionary())
    
    node1 = realis.NodePoint(name="Mass", referenceCoordinates=[1,0,0])
    n1 = mbs.AddNode(node1.GetDictionary())
    
    # Create Objects
    # Fix Node 0 by NOT adding mass? 
    # If M is singular, Solver fails.
    # Hack: Add Huge Mass to Node 0.
    m0 = realis.ObjectMassPoint(name="GroundMass", physicsMass=1e10, nodeNumber=n0)
    mbs.AddObject(m0.GetDictionary())
    
    m1 = realis.ObjectMassPoint(name="MovingMass", physicsMass=1.0, nodeNumber=n1)
    mbs.AddObject(m1.GetDictionary())
    
    # Connector
    # Spring length = 0 (rest). Distance = 1. Force = k*(1-0) = k.
    # Stiffness = 10. Force = 10. a = 10/1 = 10.
    spring = realis.ObjectConnectorSpringDamper(name="Spring", stiffness=10.0, damping=0.5, nodeNumbers=[n0, n1])
    mbs.AddObject(spring.GetDictionary())
    
    print("Assembling...")
    mbs.Assemble()
    
    print("Solving...")
    solver = realis.GeneralizedAlphaSolver()
    solver.InitializeSolver(mbs, {'timeIntegration': {'numberOfSteps': 50, 'endTime': 1.0, 'startTime': 0.0, 'verboseMode': 1}})
    solver.Solve()
    
    state = mbs.GetSystemState()
    # Check if mass moved
    # Initial X=1. Force pulls to 0. 
    # Should oscillate.
    
    print("Final State q:", state['q'])
    
    # Verification
    # Index of Node 1 X-coord: Node0(3) + Node1(0) = 3
    final_x = state['q'][3] 
    print(f"Node 1 Displacement X: {final_x}")
    # Initial disp X was 0 (relative to ref coord).
    # Wait, 'q' is displacement from reference.
    # Ref[1] = [1,0,0]. q[1] starts at 0.
    # Force pulls towards Node0 ([0,0,0]).
    # So Mass is at x=1. Force = -k*x = -10.
    # q should decrease (become negative) if it represents displacement from x=1 towards x=0.
    
    if abs(final_x) > 1e-4:
        print("SUCCESS: Mass moved.")
    else:
        print("FAILURE: Mass did not move.")

if __name__ == "__main__":
    test_mass_spring()
