from typing import List, Dict
import uuid
from .models import GeomPrimitive, SemanticObject, Relationship, CVExtractionOutput, Hypothesis

def infer_semantics_and_relationships(cv_items: List[GeomPrimitive], user_prompt: str = "") -> Dict[str, any]:
    
    semantic_objects: List[SemanticObject] = []
    relationships: List[Relationship] = []

    
    
    
    
    
    for item in cv_items:
        obj_id = f"sem_{item.id}"
        obj_type = "unknown"
        
        if item.type == "circle":
            if item.radius < 20: 
                obj_type = "joint"
            else:
                obj_type = "wheel"
        elif item.type == "rect":
            aspect_ratio = item.width / item.height if item.height != 0 else 1
            if aspect_ratio > 3 or aspect_ratio < 0.33:
                obj_type = "rod"
            else:
                obj_type = "block"
        elif item.type == "line":
            obj_type = "rod"

        semantic_objects.append(SemanticObject(
            id=obj_id,
            type=obj_type,
            geometry_ref=item.id,
            confidence=0.8,
            label=f"{obj_type}_{obj_id[:4]}"
        ))

    
    
    for i in range(len(semantic_objects)):
        for j in range(i + 1, len(semantic_objects)):
            obj_a = semantic_objects[i]
            obj_b = semantic_objects[j]
            geom_a = next(it for it in cv_items if it.id == obj_a.geometry_ref)
            geom_b = next(it for it in cv_items if it.id == obj_b.geometry_ref)

            
            if geom_a.center and geom_b.center:
                dx = geom_a.center.x - geom_b.center.x
                dy = geom_a.center.y - geom_b.center.y
                dist = (dx*dx + dy*dy)**0.5
                
                
                if obj_a.type == "joint" or obj_b.type == "joint":
                    if dist < 50: 
                        relationships.append(Relationship(
                            a=obj_a.id,
                            b=obj_b.id,
                            type="connected",
                            confidence=0.9
                        ))

    
    
    types = [o.type for o in semantic_objects]
    if "wheel" in types and "rod" in types:
        main_hypothesis = Hypothesis(
            system_type="crank_mechanism",
            confidence=0.75,
            description="Detected multiple wheels and rods — likely a rotational mechanism."
        )
    else:
        main_hypothesis = Hypothesis(
            system_type="custom_mechanism",
            confidence=0.6,
            description="General configuration of rigid bodies and constraints."
        )

    return {
        "semantic_objects": semantic_objects,
        "relationships": relationships,
        "hypotheses": [main_hypothesis],
        "selected_hypothesis": main_hypothesis
    }