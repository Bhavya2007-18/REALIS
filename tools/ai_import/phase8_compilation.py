from typing import List, Dict
from ..server import SimulationRequest, SceneObject, PhysicsConstraint, CadGeometry, PhysicsProperties, Vector3, Vector2
from .models import SceneGraph, Node, Edge

def compile_to_physics_request(scene_graph: SceneGraph) -> SimulationRequest:
    
    engine_objects: List[SceneObject] = []
    engine_constraints: List[PhysicsConstraint] = []
    
    
    for node in scene_graph.nodes:
        
        geo_type = "sphere" if node.shape == "circle" else "box"
        
        
        dimensions = Vector3(x=1.0, y=1.0, z=1.0) 
        if geo_type == "box":
            dimensions = Vector3(x=2.0, y=2.0, z=0.5)
            
        geometry = CadGeometry(
            id=node.id,
            type=geo_type,
            position=Vector3(x=node.position.x, y=node.position.y, z=0),
            rotation=Vector3(x=0, y=0, z=node.rotation),
            dimensions=dimensions
        )
        
        physics = PhysicsProperties(
            mass=node.mass,
            restitution=node.restitution,
            friction=node.friction,
            is_static=(node.type == "static_body")
        )
        
        engine_objects.append(SceneObject(
            id=node.id,
            geometry=geometry,
            physics=physics
        ))

    
    for edge in scene_graph.edges:
        if edge.type == "hinge_joint":
            
            engine_constraints.append(PhysicsConstraint(
                id=edge.id,
                type="hinge",
                target_a=edge.target_a,
                target_b=edge.target_b,
                pivot_a=Vector3(x=edge.anchor_a.x, y=edge.anchor_a.y, z=0),
                pivot_b=Vector3(x=edge.anchor_b.x, y=edge.anchor_b.y, z=0) if edge.anchor_b else None
            ))
        elif edge.type == "distance_joint":
            engine_constraints.append(PhysicsConstraint(
                id=edge.id,
                type="distance",
                target_a=edge.target_a,
                target_b=edge.target_b,
                distance=edge.length or 1.0
            ))

    
    return SimulationRequest(
        objects=engine_objects,
        constraints=engine_constraints,
        time_step=0.016, 
        gravity=Vector3(x=0, y=-9.81, z=0)
    )