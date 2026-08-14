from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import sys




try:
    from tools.sketch_ai.api import router as sketch_router
except ImportError:
    
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from tools.sketch_ai.api import router as sketch_router

app = FastAPI(title="REALIS Physics API", description="Bridge between Web CAD and C++ Deterministic Engine")

# In-memory storage of the last simulation result, used by /api/context for the AI.
last_sim_result = None


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sketch_router)




class Vector3(BaseModel):
    x: float
    y: float
    z: float

class Vector2(BaseModel):
    x: float
    y: float

class CadGeometry(BaseModel):
    id: str
    type: str 
    position: Vector3
    rotation: Vector3
    dimensions: Vector3 
    path: Optional[List[Vector2]] = None
    depth: float = 0.0

class PhysicsProperties(BaseModel):
    mass: float = 1.0
    restitution: float = 0.5 
    friction: float = 0.3
    is_static: bool = False
    initial_velocity: Vector3 = Vector3(x=0, y=0, z=0)
    initial_angular_velocity: Vector3 = Vector3(x=0, y=0, z=0)

class SceneObject(BaseModel):
    id: str
    geometry: CadGeometry
    physics: PhysicsProperties

class PhysicsConstraint(BaseModel):
    id: str
    type: str 
    target_a: str
    target_b: Optional[str] = None
    distance: Optional[float] = 0.0
    pivot_a: Optional[Vector3] = None
    pivot_b: Optional[Vector3] = None
    axis: Optional[Vector3] = None
    angle_limit: Optional[float] = None
    
    motor_enabled: bool = False
    target_velocity: float = 0.0
    max_force: float = 0.0

class SimulationRequest(BaseModel):
    objects: List[SceneObject]
    constraints: List[PhysicsConstraint] = []
    time_step: float = 0.01
    duration: float = 2.0
    gravity: Vector3 = Vector3(x=0, y=-9.81, z=0)
    point_gravity: Optional[dict] = None
    sub_steps: int = 1

class ObjectState(BaseModel):
    id: str
    position: Vector3
    rotation: Vector3 
    linear_velocity: Vector3
    angular_velocity: Vector3

class ContactPoint(BaseModel):
    id_a: str
    id_b: str
    point: Dict[str, float]

class SimulationFrame(BaseModel):
    time: float
    states: List[ObjectState]
    contacts: List[ContactPoint] = []

class SimulationResponse(BaseModel):
    frames: List[SimulationFrame]
    energy_drift: float

class ChatMessage(BaseModel):
    role: str 
    content: str
    
class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    scene: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    tool_calls: Optional[List[dict]] = None




@app.get("/")
def read_root():
    return {"status": "REALIS API Online"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "engine": "Python physics engine (v0.2)",
        "cpp_engine_available": False,
        "physics_enabled": True,
        "sketch_pipeline": "local-opencv"
    }


