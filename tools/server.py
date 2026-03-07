from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="REALIS Physics API", description="Bridge between Web CAD and C++ Deterministic Engine")

# Enable CORS for the local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Contracts (JSON Schema) ---

class Vector3(BaseModel):
    x: float
    y: float
    z: float

class CadGeometry(BaseModel):
    id: str
    type: str # "box", "sphere", "extrusion"
    position: Vector3
    rotation: Vector3
    dimensions: Vector3 # Use varies by type (e.g. radius in x for sphere)

class PhysicsProperties(BaseModel):
    mass: float = 1.0
    restitution: float = 0.5 # Bounciness
    friction: float = 0.3
    is_static: bool = False

class SceneObject(BaseModel):
    id: str
    geometry: CadGeometry
    physics: PhysicsProperties

class SimulationRequest(BaseModel):
    objects: List[SceneObject]
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
    deterministic C++ engine via PyBind11, and returns the full trajectory.
    """
    print(f"Received simulation request for {len(req.objects)} objects over {req.duration} seconds.")
    
    # TODO: Bridge to the actual C++ py_realis module here.
    # We will mock the output for Phase 1 to ensure UI connectivity
    
    mock_frames = []
    
    # Mock gravity falling
    steps = int(req.duration / req.time_step)
    for i in range(steps):
        t = i * req.time_step
        frame_states = []
        for obj in req.objects:
            if not obj.physics.is_static:
                # y = y0 - 0.5 * g * t^2
                new_y = obj.geometry.position.y - (0.5 * 9.81 * (t ** 2))
                
                # Check floor collision (mock floor at y=0)
                if new_y < 0:
                    new_y = 0.0 # simple stop

                frame_states.append(ObjectState(
                    id=obj.id,
                    position=Vector3(x=obj.geometry.position.x, y=new_y, z=obj.geometry.position.z),
                    rotation=Vector3(x=0, y=0, z=0),
                    linear_velocity=Vector3(x=0, y=-(9.81 * t) if new_y > 0 else 0, z=0),
                    angular_velocity=Vector3(x=0, y=0, z=0)
                ))
            else:
                 frame_states.append(ObjectState(
                    id=obj.id,
                    position=obj.geometry.position,
                    rotation=obj.geometry.rotation,
                    linear_velocity=Vector3(x=0, y=0, z=0),
                    angular_velocity=Vector3(x=0, y=0, z=0)
                ))
                
        mock_frames.append(SimulationFrame(time=t, states=frame_states))
        
    return SimulationResponse(
        frames=mock_frames,
        energy_drift=0.0001
    )

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
