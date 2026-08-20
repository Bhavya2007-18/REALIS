import uuid
from typing import Optional
from .models import AIImportResponse, CVExtractionOutput
from .phase2_cv import extract_geometry
from .phase3_4_5_semantics import infer_semantics_and_relationships
from .phase6_intent import refine_with_intent
from .phase7_validation import generate_and_validate_scene_graph
from .phase8_compilation import compile_to_physics_request

def run_ai_import_pipeline(image_bytes: bytes, user_prompt: Optional[str] = "") -> AIImportResponse:
    
    session_id = str(uuid.uuid4())
    
    
    cv_output: CVExtractionOutput = extract_geometry(image_bytes)
    
    
    semantics_data = infer_semantics_and_relationships(cv_output.items, user_prompt)
    
    
    refined_data = refine_with_intent(
        semantics_data["semantic_objects"],
        semantics_data["relationships"],
        semantics_data["hypotheses"],
        user_prompt
    )
    
    
    scene_graph_data = generate_and_validate_scene_graph(
        cv_output,
        refined_data["enhanced_objects"],
        refined_data["enhanced_relationships"]
    )
    
    
    
    return AIImportResponse(
        session_id=session_id,
        hypotheses=semantics_data["hypotheses"],
        selected_hypothesis=refined_data["final_hypothesis"],
        scene_graph=scene_graph_data["scene_graph"],
        status="success" if scene_graph_data["validation"]["valid"] else "warning",
        confidence=refined_data["final_hypothesis"].confidence if refined_data["final_hypothesis"] else 0.5
    )