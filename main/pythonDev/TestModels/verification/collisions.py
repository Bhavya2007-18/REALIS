import numpy as np

def verify_collision_validity(m1, m2, v1, v2, v1n, v2n, e):
    """
    Strict verification of a collision event.
    Returns (Passed: bool, Report: str)
    """
    
    # 1. Momentum
    p_pre = m1*v1 + m2*v2
    p_post = m1*v1n + m2*v2n
    p_err = abs(p_post - p_pre)
    
    # 2. Energy
    ke_pre = 0.5*m1*v1**2 + 0.5*m2*v2**2
    ke_post = 0.5*m1*v1n**2 + 0.5*m2*v2n**2
    e_loss = ke_pre - ke_post
    
    # 3. Restitution
    # v2' - v1' = -e(v2 - v1)
    v_rel_pre = v2 - v1
    v_rel_post = v2n - v1n
    expected_post = -e * v_rel_pre
    r_err = abs(v_rel_post - expected_post)
    
    passed = True
    report = []
    
    if p_err > 1e-9:
        passed = False
        report.append(f"FAIL: Momentum Broken (Err={p_err:.2e})")
    
    if e_loss < -1e-9: # Allowing tiny numerical noise
        passed = False
        report.append(f"FAIL: Energy Created (Gain={-e_loss:.2e})")
        
    if r_err > 1e-9:
        passed = False
        report.append(f"FAIL: Restitution Mismatch (Err={r_err:.2e})")
        
    if passed:
        report.append("PASS: Physics Valid")
        
    return passed, "; ".join(report)
