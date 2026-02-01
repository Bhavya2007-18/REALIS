import numpy as np

def estimate_order_of_accuracy(solver_step_fn, system, state0, t_span, dt_base):
    """
    Estimates the numerical Order of Accuracy (p) of a solver.
    
    Comparing error at dt vs error at dt/2.
    If exact solution is available, Error = |numerical - exact|.
    p ~ log2(Error(dt) / Error(dt/2))
    
    Args:
        solver_step_fn: Function(state, t, dt, derivatives, params)
        system: Object with .derivatives and .exact_solution methods
        state0: Initial state (x, v)
        t_span: Total simulation time duration
        dt_base: The coarse time step to start with
        
    Returns:
        p: Estimated order of accuracy
    """
    
    def run_sim(dt):
        t = 0.0
        state = state0
        steps = int(t_span / dt)
        
        # Adjust dt slightly if steps don't perfectly divide t_span
        # to ensure we end exactly at t_span
        dt_actual = t_span / steps 
        
        for _ in range(steps):
            state = solver_step_fn(state, t, dt_actual, system.derivatives, None)
            t += dt_actual
        return state

    # Run at dt_base
    final_state_dt = run_sim(dt_base)
    
    # Run at dt_base / 2
    final_state_half = run_sim(dt_base / 2.0)
    
    # Run at dt_base / 4 (for confirmation, though we verify on first pair)
    final_state_quarter = run_sim(dt_base / 4.0)

    # Get exact solution at t_span
    exact_x, exact_v = system.exact_solution(t_span, state0)
    
    # Measure error in position (x)
    # Could combine x and v, but x is primary variable usually.
    
    def get_error(state):
        return abs(state[0] - exact_x)
        
    err_1 = get_error(final_state_dt)
    err_2 = get_error(final_state_half)
    err_3 = get_error(final_state_quarter)
    
    # Calculate Order p
    # Error(dt) = C * dt^p
    # Error(dt/2) = C * (dt/2)^p
    # Ratio = 2^p
    # p = log2(Ratio)
    
    if err_2 < 1e-15: # Avoid division by zero or machine precision noise
        return 0.0 # Perfect? Or effectively infinite order? Treat as unknown/perfect.
        
    ratio = err_1 / err_2
    p = np.log2(ratio) if ratio > 0 else 0.0
    
    return p
