import numpy as np

def solve_1d_collision(m1, m2, v1, v2, e=1.0):
    """
    Resolves a 1D collision between two masses using Newton's Law of Restitution.
    
    Conservation of Momentum:
    m1*v1 + m2*v2 = m1*v1' + m2*v2'
    
    Law of Restitution:
    v2' - v1' = -e * (v2 - v1)
    
    Args:
        m1, m2: Masses (kg)
        v1, v2: Initial velocities (m/s)
        e: Coefficient of restitution (0.0 = inelastic, 1.0 = elastic)
        
    Returns:
        (v1_next, v2_next, delta_E)
    """
    if m1 <= 0 or m2 <= 0:
        raise ValueError("Masses must be positive.")
    if not (0.0 <= e <= 1.0):
        # Physics Authority: e must be physical
        raise ValueError("Coefficient of restitution 'e' must be in [0, 1].")

    # Relative velocity
    v_rel = v2 - v1
    
    # If moving apart, no collision (should be handled by detector, but double check)
    # Actually, this function just solves the math. Detector decides IF they collide.
    
    # Momentum P = m1*v1 + m2*v2
    # Kinetic Energy before T = 0.5*m1*v1^2 + 0.5*m2*v2^2
    
    # Solution derived from system of eq:
    # v1' = ( m1*v1 + m2*v2 - m2*e*(v1 - v2) ) / (m1 + m2)
    # v2' = ( m1*v1 + m2*v2 - m1*e*(v2 - v1) ) / (m1 + m2)
    
    # Wait, simple formula check:
    # v2' - v1' = ... verified standard derivation.
    
    term_p = m1*v1 + m2*v2
    
    v1_next = (term_p - m2 * e * (v1 - v2)) / (m1 + m2)
    v2_next = (term_p - m1 * e * (v2 - v1)) / (m1 + m2)
    
    # Energy accounting
    ke_prev = 0.5 * m1 * v1**2 + 0.5 * m2 * v2**2
    ke_next = 0.5 * m1 * v1_next**2 + 0.5 * m2 * v2_next**2
    
    # Delta E should be <= 0 (dissipation)
    delta_e = ke_next - ke_prev
    
    return v1_next, v2_next, delta_e

def check_momentum(m1, m2, v1, v2, v1n, v2n, tol=1e-9):
    p_pre = m1*v1 + m2*v2
    p_post = m1*v1n + m2*v2n
    return abs(p_post - p_pre) < tol
