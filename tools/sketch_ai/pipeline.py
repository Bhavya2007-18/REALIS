

import base64
import math
import traceback
import uuid

import cv2
import numpy as np

from .models import (
    ExtractedCircle,
    ExtractedLine,
    ExtractedPolygon,
    GeometryResult,
    Hypothesis,
    IREdge,
    IRNode,
    IngestionRequest,
    IntentResult,
    NodeProp,
    PipelineResponse,
    Relationship,
    RelationshipResult,
    SceneGraph,
    SceneGraphResult,
    SemanticObject,
    SemanticResult,
    ValidationResult,
)


CANVAS_W = 800
CANVAS_H = 600
MIN_CONTOUR_AREA = 80           
CIRCULARITY_THRESHOLD = 0.65    
LINE_ASPECT_RATIO = 3.5         
HOUGH_DELTA_THETA = np.pi / 180 
PROXIMITY_RADIUS = 90           


class SketchCompilerPipeline:
    def __init__(self):
        self.history = []

    
    
    
    def process(self, req: IngestionRequest) -> PipelineResponse:
        print(f"\n{'='*60}")
        print(f"[Phase 1] Ingesting session={req.session_id}")
        print(f"  Prompt : '{req.user_prompt}'")
        print(f"  Image  : {'YES (' + str(len(req.image)) + ' chars)' if req.image else 'NO'}")
        print(f"{'='*60}")

        prompt_lower = (req.user_prompt or "").lower()

        
        geometry = self._phase2_extract_geometry(req.image, prompt_lower)
        print(f"[Phase 2] Geometry → lines={len(geometry.lines)}, circles={len(geometry.circles)}, polygons={len(geometry.polygons)}")

        
        semantics = self._phase3_detect_objects(geometry, prompt_lower)
        print(f"[Phase 3] Objects  → {len(semantics.objects)} semantic objects detected")

        
        relationships = self._phase4_infer_relationships(semantics, geometry)
        print(f"[Phase 4] Relations→ {len(relationships.relationships)} relationships inferred")

        
        hypotheses = self._phase5_generate_hypotheses(semantics, relationships, prompt_lower)
        print(f"[Phase 5] Hypotheses:")
        for h in hypotheses:
            print(f"  {h.system_type:30s} {h.confidence:.2f}")

        
        intent = self._phase6_fuse_intent(req.user_prompt, hypotheses, semantics)
        print(f"[Phase 6] Intent   → {intent.system_type} (confidence={intent.confidence:.2f})")

        
        scene_graph = self._phase7_generate_scene_graph(intent, semantics, relationships, geometry)
        print(f"[Phase 7] SceneGraph → {len(scene_graph.nodes)} nodes, {len(scene_graph.edges)} edges")

        
        validation = self._phase75_validate_physics(scene_graph)
        print(f"[Phase 7.5] Valid={validation.valid}  Warnings={len(validation.warnings)}")
        for w in validation.warnings:
            print(f"  ⚠ {w}")

        
        response = PipelineResponse(
            session_id=req.session_id,
            confidence=intent.confidence,
            system_type=intent.system_type,
            raw_geometry=geometry,
            relationships=relationships,
            scene=SceneGraphResult(scene_graph=scene_graph, validation=validation),
        )
        self.history.append(response)
        return response

    
    
    
    def _phase2_extract_geometry(self, b64_image: str, prompt: str) -> GeometryResult:
        
        res = GeometryResult()
        _id = [0]  

        def nid():
            _id[0] += 1
            return f"cv_{_id[0]}"

        
        img_gray = self._decode_image_to_gray(b64_image)
        if img_gray is None:
            print("[Phase 2] No valid image — using prompt-based geometric mock.")
            return self._geometry_mock(prompt, nid)

        
        img_gray = cv2.resize(img_gray, (CANVAS_W, CANVAS_H), interpolation=cv2.INTER_AREA)

        
        mean_val = float(img_gray.mean())
        if mean_val > 128:
            img_gray = cv2.bitwise_not(img_gray)

        
        blurred = cv2.GaussianBlur(img_gray, (5, 5), 0)
        
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        edges = cv2.Canny(thresh, 40, 120)
        
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=1)

        
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < MIN_CONTOUR_AREA:
                continue

            perimeter = cv2.arcLength(cnt, True)
            if perimeter == 0:
                continue

            approx = cv2.approxPolyDP(cnt, 0.03 * perimeter, True)

            
            rect = cv2.minAreaRect(cnt)
            (rx, ry), (rw, rh), angle = rect
            if rw < 1 or rh < 1:
                continue
            aspect = max(rw, rh) / min(rw, rh)

            
            circularity = (4 * math.pi * area) / (perimeter * perimeter)

            
            if aspect >= LINE_ASPECT_RATIO or len(approx) <= 2:
                pts = cv2.boxPoints(rect).tolist()
                
                best = (0, (pts[0], pts[1]))
                for i in range(len(pts)):
                    for j in range(i + 1, len(pts)):
                        d = math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1])
                        if d > best[0]:
                            best = (d, (pts[i], pts[j]))
                p1, p2 = best[1]
                res.lines.append(
                    ExtractedLine(
                        id=nid(), x1=round(p1[0], 1), y1=round(p1[1], 1),
                        x2=round(p2[0], 1), y2=round(p2[1], 1),
                    )
                )

            
            elif circularity >= CIRCULARITY_THRESHOLD:
                (cx, cy), radius = cv2.minEnclosingCircle(cnt)
                res.circles.append(
                    ExtractedCircle(id=nid(), cx=round(cx, 1), cy=round(cy, 1), r=round(radius, 1))
                )

            
            else:
                pts_list = [[round(float(p[0][0]), 1), round(float(p[0][1]), 1)] for p in approx]
                if len(pts_list) >= 3:
                    res.polygons.append(ExtractedPolygon(id=nid(), points=pts_list))

        
        lines_hough = cv2.HoughLinesP(
            edges, 1, HOUGH_DELTA_THETA,
            threshold=60, minLineLength=CANVAS_W // 10, maxLineGap=20,
        )
        if lines_hough is not None:
            for line in lines_hough:
                x1, y1, x2, y2 = map(float, line[0])
                length = math.hypot(x2 - x1, y2 - y1)
                if length < 40:
                    continue
                
                duplicate = any(
                    math.hypot(l.x1 - x1, l.y1 - y1) < 20 and math.hypot(l.x2 - x2, l.y2 - y2) < 20
                    for l in res.lines
                )
                if not duplicate:
                    res.lines.append(ExtractedLine(id=nid(), x1=x1, y1=y1, x2=x2, y2=y2))

        print(f"  [2e/f] Contours processed, total lines={len(res.lines)}, circles={len(res.circles)}, polys={len(res.polygons)}")
        return res

    
    
    
    def _phase3_detect_objects(self, geo: GeometryResult, prompt: str) -> SemanticResult:
        
        objs = []

        prompt_has_wheel   = any(k in prompt for k in ["wheel", "car", "vehicle", "axle", "rolling"])
        prompt_has_pendulum = any(k in prompt for k in ["pendulum", "bob", "swing", "dangle", "hang"])
        prompt_has_bridge  = any(k in prompt for k in ["bridge", "truss", "beam", "support"])
        prompt_has_spring  = any(k in prompt for k in ["spring", "mass", "oscillat"])

        
        for l in geo.lines:
            dy = abs(l.y2 - l.y1)
            dx = abs(l.x2 - l.x1)
            is_horizontal = dx > dy * 2.5
            length = math.hypot(dx, dy)

            if is_horizontal and length > CANVAS_W * 0.25:
                shape_type = "rod_static"  
            elif is_horizontal:
                shape_type = "lever"       
            else:
                shape_type = "rod"         

            objs.append(SemanticObject(id=f"obj_{l.id}", type=shape_type, geometry_ref=l.id))

        
        all_radii = [c.r for c in geo.circles]
        median_r = sorted(all_radii)[len(all_radii) // 2] if all_radii else 30

        for c in geo.circles:
            if prompt_has_wheel:
                ctype = "wheel"
            elif prompt_has_pendulum:
                ctype = "bob"
            elif c.r >= median_r * 1.2:
                ctype = "wheel"      
            elif c.r < median_r * 0.8:
                ctype = "bob"        
            else:
                ctype = "wheel" if c.r > 35 else "bob"

            objs.append(SemanticObject(id=f"obj_{c.id}", type=ctype, geometry_ref=c.id))

        
        for p in geo.polygons:
            xs = [pt[0] for pt in p.points]
            ys = [pt[1] for pt in p.points]
            w = max(xs) - min(xs) if xs else 0
            h = max(ys) - min(ys) if ys else 0
            aspect = w / h if h > 0 else 1

            if prompt_has_bridge and len(p.points) == 3:
                ptype = "truss_element"
            elif aspect > 3:
                ptype = "plank"    
            else:
                ptype = "block"

            objs.append(SemanticObject(id=f"obj_{p.id}", type=ptype, geometry_ref=p.id))

        return SemanticResult(objects=objs)

    
    
    
    def _phase4_infer_relationships(self, sem: SemanticResult, geo: GeometryResult) -> RelationshipResult:
        
        rels = []
        seen = set()  

        circles_geo   = {c.id: c for c in geo.circles}
        lines_geo     = {l.id: l for l in geo.lines}
        polygons_geo  = {p.id: p for p in geo.polygons}

        def make_key(a, b):
            return (min(a, b), max(a, b))

        def poly_bb(p):
            xs = [pt[0] for pt in p.points]
            ys = [pt[1] for pt in p.points]
            return min(xs), min(ys), max(xs), max(ys)

        def pt_to_segment_dist(px, py, x1, y1, x2, y2):
            
            dx, dy = x2 - x1, y2 - y1
            if dx == dy == 0:
                return math.hypot(px - x1, py - y1)
            t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
            return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))

        for o1 in sem.objects:
            for o2 in sem.objects:
                if o1.id == o2.id:
                    continue
                key = make_key(o1.id, o2.id)
                if key in seen:
                    continue

                rel_type = None

                
                if o1.type in ("bob", "wheel") and o2.type in ("rod", "rod_static", "lever"):
                    c = circles_geo.get(o1.geometry_ref)
                    l = lines_geo.get(o2.geometry_ref)
                    if c and l:
                        d_end1 = math.hypot(c.cx - l.x1, c.cy - l.y1)
                        d_end2 = math.hypot(c.cx - l.x2, c.cy - l.y2)
                        d_seg  = pt_to_segment_dist(c.cx, c.cy, l.x1, l.y1, l.x2, l.y2)
                        if min(d_end1, d_end2) <= PROXIMITY_RADIUS or d_seg <= c.r + 10:
                            rel_type = "connected"

                
                elif o2.type in ("bob", "wheel") and o1.type in ("rod", "rod_static", "lever"):
                    c = circles_geo.get(o2.geometry_ref)
                    l = lines_geo.get(o1.geometry_ref)
                    if c and l:
                        d_end1 = math.hypot(c.cx - l.x1, c.cy - l.y1)
                        d_end2 = math.hypot(c.cx - l.x2, c.cy - l.y2)
                        d_seg  = pt_to_segment_dist(c.cx, c.cy, l.x1, l.y1, l.x2, l.y2)
                        if min(d_end1, d_end2) <= PROXIMITY_RADIUS or d_seg <= c.r + 10:
                            rel_type = "connected"

                
                elif o1.type in ("bob", "wheel") and o2.type in ("block", "plank", "truss_element"):
                    c = circles_geo.get(o1.geometry_ref)
                    p = polygons_geo.get(o2.geometry_ref)
                    if c and p:
                        bx0, by0, bx1, by1 = poly_bb(p)
                        bcx = (bx0 + bx1) / 2
                        bcy = (by0 + by1) / 2
                        dist = math.hypot(c.cx - bcx, c.cy - bcy)
                        
                        if dist <= (bx1 - bx0) / 2 + c.r or dist <= (by1 - by0) / 2 + c.r:
                            rel_type = "touching"

                
                elif o1.type in ("block", "plank") and o2.type in ("block", "plank"):
                    p1 = polygons_geo.get(o1.geometry_ref)
                    p2 = polygons_geo.get(o2.geometry_ref)
                    if p1 and p2:
                        ax0, ay0, ax1, ay1 = poly_bb(p1)
                        bx0, by0, bx1, by1 = poly_bb(p2)
                        overlap_x = ax0 < bx1 + 20 and ax1 + 20 > bx0
                        overlap_y = ay0 < by1 + 20 and ay1 + 20 > by0
                        if overlap_x and overlap_y:
                            rel_type = "constrained"

                if rel_type:
                    rels.append(Relationship(a=o1.id, b=o2.id, type=rel_type))
                    seen.add(key)

        return RelationshipResult(relationships=rels)

    
    
    
    def _phase5_generate_hypotheses(
        self, sem: SemanticResult, rels: RelationshipResult, prompt: str
    ) -> list[Hypothesis]:
        
        types = [o.type for o in sem.objects]
        rel_types = [r.type for r in rels.relationships]
        n_objs = len(sem.objects)
        n_connected = rel_types.count("connected")
        n_touching  = rel_types.count("touching")

        has_wheel    = "wheel"       in types
        has_bob      = "bob"         in types
        has_block    = "block"       in types or "plank" in types
        has_rod      = "rod"         in types
        has_static   = "rod_static"  in types
        has_lever    = "lever"       in types
        has_truss    = "truss_element" in types

        scores = {}

        
        p = 0.0
        if has_bob and has_static: p += 0.5
        if has_bob and has_rod:    p += 0.3
        if n_connected >= 1:       p += 0.15
        if any(k in prompt for k in ["pendulum", "swing", "bob"]): p += 0.4
        scores["pendulum_system"] = min(p, 1.0)

        
        p = 0.0
        if has_wheel and has_rod:  p += 0.35
        if has_static:             p += 0.2
        if n_connected >= 2:       p += 0.2
        if any(k in prompt for k in ["pulley", "rope", "cord", "lift"]): p += 0.4
        scores["pulley_system"] = min(p, 1.0)

        
        p = 0.0
        if has_lever or has_static: p += 0.3
        if has_block:               p += 0.2
        if has_rod:                 p += 0.15
        if n_objs >= 3:             p += 0.1
        if any(k in prompt for k in ["lever", "fulcrum", "seesaw", "balance"]): p += 0.4
        scores["lever_mechanism"] = min(p, 1.0)

        
        p = 0.0
        n_wheels = types.count("wheel")
        if n_wheels >= 2:          p += 0.6
        if has_block:              p += 0.2
        if n_touching >= 2:        p += 0.1
        if any(k in prompt for k in ["car", "vehicle", "chassis", "wheel"]): p += 0.4
        scores["car_mechanism"] = min(p, 1.0)

        
        p = 0.0
        if has_bob and n_connected >= 1: p += 0.3
        if has_static:               p += 0.2
        if any(k in prompt for k in ["spring", "mass", "oscillat", "vibrat"]): p += 0.5
        scores["spring_mass_system"] = min(p, 1.0)

        
        p = 0.0
        if has_truss:              p += 0.5
        if has_static and has_block: p += 0.2
        if n_objs >= 4:            p += 0.15
        if any(k in prompt for k in ["bridge", "truss", "arch", "beam"]): p += 0.4
        scores["bridge_structure"] = min(p, 1.0)

        
        p = 0.0
        if has_wheel and has_rod:  p += 0.4
        if n_connected >= 2:       p += 0.2
        if any(k in prompt for k in ["piston", "engine", "crank", "cylinder"]): p += 0.5
        scores["piston_engine"] = min(p, 1.0)

        
        p = max(0.2, 0.3 - scores.get("lever_mechanism", 0) * 0.3)
        scores["custom_mechanism"] = p

        
        max_score = max(scores.values())
        if max_score > 0.97:
            factor = 0.97 / max_score
            scores = {k: v * factor for k, v in scores.items()}

        hyps = [
            Hypothesis(system_type=k, confidence=round(v, 3))
            for k, v in sorted(scores.items(), key=lambda x: -x[1])
            if v > 0.0
        ]
        return hyps

    
    
    
    def _phase6_fuse_intent(
        self, prompt: str, hypotheses: list[Hypothesis], sem: SemanticResult
    ) -> IntentResult:
        if not hypotheses:
            return IntentResult(
                system_type="custom_mechanism",
                confidence=0.3,
                enhanced_objects=sem.objects,
                assumptions=["No recognisable system type detected."],
            )

        top = hypotheses[0]
        second = hypotheses[1] if len(hypotheses) > 1 else None
        assumptions = ["OpenCV spatial analysis used — 100% local, zero APIs."]

        if prompt:
            assumptions.append(f"User context: '{prompt.strip()}' incorporated.")

        
        if second and (top.confidence - second.confidence) < 0.1:
            assumptions.append(
                f"Low disambiguation ({top.system_type} vs {second.system_type}). "
                "Preview mode recommended."
            )
            
        return IntentResult(
            system_type=top.system_type,
            confidence=top.confidence,
            enhanced_objects=sem.objects,
            assumptions=assumptions,
        )

    
    
    
    def _phase7_generate_scene_graph(
        self,
        intent: IntentResult,
        sem: SemanticResult,
        rels: RelationshipResult,
        geo: GeometryResult,
    ) -> SceneGraph:
        
        SCALE = 0.1  

        nodes: list[IRNode] = []
        edges: list[IREdge] = []

        circles_geo  = {c.id: c for c in geo.circles}
        lines_geo    = {l.id: l for l in geo.lines}
        polys_geo    = {p.id: p for p in geo.polygons}
        node_map: dict[str, str] = {}  

        
        for obj in sem.objects:
            n_id = f"ir_{obj.id}"
            node_map[obj.id] = n_id

            if obj.type in ("rod", "rod_static", "lever"):
                l = lines_geo.get(obj.geometry_ref)
                if not l:
                    continue
                cx = ((l.x1 + l.x2) / 2) * SCALE
                cy = ((l.y1 + l.y2) / 2) * SCALE
                length = math.hypot(l.x2 - l.x1, l.y2 - l.y1) * SCALE
                rot_angle = math.degrees(math.atan2(l.y2 - l.y1, l.x2 - l.x1))
                mass = 2.0 if obj.type == "lever" else (1.0 if obj.type == "rod" else 0.0)
                nodes.append(
                    IRNode(
                        id=n_id,
                        type="static" if obj.type == "rod_static" else "rigid_body",
                        shape="box",
                        mass=mass,
                        position=[round(cx, 2), round(cy, 2)],
                        dimensions=[round(max(length, 1.0), 2), 0.5],
                        properties=NodeProp(friction=0.4, restitution=0.1),
                    )
                )

            elif obj.type in ("wheel", "bob"):
                c = circles_geo.get(obj.geometry_ref)
                if not c:
                    continue
                cx = c.cx * SCALE
                cy = c.cy * SCALE
                r  = max(c.r * SCALE, 0.3)
                mass = 5.0 if obj.type == "wheel" else 2.0
                nodes.append(
                    IRNode(
                        id=n_id,
                        type="rigid_body",
                        shape="circle",
                        mass=mass,
                        position=[round(cx, 2), round(cy, 2)],
                        dimensions=[round(r, 2)],
                        properties=NodeProp(friction=0.5, restitution=0.3),
                    )
                )

            elif obj.type in ("block", "plank", "truss_element"):
                p = polys_geo.get(obj.geometry_ref)
                if not p:
                    continue
                xs = [pt[0] * SCALE for pt in p.points]
                ys = [pt[1] * SCALE for pt in p.points]
                w = max(xs) - min(xs)
                h = max(ys) - min(ys)
                mass = 10.0 if obj.type == "block" else (3.0 if obj.type == "plank" else 1.5)
                nodes.append(
                    IRNode(
                        id=n_id,
                        type="rigid_body",
                        shape="box",
                        mass=mass,
                        position=[round((min(xs) + max(xs)) / 2, 2), round((min(ys) + max(ys)) / 2, 2)],
                        dimensions=[round(max(w, 0.5), 2), round(max(h, 0.5), 2)],
                        properties=NodeProp(friction=0.3, restitution=0.2),
                    )
                )

        
        eid = 1
        for rel in rels.relationships:
            na = node_map.get(rel.a)
            nb = node_map.get(rel.b)
            if not na or not nb:
                continue

            edge_type = {
                "connected":  "hinge_joint",
                "touching":   "distance_joint",
                "constrained":"fixed_joint",
            }.get(rel.type, "distance_joint")

            
            node_a = next((n for n in nodes if n.id == na), None)
            node_b = next((n for n in nodes if n.id == nb), None)
            if node_a and node_b:
                anchor = [
                    round((node_a.position[0] + node_b.position[0]) / 2, 2),
                    round((node_a.position[1] + node_b.position[1]) / 2, 2),
                ]
            else:
                anchor = [0.0, 0.0]

            edges.append(IREdge(id=f"edge_{eid}", type=edge_type, a=na, b=nb, anchor=anchor))
            eid += 1

        return SceneGraph(nodes=nodes, edges=edges)

    
    
    
    def _phase75_validate_physics(self, sg: SceneGraph) -> ValidationResult:
        warnings: list[str] = []
        auto_fixes: list[str] = []
        valid = True

        if not sg.nodes:
            valid = False
            warnings.append("Scene graph has no nodes — sketch may be blank or too faint.")
            return ValidationResult(valid=valid, warnings=warnings, auto_fixes=auto_fixes)

        linked = set()
        for e in sg.edges:
            linked.add(e.a)
            linked.add(e.b)

        for node in sg.nodes:
            if node.type == "rigid_body" and node.id not in linked:
                warnings.append(f"'{node.id}' ({node.shape}) is unconnected — will free-fall.")

        
        for node in sg.nodes:
            if node.type == "rigid_body" and node.mass <= 0:
                warnings.append(f"'{node.id}' has invalid mass=0. Auto-fixed to 1.0.")
                node.mass = 1.0
                auto_fixes.append(f"Set mass=1.0 for {node.id}")

        
        statics = [n for n in sg.nodes if n.type == "static"]
        if len(statics) == 0 and len(sg.nodes) > 1:
            warnings.append("No static anchors detected — the entire system will fall.")

        return ValidationResult(valid=valid, warnings=warnings, auto_fixes=auto_fixes)

    
    
    
    def _decode_image_to_gray(self, b64_image: str):
        
        if not b64_image:
            return None
        try:
            if "," in b64_image:
                b64_image = b64_image.split(",")[1]
            img_bytes = base64.b64decode(b64_image)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)
            return img
        except Exception as e:
            print(f"[Phase 2] Image decode error: {e}")
            return None

    def _geometry_mock(self, prompt: str, nid) -> GeometryResult:
        
        res = GeometryResult()
        if "pendulum" in prompt:
            res.lines.append(ExtractedLine(id=nid(), x1=300, y1=80,  x2=500, y2=80))
            res.lines.append(ExtractedLine(id=nid(), x1=400, y1=80,  x2=400, y2=300))
            res.circles.append(ExtractedCircle(id=nid(), cx=400, cy=300, r=40))
        elif any(k in prompt for k in ["car", "wheel", "vehicle"]):
            res.polygons.append(ExtractedPolygon(id=nid(), points=[[180, 200], [420, 200], [420, 300], [180, 300]]))
            res.circles.append(ExtractedCircle(id=nid(), cx=240, cy=340, r=52))
            res.circles.append(ExtractedCircle(id=nid(), cx=360, cy=340, r=52))
        elif any(k in prompt for k in ["spring", "mass"]):
            res.lines.append(ExtractedLine(id=nid(), x1=200, y1=100, x2=600, y2=100))
            res.circles.append(ExtractedCircle(id=nid(), cx=400, cy=100, r=20))
            res.circles.append(ExtractedCircle(id=nid(), cx=400, cy=280, r=40))
        elif any(k in prompt for k in ["bridge", "truss"]):
            res.lines.append(ExtractedLine(id=nid(), x1=100, y1=400, x2=700, y2=400))
            res.polygons.append(ExtractedPolygon(id=nid(), points=[[250,400],[400,200],[550,400]]))
            res.circles.append(ExtractedCircle(id=nid(), cx=100, cy=420, r=25))
            res.circles.append(ExtractedCircle(id=nid(), cx=700, cy=420, r=25))
        else:
            
            res.lines.append(ExtractedLine(id=nid(), x1=150, y1=350, x2=650, y2=350))
            res.circles.append(ExtractedCircle(id=nid(), cx=400, cy=350, r=30))
            res.polygons.append(ExtractedPolygon(id=nid(), points=[[380,350],[420,350],[400,440]]))
        return res