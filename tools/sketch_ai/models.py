from pydantic import BaseModel
from typing import List, Optional, Any, Dict

# --- Phase 1: Ingestion ---
class IngestionRequest(BaseModel):
    session_id: str
    image: str  # base64
    user_prompt: Optional[str] = None

# --- Phase 2: Geometry Extraction ---
class ExtractedLine(BaseModel):
    id: str
    x1: float
    y1: float
    x2: float
    y2: float

class ExtractedCircle(BaseModel):
    id: str
    cx: float
    cy: float
    r: float

class ExtractedPolygon(BaseModel):
    id: str
    points: List[List[float]]  # [[x, y], [x, y], ...]

class GeometryResult(BaseModel):
    lines: List[ExtractedLine] = []
    circles: List[ExtractedCircle] = []
    polygons: List[ExtractedPolygon] = []

# --- Phase 3: Semantic Detection ---
class SemanticObject(BaseModel):
    id: str
    type: str  # "rod | wheel | block | joint | unknown"
    geometry_ref: str

class SemanticResult(BaseModel):
    objects: List[SemanticObject] = []

# --- Phase 4: Relationship Inference ---
class Relationship(BaseModel):
    a: str
    b: str
    type: str  # "connected | constrained | touching | unknown"

class RelationshipResult(BaseModel):
    relationships: List[Relationship] = []

# --- Phase 5: Multi-Hypothesis ---
class Hypothesis(BaseModel):
    system_type: str
    confidence: float

class HypothesisResult(BaseModel):
    hypotheses: List[Hypothesis] = []

# --- Phase 6: Intent Fusion ---
class IntentResult(BaseModel):
    system_type: str
    enhanced_objects: List[SemanticObject] = []
    assumptions: List[str] = []
    confidence: float

# --- Phase 7 / 7.5: Scene Graph IR & Validation ---
class NodeProp(BaseModel):
    friction: float = 0.3
    restitution: float = 0.2

class IRNode(BaseModel):
    id: str
    type: str  # "rigid_body", "static"
    shape: str # "circle", "box", "polygon"
    mass: float = 1.0
    position: List[float] # [x, y]
    dimensions: List[float] = [] # e.g. [radius] or [width, height]
    properties: NodeProp = NodeProp()

class IREdge(BaseModel):
    id: str
    type: str  # "hinge_joint", "fixed_joint", "distance_joint"
    a: str
    b: str
    anchor: List[float] # [x, y]

class ValidationResult(BaseModel):
    valid: bool
    warnings: List[str] = []
    auto_fixes: List[str] = []

class SceneGraph(BaseModel):
    nodes: List[IRNode] = []
    edges: List[IREdge] = []
    constraints: List[Any] = []
    forces: List[Any] = []

class SceneGraphResult(BaseModel):
    scene_graph: SceneGraph
    validation: ValidationResult

# --- Sub-models internally mapped Phase 8 to frontend compatible ---
class PipelineResponse(BaseModel):
    session_id: str
    confidence: float
    system_type: str
    scene: SceneGraphResult
    # For UI:
    raw_geometry: GeometryResult
    relationships: RelationshipResult
