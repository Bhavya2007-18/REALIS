
import numpy as np
from numpy.linalg import norm

def Skew(v):
    """Returns 3x3 skew symmetric matrix from 3D vector v."""
    return np.array([[0, -v[2], v[1]],
                     [v[2], 0, -v[0]],
                     [-v[1], v[0], 0]])

def EulerParameters2RotationMatrix(ep):
    """
    Convert Euler Parameters (q0, q1, q2, q3) to 3x3 Rotation Matrix.
    ep = [q0, q1, q2, q3] where q0 is scalar part.
    Formula: R = (2*q0^2 - 1)I + 2*q0*Skew(q) + 2*q*q^T
    Or standard text formula.
    """
    q0, q1, q2, q3 = ep
    
    R = np.zeros((3,3))
    
    R[0,0] = 1 - 2*(q2**2 + q3**2)
    R[0,1] = 2*(q1*q2 - q0*q3)
    R[0,2] = 2*(q1*q3 + q0*q2)
    
    R[1,0] = 2*(q1*q2 + q0*q3)
    R[1,1] = 1 - 2*(q1**2 + q3**2)
    R[1,2] = 2*(q2*q3 - q0*q1)
    
    R[2,0] = 2*(q1*q3 - q0*q2)
    R[2,1] = 2*(q2*q3 + q0*q1)
    R[2,2] = 1 - 2*(q1**2 + q2**2)
    
    return R

def ComputeGMatrix(ep):
    """
    Compute G matrix relating angular velocity w to Euler Parameter time derivative ep_t.
    ep_t = 0.5 * G^T * w
    w_local = 2 * G * ep_t
    
    G = [-q1,  q0,  q3, -q2]
        [-q2, -q3,  q0,  q1]
        [-q3,  q2, -q1,  q0]
    (Check Exudyn/Shabana definition)
    Exudyn uses:
    G = [ -q1  q0 -q3  q2 ]
        [ -q2  q3  q0 -q1 ]
        [ -q3 -q2  q1  q0 ]
    Note: G is 3x4.
    """
    q0, q1, q2, q3 = ep
    return np.array([
        [-q1,  q0, -q3,  q2],
        [-q2,  q3,  q0, -q1],
        [-q3, -q2,  q1,  q0]
    ])

def ComputeLMatrix(ep):
    """
    L matrix (Global frame angular velocity relation).
    """
    q0, q1, q2, q3 = ep
    return np.array([
        [-q1,  q0,  q3, -q2],
        [-q2, -q3,  q0,  q1],
        [-q3,  q2, -q1,  q0]
    ])

