from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal, Union

# --- Common Primitives ---

class Vector2D(BaseModel):
    x: float
    y: float

class Color(BaseModel):
    r: int
    g: int
    b: int
    a: float = 1.0

# --- Phase 2: Geometry Extraction (CV) ---

class GeomPrimitive(BaseModel):
    id: str
    type: Literal["line", "circle", "polygon", "rect"]
    points: List[Vector2D] = []
    center: Optional[Vector2D] = None
    radius: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    confidence: float = 1.0

class CVExtractionOutput(BaseModel):
    items: List[GeomPrimitive]
    image_width: int
    image_height: int

# --- Phase 3 & 4: Semantic Objects & Relationships ---

class SemanticObject(BaseModel):
    id: str
    type: Literal["rod", "wheel", "block", "joint", "motor", "spring", "unknown"]
    geometry_ref: str  # ID of the GeomPrimitive it's derived from
    confidence: float = 0.0
    label: Optional[str] = None

class Relationship(BaseModel):
    a: str  # Object ID A
    b: str  # Object ID B
    type: Literal["connected", "constrained", "touching", "anchored", "unknown"]
    offset_a: Optional[Vector2D] = None
    offset_b: Optional[Vector2D] = None
    confidence: float = 0.0

# --- Phase 5: Multi-Hypothesis ---

class Hypothesis(BaseModel):
    system_type: str # e.g., "piston_engine", "crank_mechanism"
    confidence: float
    description: str

# --- Phase 7: Scene Graph (IR) ---

class Node(BaseModel):
    id: str
    type: Literal["rigid_body", "static_body"]
    shape: Literal["circle", "rect"]
    position: Vector2D
    rotation: float = 0.0
    mass: float = 1.0
    restitution: float = 0.5
    friction: float = 0.3
    color: Optional[Color] = None

class Edge(BaseModel):
    id: str
    type: Literal["hinge_joint", "distance_joint", "fixed_joint"]
    target_a: str
    target_b: Optional[str] = None
    anchor_a: Vector2D
    anchor_b: Optional[Vector2D] = None
    length: Optional[float] = None # For distance joints

class SceneGraph(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    units_per_pixel: float = 1.0
    origin: Vector2D = Vector2D(x=0, y=0)

# --- Final Output / Feedback ---

class AIImportResponse(BaseModel):
    session_id: str
    hypotheses: List[Hypothesis]
    selected_hypothesis: Optional[Hypothesis] = None
    scene_graph: SceneGraph
    status: str
    confidence: float
