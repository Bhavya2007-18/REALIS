
import numpy as np

class ItemInterface:
    def GetDictionary(self):
        raise NotImplementedError("Base class")

class NodePoint(ItemInterface):
    """
    A 3D node with 3 translational degrees of freedom.
    """
    def __init__(self, name="", referenceCoordinates=[0,0,0]):
        self.name = name
        self.referenceCoordinates = referenceCoordinates
    
    def GetDictionary(self):
        return {
            'nodeType': 'NodePoint',
            'name': self.name,
            'referenceCoordinates': self.referenceCoordinates
        }

class ObjectMassPoint(ItemInterface):
    """
    A point mass attached to a NodePoint.
    """
    def __init__(self, name="", physicsMass=1.0, nodeNumber=0, visualization=None):
        self.name = name
        self.physicsMass = physicsMass
        self.nodeNumber = nodeNumber
        self.visualization = visualization
        
    def GetDictionary(self):
        return {
            'objectType': 'ObjectMassPoint',
            'name': self.name,
            'physicsMass': self.physicsMass,
            'nodeNumber': self.nodeNumber,
            'visualization': self.visualization
        }

class ObjectConnectorSpringDamper(ItemInterface):
    """
    A linear spring-damper between two nodes.
    """
    def __init__(self, name="", stiffness=0.0, damping=0.0, nodeNumbers=[0,0], visualization=None):
        self.name = name
        self.stiffness = stiffness
        self.damping = damping
        self.nodeNumbers = nodeNumbers
        self.visualization = visualization
    
    def GetDictionary(self):
        return {
            'objectType': 'ObjectConnectorSpringDamper',
            'name': self.name,
            'stiffness': self.stiffness,
            'damping': self.damping,
            'nodeNumbers': self.nodeNumbers,
            'visualization': self.visualization
        }
class NodeRigidBody(ItemInterface):
    """
    A rigid body node with 3 translation + 3 rotation coordinates (Euler Parameters or Lie Group).
    """
    def __init__(self, name="", referenceCoordinates=[0,0,0], initialVelocities=[0,0,0], 
                 referenceRotations=[1,0,0,0], initialAngularVelocities=[0,0,0]):
        self.name = name
        self.referenceCoordinates = referenceCoordinates
        self.initialVelocities = initialVelocities
        self.referenceRotations = referenceRotations # [q0, q1, q2, q3]
        self.initialAngularVelocities = initialAngularVelocities
    
    def GetDictionary(self):
        return {
            'nodeType': 'NodeRigidBody',
            'name': self.name,
            'referenceCoordinates': self.referenceCoordinates,
            'initialVelocities': self.initialVelocities,
            'referenceRotations': self.referenceRotations,
            'initialAngularVelocities': self.initialAngularVelocities
        }

class ObjectRigidBody(ItemInterface):
    """
    A rigid body object with mass and inertia.
    """
    def __init__(self, name="", physicsMass=1.0, physicsInertia=[1,1,1,0,0,0], nodeNumber=0, visualization=None):
        self.name = name
        self.physicsMass = physicsMass
        self.physicsInertia = physicsInertia # [Jxx, Jyy, Jzz, Jyz, Jxz, Jxy]
        self.nodeNumber = nodeNumber
        self.visualization = visualization
        
    def GetDictionary(self):
        return {
            'objectType': 'ObjectRigidBody',
            'name': self.name,
            'physicsMass': self.physicsMass,
            'physicsInertia': self.physicsInertia,
            'nodeNumber': self.nodeNumber,
            'visualization': self.visualization
        }

