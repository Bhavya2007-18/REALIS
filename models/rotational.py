import numpy as np

class RollingDisk:
    """
    Disk rolling down an inclined plane without slipping.
    State: [x, v] (Position along incline, Velocity)
    """
    def __init__(self, mass=1.0, radius=0.5, theta=np.pi/6):
        self.m = mass
        self.r = radius
        self.theta = theta # Incline angle
        self.g = 9.81
        self.system_type = "rolling_disk"
        
        # Moment of inertia for disk
        self.I = 0.5 * mass * radius**2

    def derivatives(self, state, t, params=None):
        x, v = state
        
        # a = g * sin(theta) / (1 + I/(m*r^2))
        # For disk I/(m*r^2) = 0.5. So a = 2/3 g sin(theta).
        
        # General derivation:
        # m*a = m*g*sin(theta) - f_friction
        # I*alpha = f_friction * r
        # a = alpha * r (no slip)
        # I * (a/r) = f * r => f = I*a / r^2
        # m*a = m*g*sin - I*a/r^2
        # a(m + I/r^2) = m*g*sin
        
        effective_mass = self.m + self.I / (self.r**2)
        force_gravity = self.m * self.g * np.sin(self.theta)
        
        acc = force_gravity / effective_mass
        
        return v, acc

    def total_energy(self, state):
        x, v = state
        
        # h = -x * sin(theta) (assuming x starts at 0 and goes down?)
        # Let's say x=0 is top. x>0 is down.
        # PE = m*g*h = m*g*(-x * sin(theta))
        
        # KE_trans = 0.5 * m * v^2
        # KE_rot = 0.5 * I * w^2 = 0.5 * I * (v/r)^2
        
        omega = v / self.r
        ke_trans = 0.5 * self.m * v**2
        ke_rot = 0.5 * self.I * omega**2
        
        pe = self.m * self.g * (-x * np.sin(self.theta))
        
        return ke_trans + ke_rot + pe
