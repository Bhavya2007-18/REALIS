from core.materials import linear_springs_force
from core.mechanics import newton_second_law

def derivatives(state , t ,params):  # numberical ODE solver == Given the current state, how is the system changing right now
    x,v=state  # x=postion, v=velocity
    k,m=params  # k=spring constant, m=mass
    
    force=linear_springs_force(k,x) # force calc
    a=newton_second_law(force,m)   # acc calc
    
    return v,a  # return dx/dt=v , dv/dt=a
# its a harmonic oscillator model