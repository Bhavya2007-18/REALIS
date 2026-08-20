from typing import List, Dict, Optional
from .models import SemanticObject, Relationship, Hypothesis

def refine_with_intent(semantic_objects: List[SemanticObject], relationships: List[Relationship], hypotheses: List[Hypothesis], user_prompt: str) -> Dict[str, any]:
    
    enhanced_objects = list(semantic_objects)
    enhanced_relationships = list(relationships)
    final_hypothesis = hypotheses[0] if hypotheses else None
    
    prompt_lower = user_prompt.lower()
    
    
    if "piston" in prompt_lower or "engine" in prompt_lower:
        final_hypothesis = Hypothesis(
            system_type="piston_engine",
            confidence=0.9,
            description="User confirmed or suggested an engine system."
        )
    elif "pulley" in prompt_lower:
        final_hypothesis = Hypothesis(
            system_type="pulley_system",
            confidence=0.9,
            description="User confirmed or suggested a pulley system."
        )

    
    
    if "floor" in prompt_lower or "ground" in prompt_lower:
        
        
        for obj in enhanced_objects:
            if obj.type == "block":
                obj.label = "ground_floor"
                break

    return {
        "enhanced_objects": enhanced_objects,
        "enhanced_relationships": enhanced_relationships,
        "final_hypothesis": final_hypothesis
    }