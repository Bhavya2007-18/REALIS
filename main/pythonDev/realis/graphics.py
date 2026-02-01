
import numpy as np

class GraphicsData:
    """
    Namespace for graphics dictionary types.
    """
    Type = 'type'
    Sphere = 'Sphere'
    Cuboid = 'Cuboid'
    Line = 'Line'
    # Keys
    Origins = 'origins' # List of points
    Radius = 'radius'
    Color = 'color'

def Sphere(point=[0,0,0], radius=0.1, color=[0.5,0.5,0.5,1]):
    return {
        'type': 'Sphere',
        'origin': np.array(point),
        'radius': radius,
        'color': np.array(color)
    }

def Cuboid(point=[0,0,0], size=[1,1,1], color=[0.5,0.5,0.5,1]):
    return {
        'type': 'Cuboid',
        'origin': np.array(point),
        'size': np.array(size),
        'color': np.array(color)
    }
    
def Cylinder(pAxis=[0,0,0], vAxis=[1,0,0], radius=0.1, color=[0.5,0.5,0.5,1]):
    return {
        'type': 'Cylinder',
        'pAxis': np.array(pAxis),
        'vAxis': np.array(vAxis),
        'radius': radius,
        'color': np.array(color)
    }
