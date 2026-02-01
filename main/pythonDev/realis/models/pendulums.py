import numpy as np

class SimplePendulum:
    """
    Simple Gravity Pendulum (point mass at end of massless rod).
    State: [theta, omega]
    theta: Angle from vertical down (radians). 0 = rest.
    omega: Angular velocity (rad/s).
    """
    def __init__(self, length=1.0, mass=1.0, damping=0.0):
        self.L = length
        self.m = mass
        self.c = damping
        self.g = 9.81
        self.system_type = "simple_pendulum"

    def derivatives(self, state, t, params=None):
        theta, omega = state
        
        # d(theta)/dt = omega
        d_theta = omega
        
        # d(omega)/dt = - (g/L)sin(theta) - (c/m)omega
        # Torque = -m*g*L*sin(theta)
        # I = m*L^2
        # alpha = Torque / I = - (g/L)sin(theta)
        d_omega = - (self.g / self.L) * np.sin(theta) - (self.c / self.m) * omega
        
        return d_theta, d_omega

    def total_energy(self, state):
        theta, omega = state
        # KE = 0.5 * I * w^2 = 0.5 * (m*L^2) * w^2
        ke = 0.5 * (self.m * self.L**2) * omega**2
        
        # PE = m*g*h. h = L(1 - cos(theta)) relative to bottom.
        pe = self.m * self.g * self.L * (1.0 - np.cos(theta))
        return ke + pe


class DoublePendulum:
    """
    Planar Double Pendulum.
    State: [theta1, theta2, p1, p2] ?? Or [theta1, theta2, w1, w2]?
    Using [theta1, theta2, w1, w2] for easier standard ODE integration.
    
    Ref: https://scienceworld.wolfram.com/physics/DoublePendulum.html
    """
    def __init__(self, L1=1.0, L2=1.0, m1=1.0, m2=1.0, g=9.81):
        self.L1 = L1
        self.L2 = L2
        self.m1 = m1
        self.m2 = m2
        self.g = g
        self.system_type = "double_pendulum"

    def derivatives(self, state, t, params=None):
        # State: theta1, theta2, w1, w2
        q1, q2, w1, w2 = state
        
        m1, m2 = self.m1, self.m2
        L1, L2 = self.L1, self.L2
        g = self.g
        
        # Precompute common terms
        sin_d = np.sin(q1 - q2)
        cos_d = np.cos(q1 - q2)
        den = 2*m1 + m2 - m2 * np.cos(2*q1 - 2*q2)
        
        # Equations of motion (Explicit form for w1_dot, w2_dot)
        # w1_dot
        w1_num = -g*(2*m1 + m2)*np.sin(q1) - m2*g*np.sin(q1 - 2*q2) \
                 - 2*sin_d*m2*(w2**2*L2 + w1**2*L1*cos_d)
        w1_dot = w1_num / (L1 * den)
        
        # w2_dot
        w2_num = 2*sin_d*(w1**2*L1*(m1+m2) + g*(m1+m2)*np.cos(q1) + w2**2*L2*m2*cos_d)
        w2_dot = w2_num / (L2 * den)
        
        return w1, w2, w1_dot, w2_dot

    def total_energy(self, state):
        q1, q2, w1, w2 = state
        m1, m2 = self.m1, self.m2
        L1, L2 = self.L1, self.L2
        g = self.g
        
        # Kinetic Energy
        # T = 0.5*m1*(L1*w1)^2 + 0.5*m2*((L1*w1)^2 + (L2*w2)^2 + 2*L1*L2*w1*w2*cos(q1-q2))
        T = 0.5 * m1 * (L1 * w1)**2 + 0.5 * m2 * (
            (L1 * w1)**2 + (L2 * w2)**2 + 2 * L1 * L2 * w1 * w2 * np.cos(q1 - q2)
        )
        
        # Potential Energy (y is locally down? No, standard physics y is up).
        # y1 = -L1 cos(q1)
        # y2 = -L1 cos(q1) - L2 cos(q2)
        y1 = -L1 * np.cos(q1)
        y2 = y1 - L2 * np.cos(q2)
        
        V = m1 * g * y1 + m2 * g * y2
        
        # Shift reference to lowest point?
        # Lowest point is when q1=0, q2=0 => y1 = -L1, y2 = -L1-L2.
        # V_min = -m1*g*L1 - m2*g*(L1+L2).
        # Let's return relative energy or absolute. Absolute is fine.
        return T + V