@app.post("/simulate", response_model=SimulationResponse)
def run_simulation(req: SimulationRequest):
    from tools.physics import simulate as py_simulate

    print(f">>> Simulation request: {len(req.objects)} objects, {req.duration}s, gravity={req.gravity}")
    print("[REALIS] Using Python physics engine (v0.2)")

    def to_dict_objects(req):
        out = []
        for obj in req.objects:
            out.append({
                "id": obj.id,
                "geometry": {
                    "type": obj.geometry.type,
                    "position": {
                        "x": obj.geometry.position.x,
                        "y": obj.geometry.position.y,
                        "z": obj.geometry.position.z,
                    },
                    "dimensions": {
                        "x": obj.geometry.dimensions.x,
                        "y": obj.geometry.dimensions.y,
                        "z": obj.geometry.dimensions.z,
                    },
                },
                "physics": {
                    "mass": obj.physics.mass,
                    "restitution": obj.physics.restitution,
                    "friction": obj.physics.friction,
                    "is_static": obj.physics.is_static,
                    "initial_velocity": {
                        "x": obj.physics.initial_velocity.x,
                        "y": obj.physics.initial_velocity.y,
                        "z": obj.physics.initial_velocity.z,
                    },
                    "initial_angular_velocity": {
                        "x": obj.physics.initial_angular_velocity.x,
                        "y": obj.physics.initial_angular_velocity.y,
                        "z": obj.physics.initial_angular_velocity.z,
                    },
                },
            })
        return out

    def to_dict_constraints(req):
        out = []
        for con in req.constraints:
            out.append({
                "id": con.id,
                "type": con.type,
                "target_a": con.target_a,
                "target_b": con.target_b,
                "distance": con.distance,
                "pivot_a": con.pivot_a.model_dump() if con.pivot_a else None,
                "pivot_b": con.pivot_b.model_dump() if con.pivot_b else None,
                "axis": con.axis.model_dump() if con.axis else None,
            })
        return out

    try:
        result = py_simulate(
            to_dict_objects(req),
            to_dict_constraints(req),
            time_step=req.time_step,
            duration=req.duration,
            gravity=(req.gravity.x, req.gravity.y, req.gravity.z),
            point_gravity=req.point_gravity,
            sub_steps=req.sub_steps,
        )
        frames = []
        for f in result["frames"]:
            states = []
            for st in f["states"]:
                states.append(ObjectState(
                    id=st["id"],
                    position=Vector3(x=st["position"]["x"], y=st["position"]["y"], z=st["position"]["z"]),
                    rotation=Vector3(x=st["rotation"]["x"], y=st["rotation"]["y"], z=st["rotation"]["z"]),
                    linear_velocity=Vector3(x=st["linear_velocity"]["x"], y=st["linear_velocity"]["y"], z=st["linear_velocity"]["z"]),
                    angular_velocity=Vector3(x=st["angular_velocity"]["x"], y=st["angular_velocity"]["y"], z=st["angular_velocity"]["z"]),
                ))
            contacts = [
                ContactPoint(id_a=c["id_a"], id_b=c["id_b"], point=c["point"])
                for c in f["contacts"]
            ]
            frames.append(SimulationFrame(time=f["time"], states=states, contacts=contacts))

        # Store last result for the AI context endpoint (Phase 4).
        global last_sim_result
        last_sim_result = {
            "duration": req.duration,
            "n_frames": len(frames),
            "objects": [{ "id": o.id } for o in req.objects],
            "constraints": [{ "id": c.id, "type": c.type, "target_a": c.target_a, "target_b": c.target_b } for c in req.constraints],
            "gravity": {"x": req.gravity.x, "y": req.gravity.y, "z": req.gravity.z},
            "energy": result.get("energy", {}),
            "energy_drift": float(result.get("energy_drift", 0.0)),
            "contacts_count": result.get("contacts_count", 0),
            "final_states": frames[-1].states if frames else [],
        }

        return SimulationResponse(frames=frames, energy_drift=result.get("energy_drift", 0.0))
    except Exception as e:
        print(f">>> Physics engine error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Physics simulation failed: {str(e)}")



