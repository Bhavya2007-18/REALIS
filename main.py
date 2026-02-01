import sys
from verification.benchmarks import HarmonicOscillator
from verification.convergence import estimate_order_of_accuracy
from verification.conservation import calculate_energy_error
from solvers.euler import step as euler_step
from solvers.rk4 import step as rk4_step

# Try to import CLI, but don't fail if partially implemented
try:
    from interface.cli import start_cli
    HAS_CLI = True
except ImportError:
    HAS_CLI = False

def run_verification_demo():
    print("========================================")
    print("   REALIS PHYSICS VERIFICATION SUITE    ")
    print("========================================")
    print("Verifying Solvers against Analytical Harmonic Oscillator")
    print("System: Mass-Spring (k=10.0, m=1.0)")
    
    # Setup Benchmark
    k, m = 10.0, 1.0
    system = HarmonicOscillator(k, m)
    state0 = (1.0, 0.0)
    t_span = 2.0 * 3.14159265359 # Approx one period
    
    # 1. Convergence Order Analysis
    print("\n[Test 1] Convergence Order (refinement analysis)")
    
    # Euler (1st Order)
    p_euler = estimate_order_of_accuracy(euler_step, system, state0, t_span, 0.01)
    print(f"  Euler Order: {p_euler:.4f} (Target: 1.0)")
    
    # RK4 (4th Order)
    p_rk4 = estimate_order_of_accuracy(rk4_step, system, state0, t_span, 0.05)
    print(f"  RK4 Order:   {p_rk4:.4f} (Target: 4.0)")
    
    # Assertions
    if abs(p_euler - 1.0) > 0.2:
        print("  ❌ Euler convergence suspect!")
    else:
        print("  ✅ Euler convergence normal.")
        
    if abs(p_rk4 - 4.0) > 0.1:
        print("  ❌ RK4 convergence suspect!")
    else:
        print("  ✅ RK4 convergence normal.")

    # 2. Conservation / Stability Analysis
    print("\n[Test 2] Energy Conservation (Long-run stability)")
    dt = 0.01
    steps = 1000
    print(f"  Running {steps} steps at dt={dt}...")
    
    # Helper to run loop
    def run_loop(name, stepper):
        t = 0.0
        s = state0
        history = [s]
        for _ in range(steps):
            s = stepper(s, t, dt, system.derivatives, None)
            history.append(s)
            t += dt
        
        # Analyze
        max_err, _, drift = calculate_energy_error(history, system)
        print(f"  {name}: Drift = {drift:+.2e} | Max Rel Err = {max_err:.2e}")
        return max_err
        
    e_err = run_loop("Euler", euler_step)
    r_err = run_loop("RK4  ", rk4_step)
    
    if r_err < 1e-5:
         print("  ✅ RK4 stability excellent.")
    else:
         print("  ⚠️ RK4 showing significant drift.")

    print("\nVerification Complete.")

def main():
    # If arguments provided, maybe parse them. For now, default to verification demo.
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        if HAS_CLI:
            start_cli()
        else:
            print("CLI module not available.")
    else:
        run_verification_demo()

if __name__ == "__main__":
    main()
