from pydantic import BaseModel
from typing import List, Optional, Any, Dict


class IngestionRequest(BaseModel):
    session_id: str
    image: str  
    user_prompt: Optional[str] = None


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
    points: List[List[float]]  

class GeometryResult(BaseModel):
    lines: List[ExtractedLine] = []
    circles: List[ExtractedCircle] = []
    polygons: List[ExtractedPolygon] = []


class SemanticObject(BaseModel):
    id: str
    type: str  
    geometry_ref: str

class SemanticResult(BaseModel):
    objects: List[SemanticObject] = []


class Relationship(BaseModel):
    a: str
    b: str
    type: str  

class RelationshipResult(BaseModel):
    relationships: List[Relationship] = []


class Hypothesis(BaseModel):
    system_type: str
    confidence: float

class HypothesisResult(BaseModel):
    hypotheses: List[Hypothesis] = []


class IntentResult(BaseModel):
    system_type: str
    enhanced_objects: List[SemanticObject] = []
    assumptions: List[str] = []
    confidence: float


class NodeProp(BaseModel):
    friction: float = 0.3
    restitution: float = 0.2

class IRNode(BaseModel):
    id: str
    type: str  
    shape: str 
    mass: float = 1.0
    position: List[float] 
    dimensions: List[float] = [] 
    properties: NodeProp = NodeProp()

class IREdge(BaseModel):
    id: str
    type: str  
    a: str
    b: str
    anchor: List[float] 

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


class PipelineResponse(BaseModel):
    session_id: str
    confidence: float
    system_type: str
    scene: SceneGraphResult
    
    raw_geometry: GeometryResult
    relationships: RelationshipResult