@app.post("/api/chat", response_model=ChatResponse)
def handle_chat(req: ChatRequest):
    
    if not req.messages:
        raise HTTPException(status_code=400, detail="Empty messages")

    last_msg = req.messages[-1].content.lower()
    tool_calls = []
    reply = ""

    
    if any(k in last_msg for k in ["make it static", "make static", "make it a floor", "ground", "fix it in place", "don't move", "make it solid"]):
        reply = "Done! I've marked the selected object as static - it will act as an immovable surface (floor, wall, etc.) during simulation."
        tool_calls.append({"tool": "set_physics", "args": {"field": "isStatic", "value": True}})

    
    elif any(k in last_msg for k in ["make it dynamic", "make dynamic", "unfix", "let it move"]):
        reply = "The selected object is now dynamic - it will respond to gravity and collisions."
        tool_calls.append({"tool": "set_physics", "args": {"field": "isStatic", "value": False}})

    
    elif "mass" in last_msg and any(c.isdigit() for c in last_msg):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        if nums:
            mass_val = float(nums[0])
            reply = f"I've set the mass of the selected object to **{mass_val} kg**."
            tool_calls.append({"tool": "set_physics", "args": {"field": "mass", "value": mass_val}})
        else:
            reply = "Could you specify the mass value? For example: 'set mass to 5'."

    
    elif "friction" in last_msg and any(c.isdigit() for c in last_msg):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        if nums:
            val = min(1.0, float(nums[0]))
            reply = f"Friction set to **{val}** on the selected object (range 0-1)."
            tool_calls.append({"tool": "set_physics", "args": {"field": "friction", "value": val}})
        else:
            reply = "Please specify a friction value between 0 and 1."

    
    elif any(k in last_msg for k in ["restitution", "bounciness", "bounce", "elastic"]) and any(c.isdigit() for c in last_msg):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        if nums:
            val = min(1.0, float(nums[0]))
            reply = f"Bounciness (restitution) set to **{val}** on the selected object."
            tool_calls.append({"tool": "set_physics", "args": {"field": "restitution", "value": val}})
        else:
            reply = "Specify a bounciness value between 0 (no bounce) and 1 (fully elastic)."

    
    elif any(k in last_msg for k in ["pin it", "anchor", "pin to world", "pin to ground", "fixed joint", "fix to world"]):
        reply = "I've added a **Fixed Anchor** constraint - the selected object is pinned to the world. It'll stay in place but can still be affected by joints with other objects."
        tool_calls.append({"tool": "add_joint", "args": {"type": "fixed"}})

    
    elif any(k in last_msg for k in ["link", "distance joint", "rod", "connect objects", "joint between"]):
        reply = "I'll create a **Distance Joint** between the two selected objects. Select your objects and define the target distance in the Properties panel's Joints section."
        tool_calls.append({"tool": "add_joint", "args": {"type": "distance"}})

    
    elif any(k in last_msg for k in ["cube", "box", "rectangle", "rect"]):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        w = float(nums[0]) if len(nums) > 0 else 100
        h = float(nums[1]) if len(nums) > 1 else w
        reply = f"I've created a **{int(w)}x{int(h)} rectangle** for you. Select it and set physics properties in the panel."
        tool_calls.append({"tool": "create_object", "args": {"type": "rect", "x": 300, "y": 200, "width": w, "height": h}})

    
    elif any(k in last_msg for k in ["circle", "sphere", "disc", "ball", "cylinder"]):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        r = float(nums[0]) if nums else 50
        reply = f"I've drafted a **circle with radius {int(r)}** for extrusion into a cylinder."
        tool_calls.append({"tool": "create_object", "args": {"type": "circle", "cx": 400, "cy": 300, "r": r}})

    
    elif any(k in last_msg for k in ["simulate", "run simulation", "play", "start simulation"]):
        reply = "Click the **Play button** at the bottom of the viewport to run the physics simulation. All your objects and joints are already configured!"
        tool_calls.append({"tool": "run_simulation", "args": {"action": "start"}})

    
    else:
        reply = (
            "I can help you configure your scene. Try commands like:\n"
            "- **'make it static'** - fix an object in place\n"
            "- **'set mass to 5'** - set object mass in kg\n"
            "- **'set friction to 0.8'** - configure surface friction\n"
            "- **'set bounciness to 0.3'** - adjust restitution\n"
            "- **'pin it to world'** - add a fixed anchor joint\n"
            "- **'draw a 100x50 box'** - create a rectangle\n"
            "- **'draw a circle of radius 40'** - create a circle"
        )

    return ChatResponse(reply=reply, tool_calls=tool_calls if tool_calls else None)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)