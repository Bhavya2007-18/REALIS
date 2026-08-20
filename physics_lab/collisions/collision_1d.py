

import numpy as np
import matplotlib.pyplot as plt


def elastic_collision_1d(m1: float, m2: float, v1: float, v2: float) -> tuple:
    
    v1_final = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2)
    v2_final = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2)
    
    return v1_final, v2_final


def inelastic_collision_1d(m1: float, m2: float, v1: float, v2: float, 
                          e: float = 0.5) -> tuple:
    
    
    v_cm = (m1 * v1 + m2 * v2) / (m1 + m2)
    
    
    v_rel_before = v1 - v2
    
    
    v_rel_after = -e * v_rel_before
    
    
    v1_final = v_cm + (m2 / (m1 + m2)) * v_rel_after
    v2_final = v_cm - (m1 / (m1 + m2)) * v_rel_after
    
    return v1_final, v2_final


def validate_collision_laws():
    
    print("=== 1D Collision Validation ===\n")
    
    
    m1, m2 = 2.0, 3.0  
    v1, v2 = 5.0, -2.0  
    
    print(f"Initial state:")
    print(f"  Mass 1: {m1} kg, velocity {v1} m/s")
    print(f"  Mass 2: {m2} kg, velocity {v2} m/s\n")
    
    
    v1_e, v2_e = elastic_collision_1d(m1, m2, v1, v2)
    
    
    p_before = m1 * v1 + m2 * v2
    p_after = m1 * v1_e + m2 * v2_e
    print(f"Elastic Collision:")
    print(f"  Final velocities: v1'={v1_e:.2f} m/s, v2'={v2_e:.2f} m/s")
    print(f"  Momentum before: {p_before:.2f} kg⋅m/s")
    print(f"  Momentum after: {p_after:.2f} kg⋅m/s")
    print(f"  Momentum conserved: {np.isclose(p_before, p_after)}")
    
    
    KE_before = 0.5 * m1 * v1**2 + 0.5 * m2 * v2**2
    KE_after = 0.5 * m1 * v1_e**2 + 0.5 * m2 * v2_e**2
    print(f"  KE before: {KE_before:.2f} J")
    print(f"  KE after: {KE_after:.2f} J")
    print(f"  Energy conserved: {np.isclose(KE_before, KE_after)}\n")
    
    
    v1_i, v2_i = inelastic_collision_1d(m1, m2, v1, v2, e=0.5)
    
    p_after_i = m1 * v1_i + m2 * v2_i
    KE_after_i = 0.5 * m1 * v1_i**2 + 0.5 * m2 * v2_i**2
    print(f"Inelastic Collision (e=0.5):")
    print(f"  Final velocities: v1'={v1_i:.2f} m/s, v2'={v2_i:.2f} m/s")
    print(f"  Momentum conserved: {np.isclose(p_before, p_after_i)}")
    print(f"  Energy lost: {KE_before - KE_after_i:.2f} J ({(KE_before - KE_after_i)/KE_before*100:.1f}%)\n")
    
    
    v1_pi, v2_pi = inelastic_collision_1d(m1, m2, v1, v2, e=0.0)
    print(f"Perfectly Inelastic (e=0):")
    print(f"  Final velocities: v1'={v1_pi:.2f} m/s, v2'={v2_pi:.2f} m/s")
    print(f"  Objects stick together: {np.isclose(v1_pi, v2_pi)}\n")


def plot_collision_restitution():
    
    m1, m2 = 1.0, 1.0
    v1, v2 = 3.0, 0.0
    
    e_values = np.linspace(0, 1, 50)
    v1_finals = []
    v2_finals = []
    energy_retained = []
    
    KE_initial = 0.5 * m1 * v1**2 + 0.5 * m2 * v2**2
    
    for e in e_values:
        v1_f, v2_f = inelastic_collision_1d(m1, m2, v1, v2, e)
        v1_finals.append(v1_f)
        v2_finals.append(v2_f)
        
        KE_final = 0.5 * m1 * v1_f**2 + 0.5 * m2 * v2_f**2
        energy_retained.append(KE_final / KE_initial)
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    ax1.plot(e_values, v1_finals, 'r-', label='Object 1', linewidth=2)
    ax1.plot(e_values, v2_finals, 'b-', label='Object 2', linewidth=2)
    ax1.set_xlabel('Coefficient of Restitution (e)')
    ax1.set_ylabel('Final Velocity (m/s)')
    ax1.set_title('Final Velocities vs Restitution')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    ax2.plot(e_values, energy_retained, 'g-', linewidth=2)
    ax2.set_xlabel('Coefficient of Restitution (e)')
    ax2.set_ylabel('Energy Retained (fraction)')
    ax2.set_title('Kinetic Energy Retention')
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('collision_restitution.png', dpi=150)
    print("📊 Plot saved to collision_restitution.png")


if __name__ == "__main__":
    validate_collision_laws()
    plot_collision_restitution()