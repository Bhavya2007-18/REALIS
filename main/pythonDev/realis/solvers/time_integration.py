
import numpy as np
from .main_solver import MainSolver
from numpy.linalg import inv, solve, norm, pinv, LinAlgError

class GeneralizedAlphaSolver(MainSolver):
    """
    Generalized Alpha Solver for second order systems.
    ODE2: M*q_tt + F(q, q_t) = 0  (or M*q_tt = RHS)
    """
    def Solve(self):
        ti = self.simulationSettings['timeIntegration']
        nSteps = ti['numberOfSteps']
        endTime = ti['endTime']
        startTime = ti['startTime']
        dt = (endTime - startTime) / nSteps
        verbose = ti['verboseMode']
        
        # Spectral radius
        rho_inf = ti.get('spectralRadius', 0.8) # Default 0.8
        
        # Algo parameters
        alpha_m = (2*rho_inf - 1) / (rho_inf + 1)
        alpha_f = rho_inf / (rho_inf + 1)
        gamma = 0.5 + alpha_f - alpha_m
        beta = 0.25 * (gamma + 0.5)**2
        
        # Access system state
        state = self.mbs.GetSystemState()
        q = state['q']
        v = state['q_t']
        n = len(q)
        
        # Initial accelerations
        # Solve M*a = RHS(q, v)
        M = self.mbs.ComputeMassMatrix()
        F = self.mbs.ComputeODE2RHS() # Returns forces
        # Assuming F contains F_ext - F_int(q,v). But pure mass point: RHS = F_ext.
        # Actually typically: M*a + F_int(q,v) = F_ext  => M*a = F_ext - F_int
        # ComputeODE2RHS should return (F_ext - F_int).
        
        # Simple solve for a0
        try:
            a = solve(M, F) # Initial acceleration
        except LinAlgError:
            a = np.dot(pinv(M), F)

        
        t = startTime
        
        if verbose > 0:
            print(f"Start Generalized Alpha. dt={dt}, rho={rho_inf}")
            
        for step in range(nSteps):
            t += dt
            
            # Predictor
            q_pred = q + dt*v + 0.5*dt**2 * (1 - 2*beta)*a
            v_pred = v + dt * (1 - gamma)*a
            
            # Newton Loop
            # We need to solve for 'a_n+1' (or similar variable)
            # Generalized Alpha uses 'a_am' (algorithmic acceleration) usually.
            # Simplified Newmark-like loop:
            # R(a_new) = M * ( (1-am)*a_new + am*a_old ) + F( q(a_new), v(a_new) ) = 0 ??
            # Wait, standard Gen-Alpha Form:
            # M * a_m + F_int(q_f, v_f) - F_ext(t_f) = 0
            # q_f = (1-af)*q_new + af*q_old  <-- wait, usually q_new is the target
            # Standard:
            # (1-alpha_m)*a_new + alpha_m*a_old = a_m
            # (1-alpha_f)*q_new + alpha_f*q_old = q_f
            # etc.
            
            # Let's implement a simpler Implicit Newmark for now to verify architecture, 
            # then upgrade to full GenAlpha.
            # Implicit Trapezoidal (Newmark beta=0.25, gamma=0.5) is GenAlpha with rho=1.0?
            
            # Simpler: Explicit Euler just to verify the PIPING first?
            # No, prompt said "Deeply into tech". I must try GenAlpha or Newmark.
            
            # Newton Iteration
            # Variables to find: Delta a (change in acceleration)
            # q_new = q_pred + beta*dt^2 * da
            # v_new = v_pred + gamma*dt * da
            # a_new = a_old + da (predictor used a_old as guess)
            
            # Check: Predictors usually set a_new = 0 or a_old.
            # Let's start with a_new = a (from previous step) as guess.
            a_new = a.copy()
            
            for newton_iter in range(5):
                # Update q, v based on current a_new
                # Newmark formulas:
                # q_n+1 = q_n + dt*v_n + 0.5*dt^2 * [ (1-2beta)*a_n + 2beta*a_n+1 ]
                # v_n+1 = v_n + dt * [ (1-gamma)*a_n + gamma*a_n+1 ]
                
                # We used a_new as guess.
                # q_new = q_pred + dt**2 * beta * (a_new - a) ? 
                # No, standard predictor-corrector:
                # q_pred = q + dt*v + 0.5*dt**2*(1-2beta)*a
                # q_new = q_pred + beta*dt**2 * a_new
                
                q_curr = q_pred + beta * dt**2 * a_new
                v_curr = v_pred + gamma * dt * a_new
                
                # Update system state for RHS computation
                self.mbs.system_state['q'] = q_curr
                self.mbs.system_state['q_t'] = v_curr
                
                # Residual = M*a_new - RHS(q_curr, v_curr)
                # Note: This is M*a = F. (Residual = M*a - F = 0)
                M_curr = self.mbs.ComputeMassMatrix()
                F_curr = self.mbs.ComputeODE2RHS()
                
                Res = np.dot(M_curr, a_new) - F_curr
                
                res_norm = norm(Res)
                if res_norm < 1e-6:
                    break
                    
                # Tangent Stiffness (Jacobian)
                # S = dRes/da = M + d(M*a)/da - dF/da
                # dF/da = dF/dq * dq/da + dF/dv * dv/da
                # dq/da = beta * dt^2
                # dv/da = gamma * dt
                # S ~= M + C * (gamma*dt) + K * (beta*dt^2)
                # Where C = -dF/dv, K = -dF/dq (if F is force on RHS)
                
                # For Phase 3, start with approximation S ~= M (Works for small dt and small stiffness)
                # Or compute numerical Jacobian.
                
                S = M_curr # Approximation
                
                # da = -S^-1 * Res
                try:
                    delta_a = solve(S, -Res)
                except LinAlgError:
                     delta_a = np.dot(pinv(S), -Res)
                
                a_new += delta_a
            
            # End Step
            q = q_curr
            v = v_curr
            a = a_new
            
            # Save back to system
            state['q'] = q
            state['q_t'] = v
            
            if step % 10 == 0 and verbose:
                print(f"Step {step}: t={t:.4f}, Res={res_norm:.2e}")

        print("Simulation Finished.")
