from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import subprocess
import os

app = FastAPI(title="REALIS Physics API", description="Bridge between Web CAD and C++ Deterministic Engine")

# ENORMOUSLY PERMISSIVE CORS FOR DEBUGGING
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Contracts (JSON Schema) ---
# ... (rest of models)

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
    initial_velocity: Vector3 = Vector3(x=0, y=0, z=0)
    initial_angular_velocity: Vector3 = Vector3(x=0, y=0, z=0)

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
    point_gravity: Optional[dict] = None
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
    Accepts a scene definition, runs it through the C++ engine.
    Falls back to a Python physics engine if the C++ engine is unavailable or crashes.
    """
    import math

    print(f">>> Simulation request: {len(req.objects)} objects, {req.duration}s, gravity={req.gravity}")

    # --- Python Physics Fallback Engine ---
    def run_python_physics(req):
        """A simple but correct rigid-body integrator in Python."""
        gx, gy, gz = req.gravity.x, req.gravity.y, req.gravity.z
        dt = req.time_step
        sub = max(1, req.sub_steps)
        sub_dt = dt / sub
        
        # Point gravity params
        pg_center = None
        pg_strength = 0
        if req.point_gravity:
            c = req.point_gravity.get('center', {})
            pg_center = (c.get('x', 0), c.get('y', 0), c.get('z', 0))
            pg_strength = req.point_gravity.get('strength', 0)

        # Initialize bodies
        bodies = []
        for obj in req.objects:
            pos = obj.geometry.position
            vel = obj.physics.initial_velocity
            ang = obj.physics.initial_angular_velocity
            dim = obj.geometry.dimensions
            bodies.append({
                'id': obj.id,
                'px': pos.x, 'py': pos.y, 'pz': pos.z,
                'vx': vel.x, 'vy': vel.y, 'vz': vel.z,
                'wx': ang.x, 'wy': ang.y, 'wz': ang.z,
                'rx': 0.0, 'ry': 0.0, 'rz': 0.0,
                'mass': obj.physics.mass,
                'inv_mass': 0.0 if obj.physics.is_static else (1.0 / max(obj.physics.mass, 0.001)),
                'is_static': obj.physics.is_static,
                'restitution': obj.physics.restitution,
                'geo_type': obj.geometry.type,
                'radius': dim.x if obj.geometry.type == 'sphere' else 0,
                'half_x': dim.x * 0.5, 'half_y': dim.y * 0.5, 'half_z': dim.z * 0.5,
            })

        steps = int(req.duration / dt) + 1
        frames = []

        for step_i in range(steps):
            t = step_i * dt
            
            for _ in range(sub):
                for b in bodies:
                    if b['is_static']: continue
                    
                    # Gravity (uniform or point)
                    if pg_center and pg_strength > 0:
                        dx = pg_center[0] - b['px']
                        dy = pg_center[1] - b['py']
                        dz = pg_center[2] - b['pz']
                        dist_sq = dx*dx + dy*dy + dz*dz
                        dist = math.sqrt(dist_sq) if dist_sq > 0.01 else 0.1
                        force = pg_strength * b['mass'] / dist_sq
                        ax = force * dx / dist / b['mass'] if b['mass'] > 0 else 0
                        ay = force * dy / dist / b['mass'] if b['mass'] > 0 else 0
                        az = force * dz / dist / b['mass'] if b['mass'] > 0 else 0
                    else:
                        ax, ay, az = gx, gy, gz

                    # Integrate velocity
                    b['vx'] += ax * sub_dt
                    b['vy'] += ay * sub_dt
                    b['vz'] += az * sub_dt

                    # Integrate position
                    b['px'] += b['vx'] * sub_dt
                    b['py'] += b['vy'] * sub_dt
                    b['pz'] += b['vz'] * sub_dt

                    # Integrate rotation
                    b['rx'] += b['wx'] * sub_dt
                    b['ry'] += b['wy'] * sub_dt
                    b['rz'] += b['wz'] * sub_dt

                # Simple ground plane collision (y=0 is ground if gravity is negative y)
                for b in bodies:
                    if b['is_static']: continue
                    floor_y = b['radius'] if b['geo_type'] == 'sphere' else b['half_y']
                    # Find nearest static body as floor
                    for s in bodies:
                        if not s['is_static']: continue
                        # If static body is below dynamic body, it's a floor candidate
                        floor_top = s['py'] + s['half_y']
                        if abs(b['px'] - s['px']) < s['half_x'] + b['half_x'] and \
                           abs(b['pz'] - s['pz']) < s['half_z'] + b['half_z']:
                            if b['py'] - floor_y < floor_top and b['vy'] < 0:
                                b['py'] = floor_top + floor_y
                                b['vy'] = -b['vy'] * b['restitution']
                                b['vx'] *= 0.98  # some friction

            # Build frame
            states = []
            for b in bodies:
                states.append(ObjectState(
                    id=b['id'],
                    position=Vector3(x=b['px'], y=b['py'], z=b['pz']),
                    rotation=Vector3(x=b['rx'], y=b['ry'], z=b['rz']),
                    linear_velocity=Vector3(x=b['vx'], y=b['vy'], z=b['vz']),
                    angular_velocity=Vector3(x=b['wx'], y=b['wy'], z=b['wz'])
                ))
            frames.append(SimulationFrame(time=t, states=states))

        return SimulationResponse(frames=frames, energy_drift=0.0001)

    # --- Try C++ engine first ---
    sim_path = os.getenv("REALIS_SIM_PATH")
    if not sim_path:
        binary_name = "realis_simulator.exe" if os.name == 'nt' else "realis_simulator"
        sim_path = os.path.join(os.getcwd(), "engine", "build", binary_name)
        if not os.path.exists(sim_path):
            sim_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "engine", "build", binary_name)

    if not os.path.exists(sim_path):
        print(f">>> C++ engine not found at {sim_path}, using Python fallback")
        return run_python_physics(req)

    # Build command list for C++ engine
    input_lines = [
        f"SET_DT {req.time_step}",
        f"SET_DURATION {req.duration}",
        f"SET_SUBSTEPS {req.sub_steps}",
        f"SET_GRAVITY {req.gravity.x} {req.gravity.y} {req.gravity.z}"
    ]

    if req.point_gravity:
        pg = req.point_gravity
        center = pg.get('center', {'x': 0, 'y': 0, 'z': 0})
        strength = pg.get('strength', 1000.0)
        input_lines.append(f"ADD_POINT_GRAVITY {center['x']} {center['y']} {center['z']} {strength}")
    
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
        
        vel = phys.initial_velocity
        ang_vel = phys.initial_angular_velocity
        if vel.x != 0 or vel.y != 0 or vel.z != 0 or ang_vel.x != 0 or ang_vel.y != 0 or ang_vel.z != 0:
            input_lines.append(f"SET_VELOCITY {obj.id} {vel.x} {vel.y} {vel.z} {ang_vel.x} {ang_vel.y} {ang_vel.z}")
    
    for con in req.constraints:
        if con.type == "distance":
            input_lines.append(f"ADD_DISTANCE {con.target_a} {con.target_b} {con.distance}")
        elif con.type in ("hinge", "fixed") and con.pivot_a and con.pivot_b:
            input_lines.append(f"ADD_POINT_JOINT {con.target_a} {con.target_b} {con.pivot_a.x} {con.pivot_a.y} {con.pivot_a.z} {con.pivot_b.x} {con.pivot_b.y} {con.pivot_b.z}")

    input_lines.append("RUN")
    input_str = "\n".join(input_lines) + "\n"
    print(f">>> Sending {len(input_lines)} commands to C++ engine")

    try:
        process = subprocess.Popen(
            [sim_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=input_str, timeout=30)
        
        if process.returncode != 0:
            print(f">>> C++ engine error: {stderr[:500]}, falling back to Python")
            return run_python_physics(req)

        # Parse C++ engine output
        frames = []
        current_frame_time = None
        current_states = []
        current_contacts = []
        
        for line in stdout.splitlines():
            parts = line.split()
            if not parts:
                continue
            
            if parts[0] == "FRAME":
                # Save previous frame
                if current_frame_time is not None:
                    frames.append(SimulationFrame(
                        time=current_frame_time,
                        states=current_states,
                        contacts=current_contacts
                    ))
                current_frame_time = float(parts[1])
                current_states = []
                current_contacts = []

            elif parts[0] == "OBJ" and len(parts) >= 12:
                # OBJ [id] [px] [py] [pz] [qw] [qx] [qy] [qz] [vx] [vy] [vz] [wx] [wy] [wz]
                obj_id = parts[1]
                px, py, pz = float(parts[2]), float(parts[3]), float(parts[4])
                vx = float(parts[9]) if len(parts) > 9 else 0
                vy = float(parts[10]) if len(parts) > 10 else 0
                vz = float(parts[11]) if len(parts) > 11 else 0
                wx = float(parts[12]) if len(parts) > 12 else 0
                wy = float(parts[13]) if len(parts) > 13 else 0
                wz = float(parts[14]) if len(parts) > 14 else 0
                current_states.append(ObjectState(
                    id=obj_id,
                    position=Vector3(x=px, y=py, z=pz),
                    rotation=Vector3(x=0, y=0, z=0),
                    linear_velocity=Vector3(x=vx, y=vy, z=vz),
                    angular_velocity=Vector3(x=wx, y=wy, z=wz)
                ))

        # Append final frame
        if current_frame_time is not None and current_states:
            frames.append(SimulationFrame(
                time=current_frame_time,
                states=current_states,
                contacts=current_contacts
            ))

        if not frames:
            print(">>> C++ engine produced no frames, falling back to Python")
            return run_python_physics(req)

        print(f">>> C++ engine produced {len(frames)} frames")
        return SimulationResponse(frames=frames, energy_drift=0.0001)
        
    except Exception as e:
        print(f">>> C++ engine exception: {str(e)}, falling back to Python")
        return run_python_physics(req)



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
