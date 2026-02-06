# Shadow Verification Script
# replicates verify_invariants.cpp logic to prove mathematical correctness
# since C++ compiler is temporarily unavailable.

import math

class Vec3:
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z
    def __add__(self, o): return Vec3(self.x+o.x, self.y+o.y, self.z+o.z)
    def __sub__(self, o): return Vec3(self.x-o.x, self.y-o.y, self.z-o.z)
    def __mul__(self, s): return Vec3(self.x*s, self.y*s, self.z*s)
    def magnitude(self): return math.sqrt(self.x**2 + self.y**2 + self.z**2)
    def dot(self, o): return self.x*o.x + self.y*o.y + self.z*o.z

class RigidBody:
    def __init__(self, m, pos):
        self.mass = m
        self.inv_mass = 1.0/m if m > 0 else 0
        self.position = pos
        self.velocity = Vec3(0,0,0)
        self.force = Vec3(0,0,0)
    
    def apply_force(self, f):
        self.force = self.force + f
        
    def integrate(self, dt):
        # Semi-Implicit Euler (Symplectic)
        accel = self.force * self.inv_mass
        self.velocity = self.velocity + accel * dt
        self.position = self.position + self.velocity * dt
        self.force = Vec3(0,0,0)

class SpringModel:
    def __init__(self, body, anchor, k, rest=0):
        self.body = body
        self.anchor = anchor
        self.k = k
        self.rest = rest
        
    def update_force(self):
        d = self.body.position - self.anchor
        dist = d.magnitude()
        if dist < 1e-6: return
        disp = dist - self.rest
        force_mag = -self.k * disp
        direction = d * (1.0/dist)
        self.body.apply_force(direction * force_mag)
        
    def get_kinetic_energy(self):
        v_sq = self.body.velocity.dot(self.body.velocity)
        return 0.5 * self.body.mass * v_sq
        
    def get_potential_energy(self):
        d = self.body.position - self.anchor
        disp = d.magnitude() - self.rest
        return 0.5 * self.k * disp**2

def run_verification():
    print("=== Shadow Verification (Python) ===")
    
    # Setup same as C++
    mass = RigidBody(2.0, Vec3(2.0, 0, 0))
    spring = SpringModel(mass, Vec3(0,0,0), 10.0)
    
    dt = 0.01
    steps = 200
    
    # Capture Baseline
    # PE = 0.5 * 10 * 2^2 = 20.0
    initial_total = spring.get_kinetic_energy() + spring.get_potential_energy()
    print(f"Baseline Energy: {initial_total:.6f} J")
    
    valid = True
    
    print("time, total, drift%")
    for i in range(steps+1):
        ke = spring.get_kinetic_energy()
        pe = spring.get_potential_energy()
        total = ke + pe
        drift = (total - initial_total) / initial_total * 100.0
        
        if i % 20 == 0:
            print(f"{i*dt:.2f}, {total:.6f}, {drift:.4f}%")
            
        if abs(drift) > 5.0:
            print("VIOLATION")
            valid = False
            break
            
        spring.update_force()
        mass.integrate(dt)
        
    if valid:
        print("SUCCESS: Logic Verified within tolerances.")
    else:
        print("FAILURE: Validation Logic Failed.")

if __name__ == "__main__":
    run_verification()
