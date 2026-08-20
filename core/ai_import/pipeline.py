import uuid
from typing import Dict, Any, Tuple
from .models import (
    AIImportRequest, AIImportResponse, ExtractionResult, SemanticResult,
    RelationshipResult, HypothesisResult, FusionResult, SceneGraph, EnginePayload,
    ValidationResult
)
from .phases import run_phase_2, run_phase_3, run_phase_4, run_phase_5, run_phase_6, run_phase_7, run_phase_7_5, run_phase_8

class AISketchPipeline:
    """Orchestrates the 11-phase REALIS Sketch-to-Simulation pipeline."""

    def __init__(self):
        # We can hold session state here if needed
        pass

    def process(self, request: AIImportRequest, force_hypothesis: str = None) -> AIImportResponse:
        # Phase 1: Ingestion (Handled by Pydantic Model parsing beforehand)
        print(f"[Phase 1] Ingestion complete for session: {request.session_id}")
        
        # Phase 2: Vision Geometry Extraction
        geom_result = run_phase_2(request.image)
        
        # Phase 3: Semantic Detection
        semantic_result = run_phase_3(geom_result)
        
        # Phase 4: Relationship Inference
        rel_result = run_phase_4(semantic_result)

        # Phase 5: System Hypothesis
        hypo_result = run_phase_5(semantic_result, rel_result)

        # Pause and ask user if confidence is low, unless a hypothesis was forced
        if not force_hypothesis:
            top_hypo = max(hypo_result.hypotheses, key=lambda x: x.confidence)
            # If highest confidence is below a threshold (e.g., 0.8), require user intervention
            if top_hypo.confidence < 0.8:
                return AIImportResponse(
                    session_id=request.session_id,
                    status="requires_confirmation",
                    hypotheses=hypo_result.hypotheses,
                    message="Ambiguity detected. Please select the intended system type."
                )
            selected_type = top_hypo.system_type
        else:
            selected_type = force_hypothesis

        # Phase 6: Intent Fusion
        fusion_result = run_phase_6(request.user_prompt, selected_type, semantic_result)

        # Phase 7: Scene Graph IR
        scene_graph = run_phase_7(fusion_result, rel_result)

        # Phase 7.5: Physics Validation
        val_result = run_phase_7_5(scene_graph)
        if not val_result.valid:
            return AIImportResponse(
                session_id=request.session_id,
                status="validation_failed",
                validation=val_result,
                message="Physics validation rejected the scene."
            )

        # Phase 8: Compilation
        payload = run_phase_8(scene_graph)

        # Phase 9: Simulation Injection is handled by caller (FastAPI/Frontend)
        # Phase 10: UI Rendering happens on the Frontend
        # Phase 11: Feedback Memory happens via explicit user feedback logs
        
        return AIImportResponse(
            session_id=request.session_id,
            status="success",
            payload=payload,
            validation=val_result
        )
