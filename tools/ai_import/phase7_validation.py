from typing import List, Dict, Optional
from .models import SceneGraph, Node, Edge, Vector2D, CVExtractionOutput, SemanticObject, Relationship

def generate_and_validate_scene_graph(cv_output: CVExtractionOutput, semantic_objects: List[SemanticObject], relationships: List[Relationship]) -> Dict[str, any]:
    """
    Converts semantic labels and primitives into a stable IR Scene Graph.
    Normalizes coordinates (centers the image) and performs physics validation.
    """
    nodes: List[Node] = []
    edges: List[Edge] = []
    
    # Grid/Unit extraction (assuming 1 pixel = 0.1 meters or similar)
    units_per_pixel = 0.5 
    origin = Vector2D(x=cv_output.image_width / 2, y=cv_output.image_height / 2)

    # Convert SemanticObjects to Nodes
    for obj in semantic_objects:
        geom = next(it for it in cv_output.items if it.id == obj.geometry_ref)
        
        # Normalize positions (offset from origin)
        pos = Vector2D(x=(geom.center.x - origin.x) * units_per_pixel, 
                       y=(origin.y - geom.center.y) * units_per_pixel) if geom.center else Vector2D(x=0, y=0)

        # Default properties
        shape = "circle" if geom.type == "circle" else "rect"
        mass = 1.0
        
        # Heuristic for static objects (marked with labels like "ground" or "floor" in a real scenario)
        is_static = obj.label and ("ground" in obj.label or "floor" in obj.label)
        
        nodes.append(Node(
            id=obj.id,
            type="static_body" if is_static else "rigid_body",
            shape=shape,
            position=pos,
            mass=mass,
            restitution=0.5,
            friction=0.3
        ))

    # Convert Relationships to Edges
    for rel in relationships:
        if rel.type == "connected":
            edges.append(Edge(
                id=f"edge_{uuid.uuid4()}",
                type="hinge_joint",
                target_a=rel.a,
                target_b=rel.b,
                anchor_a=Vector2D(x=0, y=0), # Placeholder for anchor
                anchor_b=Vector2D(x=0, y=0)
            ))

    # --- Physics Validation Layer (Phase 7.5) ---
    valid = True
    warnings = []
    
    # 1. Disconnected check
    if len(nodes) > 1 and len(edges) == 0:
        warnings.append("System contains multiple bodies but no constraints. They will fall independently.")
    
    # 2. Impossible mass distributions (placeholder)
    for n in nodes:
        if n.mass <= 0:
            valid = False
            warnings.append(f"Node {n.id} has invalid mass.")

    # 3. Floating rigid bodies check
    # If no gravity is applied or no static body exists, bodies might just float or fall forever
    static_exists = any(n.type == "static_body" for n in nodes)
    if not static_exists:
        warnings.append("No static 'floor' or 'ground' detected. The system may fall infinitely.")

    return {
        "scene_graph": SceneGraph(nodes=nodes, edges=edges, units_per_pixel=units_per_pixel, origin=origin),
        "validation": {
            "valid": valid,
            "warnings": warnings,
            "auto_fixes": [] # Could auto-add a floor
        }
    }

import uuid
