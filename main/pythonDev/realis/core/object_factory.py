
class ObjectFactory:
    """
    Factory class to create objects from dictionaries.
    Mirrors Exudyn's MainObjectFactory.
    """
    
    @staticmethod
    def CreateNode(node_dict):
        node_type = node_dict.get('nodeType')
        if not node_type:
            raise ValueError("Dictionary must contain 'nodeType'")
        
        # Dispatch to specific node classes
        # For now, we manually dispatch. Later we can use registration.
        if node_type == 'NodePoint':
            from ..models.mass_point import NodePoint
            return NodePoint(node_dict)
        elif node_type == 'NodeRigidBody':
             from ..models.rigid_body import NodeRigidBody
             return NodeRigidBody(node_dict)
        else:
            raise ValueError(f"Unknown node type: {node_type}")

    @staticmethod
    def CreateObject(object_dict):
        object_type = object_dict.get('objectType')
        if not object_type:
             raise ValueError("Dictionary must contain 'objectType'")
             
        if object_type == 'ObjectMassPoint':
            from ..models.mass_point import ObjectMassPoint
            return ObjectMassPoint(object_dict)
        elif object_type == 'ObjectRigidBody':
            from ..models.rigid_body import ObjectRigidBody
            return ObjectRigidBody(object_dict)
        elif object_type == 'ObjectConnectorSpringDamper':
            from ..models.connectors import ObjectConnectorSpringDamper
            return ObjectConnectorSpringDamper(object_dict)
        else:
            raise ValueError(f"Unknown object type: {object_type}")
