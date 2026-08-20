from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# Phase 1: Ingestion
class AIImportRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image or URL")
    user_prompt: Optional[str] = Field("", description="Optional text description")
    session_id: str = Field(..., description="UUID for the session")

# Phase 2: Geometry extraction
class GeometryPrimitive(BaseModel):
    id: str
    type: str  # line, circle, polygon
    data: Dict[str, Any]

class ExtractionResult(BaseModel):
    lines: List[GeometryPrimitive] = []
    circles: List[GeometryPrimitive] = []
    polygons: List[GeometryPrimitive] = []

# Phase 3: Semantic Objects
class SemanticObject(BaseModel):
    id: str
    type: str  # rod, wheel, block, joint, unknown
    geometry_ref: str

class SemanticResult(BaseModel):
    objects: List[SemanticObject]

# Phase 4: Relationship
class Relationship(BaseModel):
    a: str
    b: str
    type: str  # connected, constrained, touching, unknown

class RelationshipResult(BaseModel):
    relationships: List[Relationship]

# Phase 5: Multi-Hypothesis
class SystemHypothesis(BaseModel):
    system_type: str
    confidence: float

class HypothesisResult(BaseModel):
    hypotheses: List[SystemHypothesis]

# Phase 6: Intent Fusion
class FusionResult(BaseModel):
    system_type: str
    enhanced_objects: List[SemanticObject] = []
    assumptions: List[str] = []
    confidence: float

# Phase 7: Scene Graph IR
class PhysicalProperties(BaseModel):
    friction: float = 0.3
    restitution: float = 0.2

class SceneGraphNode(BaseModel):
    id: str
    type: str
    shape: str
    mass: float = 1.0
    position: List[float]
    dimensions: List[float] = [1.0, 1.0, 1.0]
    properties: PhysicalProperties = PhysicalProperties()

class SceneGraphEdge(BaseModel):
    id: str
    type: str
    a: str
    b: str
    anchor: List[float]

class SceneGraph(BaseModel):
    nodes: List[SceneGraphNode]
    edges: List[SceneGraphEdge]
    constraints: List[Any] = []
    forces: List[Any] = []
    scale: float = 1.0

# Phase 7.5: Validation
class ValidationResult(BaseModel):
    valid: bool
    warnings: List[str] = []
    auto_fixes: List[str] = []

# Phase 8: Compilation (maps roughly to SimulationRequest objects)
class EnginePayload(BaseModel):
    bodies: List[Dict[str, Any]]
    constraints: List[Dict[str, Any]]
    gravity: List[float] = [0, -9.81, 0]
    timestep: float = 1/60

# Final Response
class AIImportResponse(BaseModel):
    session_id: str
    status: str
    hypotheses: Optional[List[SystemHypothesis]] = None
    payload: Optional[EnginePayload] = None
    validation: Optional[ValidationResult] = None
    message: Optional[str] = None
