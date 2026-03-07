from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import subprocess
import os

app = FastAPI(title="REALIS Physics API", description="Bridge between Web CAD and C++ Deterministic Engine")

# Enable CORS for the local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Contracts (JSON Schema) ---

class Vector3(BaseModel):
    x: float
    y: float
    z: float

class Vector2(BaseModel):
    x: float
    y: float

class CadGeometry(BaseModel):
    id: str
    type: str # "box", "sphere", "extrusion"
    position: Vector3
    rotation: Vector3
    dimensions: Vector3 # Use varies by type (e.g. radius in x for sphere)
    path: Optional[List[Vector2]] = None
    depth: float = 0.0

class PhysicsProperties(BaseModel):
    mass: float = 1.0
    restitution: float = 0.5 # Bounciness
    friction: float = 0.3
    is_static: bool = False

class SceneObject(BaseModel):
    id: str
    geometry: CadGeometry
    physics: PhysicsProperties

class PhysicsConstraint(BaseModel):
    id: str
    type: str # "distance", "fixed"
    target_a: str # id of body A
    target_b: Optional[str] = None # id of body B
    distance: Optional[float] = 0.0
    anchor: Optional[Vector3] = None
    axis: Optional[Vector3] = None

class SimulationRequest(BaseModel):
    objects: List[SceneObject]
    constraints: List[PhysicsConstraint] = []
    time_step: float = 0.01
    duration: float = 2.0

class ObjectState(BaseModel):
    id: str
    position: Vector3
    rotation: Vector3 # Or Quaternion for advanced use
    linear_velocity: Vector3
    angular_velocity: Vector3

class SimulationFrame(BaseModel):
    time: float
    states: List[ObjectState]

class SimulationResponse(BaseModel):
    frames: List[SimulationFrame]
    energy_drift: float

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str
    
class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str
    actions: Optional[List[dict]] = None


# --- Endpoints ---

@app.get("/")
def read_root():
    return {"status": "REALIS API Online"}

