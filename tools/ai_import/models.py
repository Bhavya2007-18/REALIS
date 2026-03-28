from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal, Union



class Vector2D(BaseModel):
    x: float
    y: float

class Color(BaseModel):
    r: int
    g: int
    b: int
    a: float = 1.0



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



class SemanticObject(BaseModel):
    id: str
    type: Literal["rod", "wheel", "block", "joint", "motor", "spring", "unknown"]
    geometry_ref: str  
    confidence: float = 0.0
    label: Optional[str] = None

class Relationship(BaseModel):
    a: str  
    b: str  
    type: Literal["connected", "constrained", "touching", "anchored", "unknown"]
    offset_a: Optional[Vector2D] = None
    offset_b: Optional[Vector2D] = None
    confidence: float = 0.0



class Hypothesis(BaseModel):
    system_type: str 
    confidence: float
    description: str



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
    length: Optional[float] = None 

class SceneGraph(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    units_per_pixel: float = 1.0
    origin: Vector2D = Vector2D(x=0, y=0)



class AIImportResponse(BaseModel):
    session_id: str
    hypotheses: List[Hypothesis]
    selected_hypothesis: Optional[Hypothesis] = None
    scene_graph: SceneGraph
    status: str
    confidence: float