
import numpy as np
import realis

def debug_assembly():
    print("Initializing...")
    mbs = realis.MainSystem()
    
    node = realis.NodeRigidBody(name="RBNode", 
                                referenceCoordinates=[0,0,0], 
                                referenceRotations=[1,0,0,0],
                                initialAngularVelocities=[0,0,5.0])
    
    mbs.AddNode(node.GetDictionary())
    
    print("Assembling...")
    mbs.Assemble()
    
    state = mbs.GetSystemState()
    print("State q:", state['q'])
    print("State q_t:", state['q_t'])
    
    # Check if q_t has values at [3:7]
    rot_v = state['q_t'][3:7]
    print("Rotational Velocity q_dot:", rot_v)
    
    if np.linalg.norm(rot_v) > 0:
        print("SUCCESS: Velocity initialized.")
    else:
        print("FAILURE: Velocity is zero.")

if __name__ == "__main__":
    debug_assembly()
