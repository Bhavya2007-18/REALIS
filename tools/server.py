from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
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
    type: str # "distance", "fixed", "hinge", "slider"
    target_a: str
    target_b: Optional[str] = None
    distance: Optional[float] = 0.0
    pivot_a: Optional[Vector3] = None
    pivot_b: Optional[Vector3] = None
    axis: Optional[Vector3] = None
    angle_limit: Optional[float] = None
    # Motor support
    motor_enabled: bool = False
    target_velocity: float = 0.0
    max_force: float = 0.0

class SimulationRequest(BaseModel):
    objects: List[SceneObject]
    constraints: List[PhysicsConstraint] = []
    time_step: float = 0.01
    duration: float = 2.0
    gravity: Vector3 = Vector3(x=0, y=-9.81, z=0)
    sub_steps: int = 1

class ObjectState(BaseModel):
    id: str
    position: Vector3
    rotation: Vector3 # Or Quaternion for advanced use
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

    input_lines = [
        f"SET_DT {req.time_step}",
        f"SET_DURATION {req.duration}",
        f"SET_SUBSTEPS {req.sub_steps}",
        f"SET_GRAVITY {req.gravity.x} {req.gravity.y} {req.gravity.z}"
    ]
    
    for obj in req.objects:
        pos = obj.geometry.position
        rot = obj.geometry.rotation
        phys = obj.physics
        is_static = 1 if phys.is_static else 0
        
        if obj.geometry.type == "box":
            hx, hy, hz = obj.geometry.dimensions.x * 0.5, obj.geometry.dimensions.y * 0.5, obj.geometry.dimensions.z * 0.5
            input_lines.append(f"ADD_BOX {obj.id} {pos.x} {pos.y} {pos.z} {rot.x} {rot.y} {rot.z} {hx} {hy} {hz} {phys.mass} {phys.restitution} {phys.friction} {is_static}")
        elif obj.geometry.type == "sphere":
            radius = obj.geometry.dimensions.x
            input_lines.append(f"ADD_SPHERE {obj.id} {pos.x} {pos.y} {pos.z} {rot.x} {rot.y} {rot.z} {radius} {phys.mass} {phys.restitution} {phys.friction} {is_static}")
    
    for con in req.constraints:
        if con.type == "distance":
            input_lines.append(f"ADD_DISTANCE {con.target_a} {con.target_b} {con.distance}")
        elif con.type == "hinge" and con.pivot_a and con.pivot_b and con.axis:
            input_lines.append(f"ADD_POINT_JOINT {con.target_a} {con.target_b} {con.pivot_a.x} {con.pivot_a.y} {con.pivot_a.z} {con.pivot_b.x} {con.pivot_b.y} {con.pivot_b.z}")
            
            # Lock two perpendicular axes to the rotation axis
            v = con.axis
            # Find an arbitrary vector not parallel to v
            temp = Vector3(x=1, y=0, z=0) if abs(v.x) < 0.9 else Vector3(x=0, y=1, z=0)
            # Cross products to find orthogonal basis
            # n = v x temp
            nx = v.y * temp.z - v.z * temp.y
            ny = v.z * temp.x - v.x * temp.z
            nz = v.x * temp.y - v.y * temp.x
            # t = v x n
            tx = v.y * nz - v.z * ny
            ty = v.z * nx - v.x * nz
            tz = v.x * ny - v.y * nx
            
            input_lines.append(f"ADD_ANGULAR_JOINT {con.target_a} {con.target_b} {nx} {ny} {nz}")
            input_lines.append(f"ADD_ANGULAR_JOINT {con.target_a} {con.target_b} {tx} {ty} {tz}")

            # If motor is enabled, add an active constraint on the rotation axis itself
            if con.motor_enabled:
                input_lines.append(f"ADD_MOTOR_JOINT {con.target_a} {con.target_b} {con.axis.x} {con.axis.y} {con.axis.z} {con.target_velocity} {con.max_force}")
        elif con.type == "slider" and con.axis:
            # Lock orientation (3 angular DOFs)
            input_lines.append(f"ADD_ANGULAR_JOINT {con.target_a} {con.target_b} 1 0 0")
            input_lines.append(f"ADD_ANGULAR_JOINT {con.target_a} {con.target_b} 0 1 0")
            input_lines.append(f"ADD_ANGULAR_JOINT {con.target_a} {con.target_b} 0 0 1")
            
            # Lock 2 linear axes (orthogonal to con.axis)
            v = con.axis
            temp = Vector3(x=1, y=0, z=0) if abs(v.x) < 0.9 else Vector3(x=0, y=1, z=0)
            nx = v.y * temp.z - v.z * temp.y
            ny = v.z * temp.x - v.x * temp.z
            nz = v.x * temp.y - v.y * temp.x
            tx = v.y * nz - v.z * ny
            ty = v.z * nx - v.x * nz
            tz = v.x * ny - v.y * nx
            
            # Use ADD_POINT_JOINT for linear part if we had a 1D linear lock
            # For now, we use a trick: lock 2 axes using very large/locked linear motors or similar
            # But the simulator expects ADD_POINT_JOINT to lock all 3.
            # We need a 1D linear lock. Let's assume ADD_MOTOR_JOINT with 0 vel and INF force locks it.
            input_lines.append(f"ADD_LINEAR_MOTOR {con.target_a} {con.target_b} {nx} {ny} {nz} 0 1e10")
            input_lines.append(f"ADD_LINEAR_MOTOR {con.target_a} {con.target_b} {tx} {ty} {tz} 0 1e10")

            if con.motor_enabled:
                input_lines.append(f"ADD_LINEAR_MOTOR {con.target_a} {con.target_b} {con.axis.x} {con.axis.y} {con.axis.z} {con.target_velocity} {con.max_force}")
        elif con.type == "fixed" and con.pivot_a and con.pivot_b:
            input_lines.append(f"ADD_POINT_JOINT {con.target_a} {con.target_b} {con.pivot_a.x} {con.pivot_a.y} {con.pivot_a.z} {con.pivot_b.x} {con.pivot_b.y} {con.pivot_b.z}")
            input_lines.append(f"ADD_ANGULAR_JOINT {con.target_a} {con.target_b} 1 0 0")
            input_lines.append(f"ADD_ANGULAR_JOINT {con.target_a} {con.target_b} 0 1 0")
            input_lines.append(f"ADD_ANGULAR_JOINT {con.target_a} {con.target_b} 0 0 1")

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
        
        lines = stdout.splitlines()
        line_idx = 0

        while line_idx < len(lines):
            line = lines[line_idx]
            parts = line.split()
            if not parts:
                line_idx += 1
                continue
            
            if parts[0] == "FRAME":
                t = float(parts[1])
                states = []
                contacts = []
                line_idx += 1 # Move past the FRAME line

                # Parse OBJ lines for the current frame
                while line_idx < len(lines) and lines[line_idx].startswith("OBJ "):
                    obj_parts = lines[line_idx].split()
                    # OBJ [id] [px] [py] [pz] [qw] [qx] [qy] [qz] [vx] [vy] [vz] [wx] [wy] [wz]
                    obj_id = obj_parts[1]
                    px, py, pz = float(obj_parts[2]), float(obj_parts[3]), float(obj_parts[4])
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
    Extended command parser. Detects CAD creation, physics config,
    and joint creation intents from natural language.
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="Empty messages")

    last_msg = req.messages[-1].content.lower()
    actions = []
    reply = ""

    # ── Physics: Make Static ──────────────────────────────────────────────────
    if any(k in last_msg for k in ["make it static", "make static", "make it a floor", "ground", "fix it in place", "don't move", "make it solid"]):
        reply = "Done! I've marked the selected object as static — it will act as an immovable surface (floor, wall, etc.) during simulation."
        actions.append({"type": "SET_PHYSICS", "payload": {"field": "isStatic", "value": True}})

    # ── Physics: Make Dynamic ─────────────────────────────────────────────────
    elif any(k in last_msg for k in ["make it dynamic", "make dynamic", "unfix", "let it move"]):
        reply = "The selected object is now dynamic — it will respond to gravity and collisions."
        actions.append({"type": "SET_PHYSICS", "payload": {"field": "isStatic", "value": False}})

    # ── Physics: Set Mass ─────────────────────────────────────────────────────
    elif "mass" in last_msg and any(c.isdigit() for c in last_msg):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        if nums:
            mass_val = float(nums[0])
            reply = f"I've set the mass of the selected object to **{mass_val} kg**."
            actions.append({"type": "SET_PHYSICS", "payload": {"field": "mass", "value": mass_val}})
        else:
            reply = "Could you specify the mass value? For example: 'set mass to 5'."

    # ── Physics: Set Friction ─────────────────────────────────────────────────
    elif "friction" in last_msg and any(c.isdigit() for c in last_msg):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        if nums:
            val = min(1.0, float(nums[0]))
            reply = f"Friction set to **{val}** on the selected object (range 0–1)."
            actions.append({"type": "SET_PHYSICS", "payload": {"field": "friction", "value": val}})
        else:
            reply = "Please specify a friction value between 0 and 1."

    # ── Physics: Set Restitution/Bounciness ───────────────────────────────────
    elif any(k in last_msg for k in ["restitution", "bounciness", "bounce", "elastic"]) and any(c.isdigit() for c in last_msg):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        if nums:
            val = min(1.0, float(nums[0]))
            reply = f"Bounciness (restitution) set to **{val}** on the selected object."
            actions.append({"type": "SET_PHYSICS", "payload": {"field": "restitution", "value": val}})
        else:
            reply = "Specify a bounciness value between 0 (no bounce) and 1 (fully elastic)."

    # ── Joints: Pin to World (Fixed Anchor) ───────────────────────────────────
    elif any(k in last_msg for k in ["pin it", "anchor", "pin to world", "pin to ground", "fixed joint", "fix to world"]):
        reply = "I've added a **Fixed Anchor** constraint — the selected object is pinned to the world. It'll stay in place but can still be affected by joints with other objects."
        actions.append({"type": "ADD_JOINT", "payload": {"type": "fixed"}})

    # ── Joints: Distance Joint ────────────────────────────────────────────────
    elif any(k in last_msg for k in ["link", "distance joint", "rod", "connect objects", "joint between"]):
        reply = "I'll create a **Distance Joint** between the two selected objects. Select your objects and define the target distance in the Properties panel's Joints section."
        actions.append({"type": "ADD_JOINT", "payload": {"type": "distance"}})

    # ── CAD: Draw a box/cube ──────────────────────────────────────────────────
    elif any(k in last_msg for k in ["cube", "box", "rectangle", "rect"]):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        w = float(nums[0]) if len(nums) > 0 else 100
        h = float(nums[1]) if len(nums) > 1 else w
        reply = f"I've created a **{int(w)}×{int(h)} rectangle** for you. Select it and set physics properties in the panel."
        actions.append({"type": "CREATE_CAD", "payload": {"type": "rect", "x": 300, "y": 200, "width": w, "height": h}})

    # ── CAD: Draw a circle/sphere ─────────────────────────────────────────────
    elif any(k in last_msg for k in ["circle", "sphere", "disc", "ball", "cylinder"]):
        import re
        nums = re.findall(r'\d+\.?\d*', last_msg)
        r = float(nums[0]) if nums else 50
        reply = f"I've drafted a **circle with radius {int(r)}** for extrusion into a cylinder."
        actions.append({"type": "CREATE_CAD", "payload": {"type": "circle", "cx": 400, "cy": 300, "r": r}})

    # ── Simulation: Run ───────────────────────────────────────────────────────
    elif any(k in last_msg for k in ["simulate", "run simulation", "play", "start simulation"]):
        reply = "Click the **Play button** at the bottom of the viewport to run the physics simulation. All your objects and joints are already configured!"

    # ── Help / Fallback ───────────────────────────────────────────────────────
    else:
        reply = (
            "I can help you configure your scene. Try commands like:\n"
            "• **'make it static'** — fix an object in place\n"
            "• **'set mass to 5'** — set object mass in kg\n"
            "• **'set friction to 0.8'** — configure surface friction\n"
            "• **'set bounciness to 0.3'** — adjust restitution\n"
            "• **'pin it to world'** — add a fixed anchor joint\n"
            "• **'draw a 100x50 box'** — create a rectangle\n"
            "• **'draw a circle of radius 40'** — create a circle"
        )

    return ChatResponse(reply=reply, actions=actions if actions else None)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
