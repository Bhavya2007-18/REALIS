import uuid
import traceback

from fastapi import APIRouter, HTTPException, Body, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional

from .models import IngestionRequest, PipelineResponse
from .pipeline import SketchCompilerPipeline

router = APIRouter(prefix="/api/sketch", tags=["sketch-to-sim"])
_pipeline = SketchCompilerPipeline()


@router.post("/process", response_model=PipelineResponse)
async def process_sketch(req: IngestionRequest):
    
    try:
        if not req.session_id:
            req.session_id = str(uuid.uuid4())
        response = _pipeline.process(req)
        return response
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def sketch_status():
    
    import cv2
    import numpy as np
    return {
        "status": "online",
        "engine": "local-opencv",
        "opencv_version": cv2.__version__,
        "numpy_version": np.__version__,
        "history_count": len(_pipeline.history),
    }