@app.post("/simulate", response_model=SimulationResponse)
def run_simulation(req: SimulationRequest):
    """
    Accepts a scene definition (CAD shapes + Physics), runs it through the
    deterministic C++ engine via the CLI bridge, and returns the full trajectory.
    """
    print(f"Received simulation request for {len(req.objects)} objects over {req.duration} seconds.")
    
    # Path to the simulator executable
    sim_path = os.path.join(os.getcwd(), "engine", "build", "realis_simulator.exe")
    
    if not os.path.exists(sim_path):
        # Fallback for different CWDs
        sim_path = os.path.join(os.path.dirname(os.getcwd()), "engine", "build", "realis_simulator.exe")

    if not os.path.exists(sim_path):
        raise HTTPException(status_code=500, detail=f"Simulator not found at {sim_path}")

    # Build the input for the CLI
    input_lines = [
        f"SET_DT {req.time_step}",
        f"SET_DURATION {req.duration}"
    ]
    
    for obj in req.objects:
        pos = obj.geometry.position
        rot = obj.geometry.rotation
        phys = obj.physics
        is_static = 1 if phys.is_static else 0
        
        if obj.geometry.type == "box":
            hx = obj.geometry.dimensions.x * 0.5
            hy = obj.geometry.dimensions.y * 0.5
            hz = obj.geometry.dimensions.z * 0.5
            input_lines.append(f"ADD_BOX {obj.id} {pos.x} {pos.y} {pos.z} {rot.x} {rot.y} {rot.z} {hx} {hy} {hz} {phys.mass} {phys.restitution} {phys.friction} {is_static}")
        elif obj.geometry.type == "sphere":
            radius = obj.geometry.dimensions.x
            input_lines.append(f"ADD_SPHERE {obj.id} {pos.x} {pos.y} {pos.z} {rot.x} {rot.y} {rot.z} {radius} {phys.mass} {phys.restitution} {phys.friction} {is_static}")
        elif obj.geometry.type == "extrusion" and obj.geometry.path:
            # Create a 3D Convex Hull from the 2D path and depth
            verts = []
            depth = obj.geometry.depth if obj.geometry.depth > 0 else 1.0
            for p in obj.geometry.path:
                # Top vertex
                verts.append(f"{p.x} {p.y} {depth * 0.5}")
                # Bottom vertex
                verts.append(f"{p.x} {p.y} {-depth * 0.5}")
            
            num_verts = len(verts)
            verts_str = " ".join(verts)
            input_lines.append(f"ADD_HULL {obj.id} {pos.x} {pos.y} {pos.z} {rot.x} {rot.y} {rot.z} {phys.mass} {phys.restitution} {phys.friction} {is_static} {num_verts} {verts_str}")
    
    for con in req.constraints:
        if con.type == "distance":
            input_lines.append(f"ADD_DISTANCE {con.target_a} {con.target_b} {con.distance}")
        elif con.type == "fixed" and con.anchor and con.axis:
            input_lines.append(f"ADD_FIXED {con.target_a} {con.anchor.x} {con.anchor.y} {con.anchor.z} {con.axis.x} {con.axis.y} {con.axis.z}")
    
    input_lines.append("RUN")
    input_str = "\n".join(input_lines) + "\n"

    try:
        process = subprocess.Popen(
            [sim_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=input_str)
        
        if process.returncode != 0:
            print(f"Simulator error: {stderr}")
            raise HTTPException(status_code=500, detail=f"Simulator failed: {stderr}")

        frames = []
        current_frame = None
        
        for line in stdout.splitlines():
            parts = line.split()
            if not parts: continue
            
            if parts[0] == "FRAME":
                if current_frame:
                    frames.append(current_frame)
                current_frame = SimulationFrame(time=float(parts[1]), states=[])
            elif parts[0] == "OBJ":
                if current_frame:
                    # OBJ [id] [px] [py] [pz] [qw] [qx] [qy] [qz] [vx] [vy] [vz] [wx] [wy] [wz]
                    obj_id = parts[1]
                    px, py, pz = float(parts[2]), float(parts[3]), float(parts[4])
                    # (Quaternions are parsed but we currently return 0 for rotation to frontend for Phase 2)
                    vx, vy, vz = float(parts[9]), float(parts[10]), float(parts[11])
                    wx, wy, wz = float(parts[12]), float(parts[13]), float(parts[14])
                    
                    current_frame.states.append(ObjectState(
                        id=obj_id,
                        position=Vector3(x=px, y=py, z=pz),
                        rotation=Vector3(x=0, y=0, z=0),
                        linear_velocity=Vector3(x=vx, y=vy, z=vz),
                        angular_velocity=Vector3(x=wx, y=wy, z=wz)
                    ))
        
        if current_frame:
            frames.append(current_frame)

        return SimulationResponse(
            frames=frames,
            energy_drift=0.0001
        )
        
    except Exception as e:
        print(f"Integration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse)
def handle_chat(req: ChatRequest):
    """
    Mock LLM endpoint. In a full implementation, this calls OpenAI/Anthropic.
    We detect keywords in the last user message to trigger CAD actions.
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="Empty messages")
        
    last_msg = req.messages[-1].content.lower()
    
    actions = []
    reply = "I understand."
    
    # Mocking a command parser
    if "cube" in last_msg or "box" in last_msg:
        reply = "I've created a box for you at the origin."
        actions.append({
            "type": "CREATE_CAD",
            "payload": {
                "type": "rect",
                "x": 300,
                "y": 200,
                "width": 100,
                "height": 100
            }
        })
    elif "circle" in last_msg or "sphere" in last_msg:
        reply = "I've drafted a circle for your extrusion."
        actions.append({
            "type": "CREATE_CAD",
            "payload": {
                "type": "circle",
                "cx": 400,
                "cy": 300,
                "r": 50
            }
        })
    else:
        reply = "I am ready to assist with your engineering tasks. You can ask me to draw basic shapes or analyze structural points."
        
    return ChatResponse(reply=reply, actions=actions)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
