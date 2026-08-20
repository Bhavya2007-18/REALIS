import uuid
import random
from .models import (
    GeometryPrimitive, ExtractionResult, SemanticObject, SemanticResult,
    Relationship, RelationshipResult, SystemHypothesis, HypothesisResult,
    FusionResult, SceneGraphNode, SceneGraphEdge, SceneGraph, ValidationResult,
    EnginePayload, PhysicalProperties
)

# Deterministic mocks for CV & AI steps to fulfill architectural constraints.
# In a real implementation, Phase 2 uses OpenCV to extract contours, and Phase 3 uses object detection.

def run_phase_2(image_base64: str) -> ExtractionResult:
    """Phase 2: Vision Geometry Extraction (Deterministic CV ops)"""
    # Deterministic Mock: Extract a block and a wheel if the image is valid.
    return ExtractionResult(
        lines=[],
        circles=[GeometryPrimitive(id="geom_c1", type="circle", data={"cx": 0, "cy": 10, "r": 5})],
        polygons=[GeometryPrimitive(id="geom_p1", type="polygon", data={"points": [[-10,0], [10,0], [10,2], [-10,2]]})]
    )

def run_phase_3(geom: ExtractionResult) -> SemanticResult:
    """Phase 3: Semantic Detection"""
    objs = []
    for g in geom.polygons:
        objs.append(SemanticObject(id=f"obj_{g.id}", type="block", geometry_ref=g.id))
    for c in geom.circles:
        objs.append(SemanticObject(id=f"obj_{c.id}", type="wheel", geometry_ref=c.id))
    return SemanticResult(objects=objs)

def run_phase_4(semantics: SemanticResult) -> RelationshipResult:
    """Phase 4: Relationship Inference"""
    # Deterministic Mock: Wheel connects to Block.
    rels = []
    if len(semantics.objects) >= 2:
        rels.append(Relationship(a=semantics.objects[0].id, b=semantics.objects[1].id, type="connected"))
    return RelationshipResult(relationships=rels)

def run_phase_5(semantics: SemanticResult, rels: RelationshipResult) -> HypothesisResult:
    """Phase 5: Multi-Hypothesis System Inference"""
    has_wheel = any(o.type == "wheel" for o in semantics.objects)
    
    # Confidence varies heavily in real world; mocked here.
    if has_wheel:
        return HypothesisResult(hypotheses=[
            SystemHypothesis(system_type="pulley_system", confidence=0.65),
            SystemHypothesis(system_type="piston_engine", confidence=0.35)
        ])
    return HypothesisResult(hypotheses=[
        SystemHypothesis(system_type="lever_mechanism", confidence=0.85)
    ])

def run_phase_6(prompt: str, selected_type: str, semantics: SemanticResult) -> FusionResult:
    """Phase 6: Intent Fusion"""
    # If prompt mentions "engine", boost engine assumption, else refine based on selection
    assumptions = [f"Interpreted as {selected_type}"]
    return FusionResult(
        system_type=selected_type,
        enhanced_objects=semantics.objects,
        assumptions=assumptions,
        confidence=0.9
    )

def run_phase_7(fusion: FusionResult, rels: RelationshipResult) -> SceneGraph:
    """Phase 7: Scene Graph IR Generation"""
    nodes = []
    
    # Simple mocked mapping from semantic objects to 3D Nodes
    for obj in fusion.enhanced_objects:
        if obj.type == "block":
            nodes.append(SceneGraphNode(
                id=obj.id, type="rigid_body", shape="box", mass=0.0, # static block
                position=[0, -5, 0], dimensions=[20, 2, 5],
                properties=PhysicalProperties()
            ))
        elif obj.type == "wheel":
            nodes.append(SceneGraphNode(
                id=obj.id, type="rigid_body", shape="sphere", mass=5.0,
                position=[0, 10, 0], dimensions=[5, 5, 5], # radius 5
                properties=PhysicalProperties()
            ))

    edges = []
    for rel in rels.relationships:
        if rel.type == "connected":
            edges.append(SceneGraphEdge(
                id=str(uuid.uuid4()), type="hinge_joint",
                a=rel.a, b=rel.b, anchor=[0, 10, 0]
            ))

    return SceneGraph(nodes=nodes, edges=edges, scale=1.0)

def run_phase_7_5(graph: SceneGraph) -> ValidationResult:
    """Phase 7.5: Physics Verification Layer"""
    warnings = []
    # e.g., check for floating bodies without supports
    static_exists = any(n.mass <= 0.0 for n in graph.nodes)
    if not static_exists and len(graph.nodes) > 0:
        warnings.append("No static anchors found; system may fall infinitely.")
        valid = False
    else:
        valid = True
    
    return ValidationResult(valid=valid, warnings=warnings)

def run_phase_8(graph: SceneGraph) -> EnginePayload:
    """Phase 8: Compilation Layer (Core IR -> Tool Server Payload format)"""
    bodies = []
    for n in graph.nodes:
        is_static = n.mass <= 0.0
        b_type = n.shape.lower() # "box" or "sphere"
        
        bodies.append({
            "id": f"ai_{n.id}",
            "geometry": {
                "id": f"geo_{n.id}",
                "type": b_type,
                "position": {"x": n.position[0], "y": n.position[1], "z": n.position[2]},
                "rotation": {"x": 0, "y": 0, "z": 0},
                "dimensions": {"x": n.dimensions[0], "y": n.dimensions[1], "z": n.dimensions[2]}
            },
            "physics": {
                "mass": n.mass if not is_static else 1.0, # fallback if engine needs real mass
                "is_static": is_static,
                "restitution": n.properties.restitution,
                "friction": n.properties.friction,
                "initial_velocity": {"x":0,"y":0,"z":0},
                "initial_angular_velocity": {"x":0,"y":0,"z":0}
            }
        })
        
    constraints = []
    for e in graph.edges:
        constraints.append({
            "id": f"ai_{e.id}",
            "type": "hinge" if e.type == "hinge_joint" else e.type,
            "target_a": f"ai_{e.a}",
            "target_b": f"ai_{e.b}",
            "pivot_a": {"x": e.anchor[0], "y": e.anchor[1], "z": e.anchor[2]},
            "pivot_b": {"x": e.anchor[0], "y": e.anchor[1], "z": e.anchor[2]}
        })

    return EnginePayload(
        bodies=bodies,
        constraints=constraints,
        gravity=[0, -9.81, 0],
        timestep=1/60
    )
