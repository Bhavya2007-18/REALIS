import cv2
import numpy as np
from typing import List
import uuid
from .models import GeomPrimitive, Vector2D, CVExtractionOutput

def extract_geometry(image_bytes: bytes) -> CVExtractionOutput:
    
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    original_height, original_width = image.shape[:2]

    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    primitives: List[GeomPrimitive] = []

    for cnt in contours:
        
        if cv2.contourArea(cnt) < 100:
            continue

        epsilon = 0.02 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        
        
        area = cv2.contourArea(cnt)
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0: continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)

        if circularity > 0.8:
            (x, y), radius = cv2.minEnclosingCircle(cnt)
            primitives.append(GeomPrimitive(
                id=str(uuid.uuid4()),
                type="circle",
                center=Vector2D(x=float(x), y=float(y)),
                radius=float(radius),
                confidence=float(circularity)
            ))
        elif len(approx) == 2:
            
            points = [Vector2D(x=float(p[0][0]), y=float(p[0][1])) for p in approx]
            primitives.append(GeomPrimitive(
                id=str(uuid.uuid4()),
                type="line",
                points=points,
                confidence=0.9
            ))
        elif len(approx) == 4:
            
            x, y, w, h = cv2.boundingRect(approx)
            primitives.append(GeomPrimitive(
                id=str(uuid.uuid4()),
                type="rect",
                center=Vector2D(x=float(x + w/2), y=float(y + h/2)),
                width=float(w),
                height=float(h),
                points=[Vector2D(x=float(p[0][0]), y=float(p[0][1])) for p in approx],
                confidence=0.95
            ))
        else:
            
            primitives.append(GeomPrimitive(
                id=str(uuid.uuid4()),
                type="polygon",
                points=[Vector2D(x=float(p[0][0]), y=float(p[0][1])) for p in approx],
                confidence=0.7
            ))

    return CVExtractionOutput(
        items=primitives,
        image_width=original_width,
        image_height=original_height
    )